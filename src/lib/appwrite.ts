import { Client, Account, Databases, Storage, Functions } from 'appwrite';

const client = new Client();

client.setEndpoint('https://appwrite2.rewrite.almostapps.eu/v1').setProject('rewrite');

export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);
export const functions = new Functions(client);

export function getFilePreview(bucketId: string, fileId: string): string {
	const url = storage.getFileView(bucketId, fileId).toString();
	return url.split('appwrite.rewrite.almostapps.eu').join('rewrite-app.b-cdn.net');
}
