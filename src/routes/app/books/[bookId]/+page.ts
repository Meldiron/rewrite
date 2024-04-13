import { databases } from '$lib/appwrite';
import { Query } from 'appwrite';
import type { PageLoad } from './$types';
import { redirect } from '@sveltejs/kit';

export const load: PageLoad = async ({ params }) => {
	const book = await databases.getDocument('main', 'books', params.bookId);

	const pages = await databases.listDocuments('main', 'pages', [
		Query.limit(1000),
		Query.equal('bookId', params.bookId)
	]);

	const finishes = await databases.listDocuments('main', 'finishes', [Query.limit(1), Query.equal('bookId', params.bookId)]);

	return { book, pages, finishedPageNumbers: ((finishes.documents[0] ?? {}).pageNumbers ?? []) };
};
