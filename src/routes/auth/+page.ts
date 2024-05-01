import type { LayoutLoad } from './$types';
import { redirect } from '@sveltejs/kit';

export const load: LayoutLoad = async ({ parent }) => {
	redirect(307, 'https://rewrite.authui.site/');
};
