import {
  Client,
  Databases,
  ID,
  InputFile,
  Permission,
  Role,
  Storage,
} from 'node-appwrite';
import { ImageAnnotatorClient } from '@google-cloud/vision';
import fs from 'fs/promises';
import * as axios from 'axios';
import { parseEpub } from '@gxl/epub-parser';

async function getJobFromUuid(log, uuid, index = 0) {
  try {
    const convertRequest = new FormData();
    convertRequest.append('uuid', uuid);
    const convertResponse = await axios.default.post('https://api.epub.to/v1/results/', convertRequest, {
      headers: {
        'Authorization': process.env.EPUB_TO_API_KEY
      },
    });

    if (convertResponse.status !== 200) {
      throw new Error('Failed to get job status.');
    }

    if (!convertResponse || !convertResponse.data || !convertResponse.data.files || convertResponse.data.files.length <= 0) {
      throw new Error('No files found yet.');
    }

    const fileUrls = convertResponse.data.files.map((f) => f.download_url);

    return fileUrls;
  } catch (e) {
    log(e);

    if (index > 200) { // 10 minutes
      throw new Error('Failed to get job status.');
    }

    await new Promise((resolve) => setTimeout(resolve, 3000));
    return await getJobFromUuid(log, uuid, index + 1);
  }
}

export default async ({ req, res, log, error }) => {
  const jobId = Date.now().toString(16);

  log('Starting ' + jobId);

  const googleClient = new ImageAnnotatorClient();

  const client = new Client()
    .setEndpoint('https://cloud.appwrite.io/v1')
    .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

  const storage = new Storage(client);
  const databases = new Databases(client);

  const userId = req.headers['x-appwrite-user-id'] ?? null;
  const fileId = req.bodyRaw ?? null;

  if (!userId) {
    return res.send('Only users can add books.', 400);
  }

  if (!fileId) {
    return res.send('Please provide book file ID.', 400);
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
  } catch (err) { }

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

    existingDoc = await databases.createDocument(
      'main',
      'books',
      fileId,
      {
        title,
        author,
        publisher,
        ready: false,
        pages: 0
      },
      [Permission.read(Role.user(userId))]
    );
  }

  log('Converting source file');

  let jobIdUuid = "";
  if (existedBefore && existingDoc.epubToJobId) {
    jobIdUuid = existingDoc.epubToJobId;

    log('Old Job ID: ' + jobIdUuid);
  } else {
    const convertRequest = new FormData();
    convertRequest.append('convert_to', 'epub-png');
    convertRequest.append('files', new Blob([(await fs.readFile(`./job_${jobId}.epub`))]), `job_${jobId}.epub`);
    const convertResponse = await axios.default.post('https://api.epub.to/v1/convert/', convertRequest, {
      headers: {
        'Authorization': process.env.EPUB_TO_API_KEY,
        'Content-Type': 'multipart/form-data'

      },
    });

    if (convertResponse.status !== 200) {
      log(convertResponse.data);
      throw new Error('Failed to convert file.');
    }

    jobIdUuid = convertResponse.data.uuid;

    await databases.updateDocument('main', 'books', fileId, {
      epubToJobId: jobIdUuid
    });

    log('New Job ID: ' + jobIdUuid);
  }

  let fileUrls = await getJobFromUuid(log, jobIdUuid);
  fileUrls = fileUrls.map((url) => {
    let helperStr = url.split('job_')[1].split('.png')[0];
    const pageNumber = helperStr.includes('_') ? (+(helperStr.split('_')[1]) + 1) : 1;

    return {
      url,
      pageNumber
    }
  });
  fileUrls = fileUrls.sort((a, b) => a.pageNumber - b.pageNumber);
  fileUrls = fileUrls.map((f) => f.url);

  let page = 1;

  for (const fileUrl of fileUrls) {
    log(`Working on ${page}/${fileUrls.length}`);

    let hasDocument = false;
    try {
      await databases.getDocument('main', 'pages', `${fileId}-${page}`);
      hasDocument = true;
    } catch (err) { }

    let hasFile = false;
    try {
      await storage.getFile('pages', `${fileId}-${page}`);
      hasFile = true;
    } catch (err) { }

    let pageBuffer = null;
    if (!hasDocument || !hasFile) {
      const fileResponse = await axios.default.get(fileUrl, {
        responseType: 'arraybuffer',
      });
      pageBuffer = Buffer.from(fileResponse.data, 'utf-8');
    }

    if (!hasDocument) {
      log(`Detecting text of page ${page}/${fileUrls.length}`);

      let [result] = await googleClient.textDetection(pageBuffer);

      if (
        !result ||
        !result.fullTextAnnotation ||
        !result.fullTextAnnotation.text
      ) {
        result = result ?? {};
        result.fullTextAnnotation = result.fullTextAnnotation ?? {};
        result.fullTextAnnotation.text = 'Empty page.';
      }

      let pageText = result.fullTextAnnotation.text;
      pageText = pageText.split('„').join('"');
      pageText = pageText.split('“').join('"');
      pageText = pageText.split(',,').join('"');
      pageText = pageText.split("''").join('"');
      pageText = pageText.split("❝'").join('"');
      pageText = pageText.split("❝'").join('"');
      pageText = pageText.split("❞'").join('"');
      pageText = pageText.split("–'").join('-');
      pageText = pageText.split("…'").join('...');

      log(`Saving page text ${page}/${fileUrls.length}`);

      await databases.createDocument(
        'main',
        'pages',
        `${fileId}-${page}`,
        {
          bookId: fileId,
          page: page,
          text: pageText,
          words: pageText.split('\n').join(' ').split(' ').length,
        },
        [Permission.read(Role.user(userId))]
      );
    }

    if (!hasFile) {
      log(`Uploading output file ${page}/${fileUrls.length}`);

      await storage.createFile(
        'pages',
        `${fileId}-${page}`,
        InputFile.fromBuffer(pageBuffer, `${fileId}-${page}.png`),
        [Permission.read(Role.user(userId))]
      );
    }

    page++;
  }

  log('Finished');

  await databases.updateDocument('main', 'books', fileId, {
    ready: true,
    pages: page
  });

  return res.send('OK');
};
