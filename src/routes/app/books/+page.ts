import { databases } from '$lib/appwrite';
import { Query } from 'appwrite';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ parent, url }) => {
	const perPage = 10;
	const isPublic = (url.searchParams.get('type') ?? 'public') === 'public';

	const [data, books] = await Promise.all([
		parent(),
		databases.listDocuments('main', 'books', [
			Query.limit(perPage),
			Query.equal('isPublic', isPublic)
		])
	]);

	let finishesQuery = [Query.limit(1), Query.equal('$id', 'empty-response')];
	if (books.documents.length > 0) {
		finishesQuery = [
			Query.limit(perPage),
			Query.equal(
				'bookId',
				books.documents.map((book) => book.$id)
			)
		];
	}
	const finishes = await databases.listDocuments('main', 'finishes', finishesQuery);

	return {
		books: {
			...books,
			documents: books.documents.sort((a, b) => {
				const aStarred = data.profile.pinnedBooks.includes(a.$id);
				const bStarred = data.profile.pinnedBooks.includes(b.$id);

				return aStarred === bStarred ? 0 : aStarred ? -1 : 1;
			})
		},
		finishes,
		isPublic,
		perPage
	};
};
