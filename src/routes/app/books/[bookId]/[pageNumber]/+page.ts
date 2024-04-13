import { databases } from '$lib/appwrite';
import { Query } from 'appwrite';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params }) => {
	const pageId = `${params.bookId}-${params.pageNumber}`;

	const book = await databases.getDocument('main', 'books', params.bookId);
	const page = await databases.getDocument('main', 'pages', pageId);

	const pages = await databases.listDocuments('main', 'pages', [
		Query.limit(1),
		Query.equal('bookId', params.bookId)
	]);
	const finishes = await databases.listDocuments('main', 'finishes', [
		Query.limit(1),
		Query.equal('bookId', params.bookId)
	]);

	const isCompleted =
		finishes.documents.length <= 0 ? false : finishes.documents[0].pageNumbers.includes(page.page);

	const totalPages = pages.total;
	const totalFinishes = finishes.total;

	return { book, page, totalPages, isCompleted, totalFinishes };
};
