import { databases } from '$lib/appwrite';
import { Query } from 'appwrite';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ parent, url }) => {
	const perPage = 10;
	const isPublic = (url.searchParams.get('type') ?? 'public') === 'public';
	const search = url.searchParams.get('search') ?? '';

	const booksQuery = [Query.limit(perPage), Query.equal('isPublic', isPublic)];
	if (search) {
		booksQuery.push(Query.search('search', search.toLowerCase()));
	}
	const [data, books] = await Promise.all([
		parent(),
		databases.listDocuments('main', 'books', booksQuery)
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
			documents: books.documents
				.sort((a, b) => {
					const aProgress =
						finishes.documents.find((f) => f.bookId === a.$id)?.pageNumbers?.length ?? 0;
					const bProgress =
						finishes.documents.find((f) => f.bookId === b.$id)?.pageNumbers?.length ?? 0;

					const aIsFinished = aProgress === a.pages;
					const bIsFinished = bProgress === b.pages;

					if (aIsFinished === bIsFinished) {
						return 0;
					}
					return aIsFinished ? 1 : -1;
				})
				.sort((a, b) => {
					const aStarred = data.profile.pinnedBooks.includes(a.$id);
					const bStarred = data.profile.pinnedBooks.includes(b.$id);

					return aStarred === bStarred ? 0 : aStarred ? -1 : 1;
				})
		},
		finishes,
		isPublic,
		perPage,
		search
	};
};
