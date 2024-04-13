import { Client, Databases, ID, InputFile, Permission, Role, Storage } from 'node-appwrite';
import { ImageAnnotatorClient } from '@google-cloud/vision';
import ConvertAPI from 'convertapi';
import fs from 'fs/promises';
import * as axios from 'axios';
import { parseEpub } from '@gxl/epub-parser';

export default async ({ req, res, log, error }) => {
  const jobId = Date.now().toString(16);

  log('Starting ' + jobId);

  // TODO: Re-run prone. If something exists, ignore it

  const googleClient = new ImageAnnotatorClient();

  const convertapi = new ConvertAPI(process.env.CONVERTER_API_KEY, {
    conversionTimeout: 600,
    uploadTimeout: 600,
    downloadTimeout: 600,
  });

  const client = new Client()
    .setEndpoint('https://cloud.appwrite.io/v1')
    .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

  const storage = new Storage(client);
  const databases = new Databases(client);

  const userId = req.headers['x-appwrite-user-id'] ?? null;
  const fileId = req.bodyRaw ?? null

  if (!userId) {
    return res.send('Only users can add books.', 400);
  }

  if (!fileId) {
    return res.send('Please provide book file ID.', 400);
  }

  log('Dowloading source file: ' + fileId);

  const buffer = await storage.getFileDownload('books', fileId);

  log('Saving source file');

  await fs.writeFile(`./job_${jobId}.epub`, buffer);

  log('Extracting metadata');

  const epubObj = await parseEpub(`./job_${jobId}.epub`, {
    type: 'path',
  });

  const { title, author, publisher } = epubObj.info;

  log('Storing data about book');

  await databases.createDocument('main', 'books', fileId, {
    title,
    author,
    publisher,
    ready: false
  }, [
    Permission.read(Role.user(userId)),
  ]);

  log('Converting source file');

  const result = await convertapi.convert('png', { File: `./job_${jobId}.epub` }, 'epub', 600);

  const fileUrls = result.files.map((f) => f.url);

  let page = 1;

  for (const fileUrl of fileUrls) {
    log(`Downloading output file ${page}/${fileUrls.length}`);

    const fileResponse = await axios.default.get(fileUrl, { responseType: 'arraybuffer' })
    const pageBuffer = Buffer.from(fileResponse.data, "utf-8")

    log(`Detecting text of page ${page}/${fileUrls.length}`);

    let [result] = await googleClient.textDetection(pageBuffer);

    if (!result || !result.fullTextAnnotation || !result.fullTextAnnotation.text) {
      result = result ?? {};
      result.fullTextAnnotation = result.fullTextAnnotation ?? {};
      result.fullTextAnnotation.text = "Empty page.";
    }

    let pageText = result.fullTextAnnotation.text;
    pageText = pageText.split('„').join('"');
    pageText = pageText.split('“').join('"');
    pageText = pageText.split(',,').join('"');
    pageText = pageText.split("''").join('"');

    log(`Saving page text ${page}/${fileUrls.length}`);

    await databases.createDocument('main', 'pages', `${fileId}-${page}`, {
      bookId: fileId,
      page: page,
      text: pageText,
      words: pageText.split("\n").join(" ").split(" ").length,
    }, [
      Permission.read(Role.user(userId)),
    ]);

    log(`Uploading output file ${page}/${fileUrls.length}`);

    await storage.createFile('pages', `${fileId}-${page}`, InputFile.fromBuffer(pageBuffer, `${fileId}-${page}.png`), [
      Permission.read(Role.user(userId)),
    ]);

    page++;
  }

  log('Finished');

  await databases.updateDocument('main', 'books', fileId, {
    ready: true
  });

  return res.send('OK');
};
