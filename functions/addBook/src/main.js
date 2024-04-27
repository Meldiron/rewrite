import {
  Client,
  Databases,
  Functions,
  Permission,
  Role,
  Storage,
  Users,
} from 'node-appwrite';
import fs from 'fs/promises';
import * as axios from 'axios';
import { parseEpub } from '@gxl/epub-parser';
import { latinize } from './latinize.js';

async function getJobFromUuid(log, uuid, index = 0) {
  try {
    const convertRequest = new FormData();
    convertRequest.append('uuid', uuid);
    const convertResponse = await axios.default.post(
      'https://api.epub.to/v1/results/',
      convertRequest,
      {
        headers: {
          Authorization: process.env.EPUB_TO_API_KEY,
        },
      }
    );

    if (convertResponse.status !== 200) {
      throw new Error('Failed to get job status.');
    }

    if (
      !convertResponse ||
      !convertResponse.data ||
      !convertResponse.data.files ||
      convertResponse.data.files.length <= 0
    ) {
      throw new Error('No files found yet.');
    }

    const fileUrls = convertResponse.data.files.map((f) => f.download_url);

    return fileUrls;
  } catch (e) {
    log(e);

    if (index > 200) {
      // 10 minutes
      throw new Error('Failed to get job status.');
    }

    await new Promise((resolve) => setTimeout(resolve, 3000));
    return await getJobFromUuid(log, uuid, index + 1);
  }
}

export default async ({ req, res, log, error }) => {
  const jobId = Date.now().toString(16);

  log('Starting ' + jobId);

  const client = new Client()
    .setEndpoint('https://cloud.appwrite.io/v1')
    .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

  const storage = new Storage(client);
  const databases = new Databases(client);
  const functions = new Functions(client);
  const users = new Users(client);

  const userId = req.headers['x-appwrite-user-id'] ?? null;
  const fileId = req.bodyRaw ?? null;

  let userExists = false;
  try {
    if (userId) {
      await users.get(userId);
      userExists = true;
    }
  } catch (err) {}

  const scopedPermissions = userExists
    ? [Permission.read(Role.user(userId))]
    : [Permission.read(Role.users())];

  if (!fileId) {
    log('File ID not found');
    return res.send('Please provide book file ID.', 400);
  }

  if (userExists) {
    log('Spending tokens');

    try {
      const tokens = await databases.getDocument('main', 'tokens', userId);
      if (tokens.balance === 0) {
        log('Not enough tokens');
        return res.send("You don't have any tokens.", 400);
      }

      await databases.updateDocument('main', 'tokens', userId, {
        balance: tokens.balance - 1,
      });
    } catch (err) {
      log('Could not spend tokens');
      return res.send('Could not spend tokens.', 400);
    }
  }

  log('Dowloading source file: ' + fileId);

  const arrayBuffer = await storage.getFileDownload('books', fileId);

  log('Saving source file');

  const buffer = Buffer.from(new Uint8Array(arrayBuffer));
  await fs.writeFile(`./job_${jobId}.epub`, buffer);

  let existedBefore = false;
  let existingDoc = null;
  try {
    existingDoc = await databases.getDocument('main', 'books', fileId);
    existedBefore = true;

    log('Found existing book');
  } catch (err) {}

  if (!existedBefore) {
    log('Extracting metadata');

    const epubObj = await parseEpub(`./job_${jobId}.epub`, {
      type: 'path',
    });

    log(epubObj.info);

    let { title, author, publisher } = epubObj.info;

    title = title ? title : 'Unknown title';
    author = author ? author : 'Unknown author';
    publisher = publisher ? publisher : 'Unknown publisher';

    log('Storing data about book');

    let search = `${title.toLowerCase()} ${author.toLowerCase()} ${publisher.toLowerCase()}`;
    search += ' ' + latinize('search');

    existingDoc = await databases.createDocument(
      'main',
      'books',
      fileId,
      {
        isPublic: userExists === true ? false : true,
        title,
        author,
        publisher,
        ready: false,
        pages: 0,
        search,
      },
      scopedPermissions
    );
  }

  log('Converting source file');

  let jobIdUuid = '';
  if (existedBefore && existingDoc.epubToJobId) {
    jobIdUuid = existingDoc.epubToJobId;

    log('Old Job ID: ' + jobIdUuid);
  } else {
    const convertRequest = new FormData();
    convertRequest.append('convert_to', 'epub-png');
    convertRequest.append(
      'files',
      new Blob([await fs.readFile(`./job_${jobId}.epub`)]),
      `job_${jobId}.epub`
    );
    const convertResponse = await axios.default.post(
      'https://api.epub.to/v1/convert/',
      convertRequest,
      {
        headers: {
          Authorization: process.env.EPUB_TO_API_KEY,
          'Content-Type': 'multipart/form-data',
        },
      }
    );

    if (convertResponse.status !== 200) {
      log(convertResponse.data);
      throw new Error('Failed to convert file.');
    }

    jobIdUuid = convertResponse.data.uuid;

    await databases.updateDocument('main', 'books', fileId, {
      epubToJobId: jobIdUuid,
    });

    log('New Job ID: ' + jobIdUuid);
  }

  let fileUrls = await getJobFromUuid(log, jobIdUuid);
  fileUrls = fileUrls.map((url) => {
    let helperStr = url.split('job_')[1].split('.png')[0];
    const pageNumber = helperStr.includes('_')
      ? +helperStr.split('_')[1] + 1
      : 1;

    return {
      url,
      pageNumber,
    };
  });
  fileUrls = fileUrls.sort((a, b) => a.pageNumber - b.pageNumber);
  fileUrls = fileUrls.map((f) => f.url);

  let page = 1;

  for (const fileUrl of fileUrls) {
    log(`Working on ${page}/${fileUrls.length}`);

    let hasDocument = false;
    let hasDocumentContent = false;
    try {
      const pageDetails = await databases.getDocument(
        'main',
        'pages',
        `${fileId}-${page}`
      );
      hasDocument = true;
      if (pageDetails.ready === true) {
        hasDocumentContent = true;
      }
    } catch (err) {}

    if (!hasDocument) {
      log(`Creating page doc ${page}/${fileUrls.length}`);

      await databases.createDocument(
        'main',
        'pages',
        `${fileId}-${page}`,
        {
          ready: false,
          jobFileUrl: fileUrl,
          bookId: fileId,
          page: page,
          text: 'Processing...',
          words: 1,
        },
        scopedPermissions
      );
    }

    if (!hasDocumentContent) {
      log('Adding job as it is not ready yet');
      await functions.createExecution(
        'processPage',
        JSON.stringify({
          pageId: `${fileId}-${page}`,
          scopedPermissions,
        }),
        true
      );
    }

    page++;
  }

  log('Finished');

  await databases.updateDocument('main', 'books', fileId, {
    ready: true,
    pages: page - 1,
  });

  return res.send('OK');
};
