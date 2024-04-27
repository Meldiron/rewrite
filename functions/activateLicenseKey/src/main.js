import { Client, Databases, Permission, Role, Users } from 'node-appwrite';
import * as axios from 'axios';

export default async ({ req, res, log, error }) => {
  const jobId = Date.now().toString(16);

  log('Starting ' + jobId);

  const client = new Client()
    .setEndpoint('https://cloud.appwrite.io/v1')
    .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

  const databases = new Databases(client);
  const users = new Users(client);

  const userId = req.headers['x-appwrite-user-id'] ?? null;
  const licenseKey = req.bodyRaw ?? null;

  log(process.env.APPWRITE_FUNCTION_PROJECT_ID);
  log(userId);
  log(licenseKey);

  let userExists = false;
  try {
    if (userId) {
      await users.get(userId);
      userExists = true;
    }
  } catch (err) {}

  log(userExists);

  if (!userExists) {
    return res.send('Only users can activate license key.', 400);
  }

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

  const variantId = response.data.meta.variant_id;
  const balanceToAdd =
    variantId === 356052
      ? 1
      : variantId === 356053
        ? 5
        : variantId === 356054
          ? 50
          : 0;

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
};
