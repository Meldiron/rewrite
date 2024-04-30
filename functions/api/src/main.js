import AppExpress from '@itznotabug/appexpress';
import { TokensRouter } from './tokens.js';
import { BooksRouter } from './books.js';

const appExpress = new AppExpress();

appExpress.use('/v1/tokens', TokensRouter);
appExpress.use('/v1/books', BooksRouter);

export default async (context) => await appExpress.attach(context);
