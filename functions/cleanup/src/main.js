import { Client, Databases, Query, Storage } from 'node-appwrite';

async function forEachFile(storage, bucket, callback) {
  let cursor = null;

  do {
    let queries = [
      Query.limit(1000)
    ];

    if (cursor) {
      queries.push(Query.cursorAfter(cursor));
    }

    const response = await storage.listFiles(bucket, queries);

    for (const file of response.files) {
      await callback(file);
    }

    if (response.files.length > 0) {
      cursor = response.files[response.files.length - 1].$id;
    } else {
      cursor = null;
    }
  } while (cursor !== null);
}

async function forEachDocument(databases, collection, callback) {
  let cursor = null;

  do {
    let queries = [
      Query.limit(1000)
    ];

    if (cursor) {
      queries.push(Query.cursorAfter(cursor));
    }

    const response = await databases.listDocuments('main', collection, queries);

    for (const file of response.documents) {
      await callback(file);
    }

    if (response.documents.length > 0) {
      cursor = response.documents[response.documents.length - 1].$id;
    } else {
      cursor = null;
    }
  } while (cursor !== null);
}

export default async ({ req, res, log, error }) => {
  const client = new Client()
    .setEndpoint('https://cloud.appwrite.io/v1')
    .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

  const storage = new Storage(client);
  const databases = new Databases(client);

  log("Getting books");
  const booksResponse = await databases.listDocuments('main', 'books', [
    Query.limit(10000)
  ]);
  const existingBookIds = booksResponse.documents.map((book) => book.$id);

  log("Processing pages");
  const dbPagesToDelete = [];
  await forEachDocument(databases, 'pages', async (doc) => {
    const docBookId = doc.bookId;

    if (!existingBookIds.includes(docBookId)) {
      log(`Deleting page ${doc.$id} from book ${docBookId} as book does not exist anymore`);
      dbPagesToDelete.push(doc.$id);
    }
  });

  for (const toDelete of dbPagesToDelete) {
    await databases.deleteDocument('main', 'pages', toDelete);
  }

  log("Processing finishes");
  const dbFinishesToDelete = [];
  await forEachDocument(databases, 'finishes', async (doc) => {
    const docBookId = doc.bookId;

    if (!existingBookIds.includes(docBookId)) {
      log(`Deleting finish ${doc.$id} from book ${docBookId} as book does not exist anymore`);
      dbFinishesToDelete.push(doc.$id);
    }
  });

  for (const toDelete of dbFinishesToDelete) {
    await databases.deleteDocument('main', 'finishes', toDelete);
  }

  log("Processing storage pages");
  const storagePagesToDelete = [];
  await forEachFile(storage, 'pages', async (file) => {
    const fileBookId = file.$id.split('-')[0];

    if (!existingBookIds.includes(fileBookId)) {
      log(`Deleting page ${file.$id} as book ${fileBookId} does not exist anymore`);
      storagePagesToDelete.push(file.$id);
    }
  });

  for (const toDelete of storagePagesToDelete) {
    await storage.deleteFile('pages', toDelete);
  }

  log("Processing storage books");
  const storageBooksToDelete = [];
  await forEachFile(storage, 'books', async (file) => {
    const fileBookId = file.$id;

    if (!existingBookIds.includes(fileBookId)) {
      log(`Deleting book ${file.$id} as book does not exist anymore`);
      storageBooksToDelete.push(fileBookId);
    }
  });


  for (const toDelete of storageBooksToDelete) {
    await storage.deleteFile('books', toDelete);
  }

  return res.send('OK');
}
