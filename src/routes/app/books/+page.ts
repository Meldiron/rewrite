import { databases } from '$lib/appwrite';
import { Query } from 'appwrite';
import type { PageLoad } from './$types';

export const load: PageLoad = async () => {
	const books = await databases.listDocuments('main', 'books', [Query.limit(100)]);
	const finishes = await databases.listDocuments('main', 'finishes', [Query.limit(100)]);

	return { books, finishes };
};
