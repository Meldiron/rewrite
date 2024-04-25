import * as axios from 'axios';
import { ImageAnnotatorClient } from '@google-cloud/vision';
import { Client, Storage, Databases, InputFile } from 'node-appwrite';

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

  const { pageId, scopedPermissions } = JSON.parse(req.bodyRaw ?? '{}');

  if (!pageId) {
    throw new Error('Page ID missing.');
  }

  if (!scopedPermissions) {
    throw new Error('Scoped permissions missing.');
  }

  log(`Getting page ID: ${pageId}`);

  const page = await databases.getDocument('main', 'pages', pageId);

  log('Checking page file status');

  let hasFile = false;
  try {
    await storage.getFile('pages', `${fileId}-${page}`);
    hasFile = true;
  } catch (err) { }

  if (!hasFile) {
    log(`Downloading file`);

    const fileResponse = await axios.default.get(page.jobFileUrl, {
      responseType: 'arraybuffer',
    });
    const pageBuffer = Buffer.from(fileResponse.data, 'utf-8');

    await storage.createFile(
      'pages',
      pageId,
      InputFile.fromBuffer(pageBuffer, `${pageId}.png`),
      scopedPermissions
    );
  }

  // TODO: Optimize. If previous step occured, we already have buffer
  log('Downloading page file');

  const arrayBuffer = await storage.getFileDownload('pages', pageId);
  const buffer = Buffer.from(new Uint8Array(arrayBuffer));

  log('Transcribing page');

  let [result] = await googleClient.textDetection(buffer);

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

  log(`Saving page text`);

  await databases.updateDocument(
    'main',
    'pages',
    pageId,
    {
      ready: true,
      text: pageText,
      words: pageText.split('\n').join(' ').split(' ').length,
    }
  );

  log('Done');

  return res.send('OK');
};
