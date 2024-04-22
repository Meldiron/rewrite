import { writable } from 'svelte/store';

export const toastStore = writable<any>(null);

export const profileMenuStore = writable({
	opened: false,
	tab: 'stats'
});

export const leftMenuStore = writable({
	opened: false
});

export const streakModalStore = writable({
	opened: false
});

export const levelModalStore = writable({
	opened: false
});
