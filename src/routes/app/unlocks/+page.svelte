<script lang="ts">
	import { profileMenuStore, streakModalStore } from '$lib/stores';
	import { getLevel } from '$lib/utils';
	import type { PageData } from './$types';

	export let data: PageData;

	const categories = [
		{
			level: 1,
			unlocks: [
				{
					title: 'Public library',
					description: 'Rewrite most popular books.',
					action: {
						href: '/app/books?type=public',
						text: 'Visit'
					}
				},

				{
					title: 'Streaks',
					description: 'Keep rewriting at least one page every day to maintain your streak.',
					action: {
						run: () => {
							$streakModalStore.opened = true;
						},
						text: 'View streaks'
					}
				},
				{
					title: 'Skip word every 15 seconds',
					description:
						'Skip one word when rewriring book. Useful for long words, complex symbols, or mistakes in the book text.'
				}
			]
		},
		{
			level: 3,
			unlocks: [
				{
					title: 'My library',
					description: 'Upload your own EPUB books to rewrite.',
					action: {
						href: '/app/books?type=private',
						text: 'Visit'
					}
				},
				{
					title: 'Profile stats',
					description:
						'See your account stats in profile to track your progress through books and pages.',
					action: {
						run: () => {
							$profileMenuStore.opened = true;
							$profileMenuStore.tab = 'stats';
						},
						text: 'View stats'
					}
				}
			]
		},
		{
			level: 5,
			unlocks: [
				{
					title: 'Case sensitivity',
					description:
						'Configre if words should be case sensitive when rewriting a book. For example, B and b are considered same when disabled.',
					action: {
						run: () => {
							$profileMenuStore.opened = true;
							$profileMenuStore.tab = 'settings';
						},
						text: 'Open settings'
					}
				},
				{
					title: 'Accent sensitivity',
					description:
						'Configre if words should be strict with accents. For example, č and c are considered same when disabled.',
					action: {
						run: () => {
							$profileMenuStore.opened = true;
							$profileMenuStore.tab = 'settings';
						},
						text: 'Open settings'
					}
				}
			]
		},
		{
			level: 10,
			unlocks: [
				{
					title: 'Skip word every 10 seconds',
					description:
						'Skip one word when rewriring book. Useful for long words, complex symbols, or mistakes in the book text.'
				}
			]
		},
		{
			level: 15,
			unlocks: [
				{
					title: 'Easy Quests',
					description:
						'Pickup and complete easy quests and to quest points. Spend quest points in the store.',
					action: {
						run: () => {
							$profileMenuStore.opened = true;
							$profileMenuStore.tab = 'quests';
						},
						text: 'View quests'
					}
				}
			]
		},
		{
			level: 20,
			unlocks: [
				{
					title: 'Profile badges',
					description: 'Collect profile badges by completing achievements.',
					action: {
						run: () => {
							$profileMenuStore.opened = true;
							$profileMenuStore.tab = 'stats';
						},
						text: 'View badges'
					}
				}
			]
		},
		{
			level: 25,
			unlocks: [
				{
					title: 'Skip word every 5 seconds',
					description:
						'Skip one word when rewriring book. Useful for long words, complex symbols, or mistakes in the book text.'
				}
			]
		},
		{
			level: 30,
			unlocks: [
				{
					title: 'Medium Quests',
					description:
						'Pickup and complete medium quests and to quest points. Spend quest points in the store.',
					action: {
						run: () => {
							$profileMenuStore.opened = true;
							$profileMenuStore.tab = 'quests';
						},
						text: 'View quests'
					}
				}
			]
		},
		{
			level: 40,
			unlocks: [
				{
					title: 'Hard Quests',
					description:
						'Pickup and complete hard quests and to quest points. Spend quest points in the store.',
					action: {
						run: () => {
							$profileMenuStore.opened = true;
							$profileMenuStore.tab = 'quests';
						},
						text: 'View quests'
					}
				}
			]
		},
		{
			level: 50,
			unlocks: [
				{
					title: 'Skip word every 3 seconds',
					description:
						'Skip one word when rewriring book. Useful for long words, complex symbols, or mistakes in the book text.'
				}
			]
		},
		{
			level: 100,
			unlocks: [
				{
					title: 'Skip word every second',
					description:
						'Skip one word when rewriring book. Useful for long words, complex symbols, or mistakes in the book text.'
				}
			]
		}
	];
</script>

<div class="max-w-2xl mx-auto">
	<h1 class="text-4xl font-semibold my-8">
		<span>Unlocks</span><span class=" animate-cursor text-primary">_</span>
	</h1>

	<div class="card w-full bg-base-100 shadow-xl">
		<div class="card-body">
			{#each categories as category, index}
				<div
					class={`divider ${index === 0 ? 'mt-0' : ''} ${getLevel(data.profile.xp) >= category.level ? 'divider-success' : 'divider-neutral'}`}
				>
					Level {category.level}
				</div>

				{#each category.unlocks as unlock}
					<div role="alert" class="alert shadow-lg">
						{#if getLevel(data.profile.xp) >= category.level}
							<svg
								xmlns="http://www.w3.org/2000/svg"
								fill="none"
								viewBox="0 0 24 24"
								stroke-width="1.5"
								stroke="currentColor"
								class="w-6 h-6 text-success"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									d="M13.5 10.5V6.75a4.5 4.5 0 1 1 9 0v3.75M3.75 21.75h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H3.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z"
								/>
							</svg>
						{:else}
							<svg
								xmlns="http://www.w3.org/2000/svg"
								fill="none"
								viewBox="0 0 24 24"
								stroke-width="1.5"
								stroke="currentColor"
								class="w-6 h-6 text-error"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z"
								/>
							</svg>
						{/if}

						<div>
							{#if unlock.title}
								<h3 class="font-bold">{unlock.title}</h3>
							{/if}

							{#if unlock.description}
								<div class="text-xs">{unlock.description}</div>
							{/if}
						</div>

						{#if unlock.action}
							{#if unlock.action.href}
								<a href={unlock.action?.href} class="btn btn-sm">{unlock.action.text}</a>
							{:else}
								<button on:click={() => unlock.action?.run()} class="btn btn-sm"
									>{unlock.action.text}</button
								>
							{/if}
						{/if}
					</div>
				{/each}
			{/each}
		</div>
	</div>
</div>

<div></div>
