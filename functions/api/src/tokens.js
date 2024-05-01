import { Permission, Role } from 'node-appwrite';
import * as axios from 'axios';
import AppExpress from '@itznotabug/appexpress';
import { databases, users } from './lib.js';

export const TokensRouter = new AppExpress.Router();

TokensRouter.post('/', async (req, res) => {
  const userId = req.headers['x-appwrite-user-id'] ?? null;
  const licenseKey = req.bodyRaw ?? null;

  if (!licenseKey) {
    return res.send('Please provide license key.', 400);
  }

  let tokens = null;

  try {
    tokens = await databases.getDocument('main', 'tokens', userId);
  } catch (err) {}

  if (!tokens) {
    tokens = await databases.createDocument(
      'main',
      'tokens',
      userId,
      {
        balance: 0,
      },
      [Permission.read(Role.user(userId))]
    );
  }

  const response = await axios.default.post(
    'https://api.lemonsqueezy.com/v1/licenses/activate',
    JSON.stringify({
      license_key: licenseKey,
      instance_name: userId,
    }),
    {
      headers: {
        'Content-Type': 'application/json',
      },
      validateStatus: () => true,
    }
  );

  if (!response.data) {
    return res.send(
      'Internal error when validating key. Please try again.',
      500
    );
  }

  if (response.data.error) {
    return res.send('Cannot activate license key: ' + response.data.error, 400);
  }

  const variantName = response.data.meta.variant_name;
  const balanceToAdd = +(variantName.split(' ')[0] ?? 0);

  if (balanceToAdd === 0) {
    return res.send(
      'Cannot activate license key: Invalid product assigned to key.',
      400
    );
  }

  await databases.updateDocument('main', 'tokens', userId, {
    balance: tokens.balance + balanceToAdd,
  });

  return res.send(
    `${balanceToAdd} ${balanceToAdd === 1 ? 'token' : 'tokens'} added to your account.`,
    200
  );
});
