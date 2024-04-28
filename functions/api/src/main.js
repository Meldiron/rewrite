import AppExpress from "@itznotabug/appexpress";
import { TokensRouter } from './tokens.js';

const appExpress = new AppExpress();

appExpress.use('/v1/tokens', TokensRouter);

export default async (context) => await appExpress.attach(context);