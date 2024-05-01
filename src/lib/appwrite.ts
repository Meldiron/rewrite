import { Client, Account, Databases, Storage, Functions } from 'appwrite';

const client = new Client();

client.setEndpoint('https://appwrite.rewrite.almostapps.eu/v1').setProject('rewrite');

export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);
export const functions = new Functions(client);
