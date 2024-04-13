import type { LayoutLoad } from './$types';
import { redirect } from '@sveltejs/kit';

export const load: LayoutLoad = async ({ parent }) => {
	const data = await parent();

	if (data.user === null) {
		redirect(307, '/auth');
	}
};
