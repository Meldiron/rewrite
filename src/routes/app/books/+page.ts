import { databases } from '$lib/appwrite';
import { Query } from 'appwrite';
import type { PageLoad } from './$types';
import { redirect } from '@sveltejs/kit';

export const load: PageLoad = async () => {
	const books = await databases.listDocuments('main', 'books', [Query.limit(100)]);

	return { books };
};
