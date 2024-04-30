import { invalidateAll } from '$app/navigation';
import { account } from '$lib/appwrite';
import type { LayoutLoad } from './$types';
import { redirect } from '@sveltejs/kit';

export const load: LayoutLoad = async ({ url, parent }) => {
	try {
		const secret = url.searchParams.get('secret') ?? '';
		const userId = url.searchParams.get('userId') ?? '';

		if (!userId || !secret) {
			throw new Error('Invalid secret or userId');
		}

		await account.updateMagicURLSession(userId, secret);

		await parent();
	} catch (err) {
		console.error(err);
		redirect(307, '/auth/sign-in');
	}

	redirect(307, '/app');
};
