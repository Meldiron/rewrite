import type { Models } from 'appwrite';
import type { LayoutLoad } from './$types';
import { account } from '$lib/appwrite';

export let ssr = false;

export const load: LayoutLoad = async () => {
    let user: null | Models.User<any> = null;

    try {
        user = await account.get();
    } catch(err) {
        console.warn(err);
    }

	return { user };
};