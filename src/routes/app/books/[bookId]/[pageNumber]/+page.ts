import { databases } from '$lib/appwrite';
import { Query } from 'appwrite';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params }) => {
	const pageId = `${params.bookId}-${params.pageNumber}`;
	const prevPageId = `${params.bookId}-${+params.pageNumber - 1}`;
	const nextPageId = `${params.bookId}-${params.pageNumber + 1}`;

	const [book, page, previousPage, nextPage, pages, finishes] = await Promise.all([
		databases.getDocument('main', 'books', params.bookId),
		databases.getDocument('main', 'pages', pageId),
		(async () => {
			let previousPage = null;
			try {
				previousPage = await databases.getDocument('main', 'pages', prevPageId);
			} catch (err) {}
			return previousPage;
		})(),
		(async () => {
			let nextPage = null;
			try {
				nextPage = await databases.getDocument('main', 'pages', nextPageId);
			} catch (err) {}
			return nextPage;
		})(),
		databases.listDocuments('main', 'pages', [
			Query.limit(1),
			Query.equal('bookId', params.bookId)
		]),
		databases.listDocuments('main', 'finishes', [
			Query.limit(1),
			Query.equal('bookId', params.bookId)
		])
	]);

	const isCompleted =
		finishes.documents.length <= 0 ? false : finishes.documents[0].pageNumbers.includes(page.page);
	const totalPages = pages.total;
	const totalFinishes = finishes.total;

	return { book, page, totalPages, isCompleted, totalFinishes, previousPage, nextPage };
};
