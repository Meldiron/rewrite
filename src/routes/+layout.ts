import { ID, type Models } from 'appwrite';
import type { LayoutLoad } from './$types';
import { account, databases } from '$lib/appwrite';
import { isStreakEnded } from '$lib/utils';

export let ssr = false;

export const load: LayoutLoad = async () => {
	let user: null | Models.User<any> = null;

	try {
		user = await account.get();
	} catch (err) {
		console.warn(err);
	}

	let profile: null | any = null;

	if (user) {
		if (user.prefs.profileId) {
			profile = await databases.getDocument('main', 'profiles', user.prefs.profileId);
		} else {
			profile = await databases.createDocument('main', 'profiles', ID.unique(), {
				pinnedBooks: [],
				autocorrects: 0,
				streak: 0,
				maxStreak: 0,
				totalStreak: 0,
				lastStreakDate: null,
				xp: 0,
				wordsFinished: 0,
				pagesFinished: 0,
				booksFinished: 0,
				coins: 0,
				currentQuest: null,
				questsFinished: 0,
				wordsWithAccentSensitivityFinished: 0,
				wordsWithCaseSensitivityFinished: 0,
				lengthyWordsFinished: 0,
				wordsWithoutMistakeFinished: 0
			});
			const newPrefs = {
				...user.prefs,
				profileId: profile.$id
			};
			await account.updatePrefs(newPrefs);
			user.prefs = newPrefs;
		}
	}

	if (profile) {
		if (isStreakEnded(profile.lastStreakDate)) {
			profile.streak = 0;
			profile.lastStreakDate = null;

			await databases.updateDocument('main', 'profiles', profile.$id, {
				streak: 0,
				lastStreakDate: null
			});
		}
	}

	return { user, profile };
};
