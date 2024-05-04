import { databases } from '$lib/appwrite';
import { Query } from 'appwrite';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params }) => {
	const [book, pages, finishes] = await Promise.all([
		databases.getDocument('main', 'books', params.bookId),
		databases.listDocuments('main', 'pages', [
			Query.limit(1000),
			Query.equal('bookId', params.bookId),
			Query.select(['bookId', 'page', 'words', 'ready'])
		]),
		databases.listDocuments('main', 'finishes', [
			Query.limit(1),
			Query.equal('bookId', params.bookId)
		])
	]);

	return { book, pages, finishedPageNumbers: (finishes.documents[0] ?? {}).pageNumbers ?? [] };
};
