import AppExpress from '@itznotabug/appexpress';
import { databases } from './lib.js';

export const BooksRouter = new AppExpress.Router();

BooksRouter.put('/:bookId/metadata', async (req, res) => {
  const { bookId } = req.params;

  const userId = req.headers['x-appwrite-user-id'] ?? null;
  const userJwt = req.headers['x-appwrite-user-jwt'] ?? null;
  const body = JSON.parse(req.bodyRaw ?? '{}');

  body.title = body.title ? body.title : '';

  const book = await databases.getDocument('main', 'books', bookId);

  const isAllowed =
    book.$permissions.filter((p) => p.includes(userId)).length > 0;

  if (!isAllowed) {
    return res.send(`You don't have access to this book.`, 403);
  }

  await databases.updateDocument('main', 'books', bookId, {
    title: body.title,
  });

  return res.send(`Book details saved.`, 200);
});
