import { Client, Account, Databases, Storage, Functions } from 'appwrite';

const client = new Client();

client.setEndpoint('https://appwrite.rewrite.almostapps.eu/v1').setProject('rewrite');

export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);
export const functions = new Functions(client);

export function getFilePreview(
	bucketId: string,
	fileId: string,
	width?: number,
	height?: number,
	gravity?: string,
	quality?: number,
	borderWidth?: number,
	borderColor?: string,
	borderRadius?: number,
	opacity?: number,
	rotation?: number,
	background?: string,
	output?: string
): string {
	const url = storage
		.getFilePreview(
			bucketId,
			fileId,
			width,
			height,
			gravity,
			quality,
			borderWidth,
			borderColor,
			borderRadius,
			opacity,
			rotation,
			background,
			output
		)
		.toString();
	return url.split('appwrite.rewrite.almostapps.eu').join('rewrite-app.b-cdn.net');
}
