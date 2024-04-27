import { databases } from '$lib/appwrite';
import { Query } from 'appwrite';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ parent, url }) => {
	const data = await parent();

	let tokens = null;

	try {
		if (data.user) {
			tokens = await databases.getDocument('main', 'tokens', data.user.$id);
		}
	} catch (err) {}

	return {
		tokens
	};
};
