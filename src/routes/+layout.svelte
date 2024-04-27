<script lang="ts">
	import { goto, invalidate, invalidateAll } from '$app/navigation';
	import { account } from '$lib/appwrite';
	import {
		leftMenuStore,
		levelModalStore,
		profileMenuStore,
		streakModalStore,
		toastStore
	} from '$lib/stores';
	import {
		getExtraXp,
		getLevel,
		getLevelProgress,
		getXpRemaining,
		hasStreak,
		hasStreakOnDate
	} from '$lib/utils';
	import '../app.css';
	import type { PageData } from './$types';

	export let data: PageData;

	let isSigningOut = false;
	let isSavingSettings = false;

	async function signOut() {
		if (isSigningOut) return;

		isSigningOut = true;

		try {
			await account.deleteSession('current');
			await invalidateAll();
			await goto('/auth');
			$toastStore = null;
		} catch (err: any) {
			$toastStore = err.message || err || 'An error occurred';
		} finally {
			isSigningOut = false;
			$profileMenuStore.opened = false;
		}
	}

	function getToastClasses(type: string) {
		if (type === 'success') {
			return 'alert-success bg-success-content border-success-content text-success';
		}
		if (type === 'error') {
			return 'alert-error bg-error-content border-error-content text-error';
		}
		if (type === 'info') {
			return 'alert-info bg-info-content border-info-content text-info';
		}

		return 'alert-base-100 bg-base-100 border-base-100 text-primary';
	}

	function getRelativeDate(diffInDays: number) {
		const dateNow = Date.now();
		const date = new Date(dateNow + diffInDays * 24 * 60 * 60 * 1000);
		return date;
	}

	function dateToDayName(date: Date) {
		const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
		return days[date.getDay()];
	}

	async function setAccentSensitivity(e: any) {
		if (isSavingSettings) {
			return;
		}

		isSavingSettings = true;

		try {
			const prefs = data.user?.prefs ?? {};
			prefs.accentSensitivity = e.target.checked;
			await account.updatePrefs(prefs);
			await invalidateAll();
		} catch (error) {
			throw error;
		} finally {
			isSavingSettings = false;
		}
	}

	async function setCaseSensitivity(e: any) {
		if (isSavingSettings) {
			return;
		}

		isSavingSettings = true;

		try {
			const prefs = data.user?.prefs ?? {};
			prefs.caseSensitivity = e.target.checked;
			await account.updatePrefs(prefs);
			await invalidateAll();
		} catch (error) {
			throw error;
		} finally {
			isSavingSettings = false;
		}
	}
</script>

<div class="sticky top-0 z-[1] navbar bg-base-100">
	<div class="navbar-start">
		<label for="left-menu" class="btn btn-ghost btn-circle">
			<svg
				xmlns="http://www.w3.org/2000/svg"
				class="h-5 w-5"
				fill="none"
				viewBox="0 0 24 24"
				stroke="currentColor"
				><path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M4 6h16M4 12h16M4 18h7"
				/></svg
			>
		</label>
	</div>
	<div class="navbar-center">
		<a href="/" class="btn btn-ghost text-xl flex gap-1"
			><span>Rewrite</span><span class=" animate-cursor text-primary">_</span></a
		>
	</div>
	<div class="navbar-end gap-2">
		{#if data.profile}
			<button
				on:click={() => ($streakModalStore.opened = true)}
				class={`relative btn btn-error btn-circle ${hasStreak(data.profile.lastStreakDate) ? '' : 'btn-outline'}`}
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					viewBox="0 0 24 24"
					fill="currentColor"
					class="w-5 h-5"
				>
					<path
						fill-rule="evenodd"
						d="M12.963 2.286a.75.75 0 0 0-1.071-.136 9.742 9.742 0 0 0-3.539 6.176 7.547 7.547 0 0 1-1.705-1.715.75.75 0 0 0-1.152-.082A9 9 0 1 0 15.68 4.534a7.46 7.46 0 0 1-2.717-2.248ZM15.75 14.25a3.75 3.75 0 1 1-7.313-1.172c.628.465 1.35.81 2.133 1a5.99 5.99 0 0 1 1.925-3.546 3.75 3.75 0 0 1 3.255 3.718Z"
						clip-rule="evenodd"
					/>
				</svg>
				<div class="absolute -bottom-2 w-full">
					<div class="badge badge-error badge-sm">{data.profile.streak}</div>
				</div>
			</button>

			<button
				on:click={() => ($levelModalStore.opened = true)}
				class="btn btn-circle btn-ghost btn-outline"
			>
				<div
					class="radial-progress"
					style={`--value:${getLevelProgress(data.profile.xp)}; --size:2.7rem; --thickness: 3px;`}
					role="progressbar"
				>
					{getLevel(data.profile.xp)}
				</div>
			</button>
		{/if}

		{#if data.user === null}
			<a href="/auth/sign-in" class="btn btn-circle btn-active btn-ghost">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					fill="none"
					viewBox="0 0 24 24"
					stroke-width="1.5"
					stroke="currentColor"
					class="w-5 h-5"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"
					/>
				</svg>
			</a>
		{:else}
			<label for="user-menu" class="drawer-button btn btn-circle btn-active btn-ghost">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					fill="none"
					viewBox="0 0 24 24"
					stroke-width="1.5"
					stroke="currentColor"
					class="w-5 h-5"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"
					/>
				</svg>
			</label>
		{/if}
	</div>
</div>

<div class="lg:my-10 my-4 px-4">
	<slot />
</div>

<footer class="footer footer-center pb-10 bg-base-200 text-base-content rounded">
	<nav class="grid grid-flow-col gap-4">
		<a href="https://github.com/meldiron" target="_blank" class="link link-hover">Contact</a>
		<a href="https://github.com/meldiron/rewrite" target="_blank" class="link link-hover">GitHub</a>
	</nav>
	<aside class="text-secondary-content">
		<p>Copyright © 2024 - All right reserved by Almost Apps</p>
	</aside>
</footer>

<div class="dropdown">
	<div class="drawer z-[100]">
		<input
			bind:checked={$leftMenuStore.opened}
			id="left-menu"
			type="checkbox"
			class="drawer-toggle"
		/>
		<div class="drawer-content"></div>
		<div class="drawer-side">
			<label for="left-menu" aria-label="close sidebar" class="drawer-overlay"></label>
			<ul class="menu p-4 w-80 min-h-full bg-base-200 text-base-content gap-2">
				<li>
					<a class="p-3" href="/" on:click={() => ($leftMenuStore.opened = false)}>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="h-5 w-5"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
							><path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
							/></svg
						>
						Home
					</a>
				</li>

				<li>
					<a
						class="p-3"
						href="/app/books?type=public"
						on:click={() => ($leftMenuStore.opened = false)}
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							fill="none"
							viewBox="0 0 24 24"
							stroke-width="1.5"
							stroke="currentColor"
							class="w-5 h-5"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0 0 12 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75Z"
							/>
						</svg>

						Public library
					</a>

					<a
						class="p-3"
						href="/app/books?type=private"
						on:click={() => ($leftMenuStore.opened = false)}
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							fill="none"
							viewBox="0 0 24 24"
							stroke-width="1.5"
							stroke="currentColor"
							class="w-5 h-5"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25"
							/>
						</svg>
						My library
					</a>
				</li>

				<li>
					<a class="p-3" href="/app/unlocks" on:click={() => ($leftMenuStore.opened = false)}>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							fill="none"
							viewBox="0 0 24 24"
							stroke-width="1.5"
							stroke="currentColor"
							class="w-5 h-5"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								d="M13.5 10.5V6.75a4.5 4.5 0 1 1 9 0v3.75M3.75 21.75h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H3.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z"
							/>
						</svg>

						Unlocks
					</a>
				</li>
			</ul>
		</div>
	</div>
</div>

{#if $toastStore !== null}
	<div class="toast z-[150] toast-end">
		<div
			class={`alert rounded-md ${typeof $toastStore === 'string' ? 'alert-error bg-error-content border-error-content text-error' : getToastClasses($toastStore.type)}`}
		>
			<span>{typeof $toastStore === 'string' ? $toastStore : $toastStore.text}</span>

			<button on:click={() => toastStore.set(null)} class="btn btn-rounded btn-sm btn-ghost p-1">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					fill="none"
					viewBox="0 0 24 24"
					stroke-width="1.5"
					stroke="currentColor"
					class="w-6 h-6"
				>
					<path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
				</svg>
			</button>
		</div>
	</div>
{/if}

{#if data.profile && data.user}
	<div class="drawer drawer-end z-[100]">
		<input
			bind:checked={$profileMenuStore.opened}
			id="user-menu"
			type="checkbox"
			class="drawer-toggle"
		/>
		<div class="drawer-content"></div>
		<div class="drawer-side">
			<label for="user-menu" aria-label="close sidebar" class="drawer-overlay"></label>
			<div class="p-4 w-80 min-h-full bg-base-200 text-base-content">
				<div role="tablist" class="tabs tabs-bordered">
					<button
						role="tab"
						on:click={() => ($profileMenuStore.tab = 'stats')}
						class={`tab ${$profileMenuStore.tab === 'stats' ? 'tab-active' : ''}`}>Stats</button
					>
					<button
						role="tab"
						on:click={() => ($profileMenuStore.tab = 'quests')}
						class={`tab ${$profileMenuStore.tab === 'quests' ? 'tab-active' : ''}`}>Quests</button
					>
					<button
						role="tab"
						on:click={() => ($profileMenuStore.tab = 'settings')}
						class={`tab ${$profileMenuStore.tab === 'settings' ? 'tab-active' : ''}`}
						>Settings</button
					>
				</div>
				<div class="mt-4">
					{#if $profileMenuStore.tab === 'settings'}
						<div class="flex flex-col gap-3 rounded-xl mb-6">
							<div class="form-control">
								<label class="label cursor-pointer">
									<span class="label-text">Case sensitivity</span>
									{#if getLevel(data.profile.xp) >= 5}
										<input
											disabled={isSavingSettings}
											checked={data.user.prefs.caseSensitivity ?? false}
											on:change={(e) => setCaseSensitivity(e)}
											type="checkbox"
											class="toggle"
										/>
									{:else}
										<a href="/app/unlocks" on:click={() => ($profileMenuStore.opened = false)}>
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
										</a>
									{/if}
								</label>
							</div>

							<div class="form-control">
								<label class="label cursor-pointer">
									<span class="label-text">Accent sensitivity</span>
									{#if getLevel(data.profile.xp) >= 5}
										<input
											disabled={isSavingSettings}
											checked={data.user.prefs.accentSensitivity ?? false}
											on:change={(e) => setAccentSensitivity(e)}
											type="checkbox"
											class="toggle"
										/>
									{:else}
										<a href="/app/unlocks" on:click={() => ($profileMenuStore.opened = false)}>
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
										</a>
									{/if}
								</label>
							</div>
						</div>

						<button on:click={signOut} disabled={isSigningOut} class="btn btn-active btn-block"
							>Sign out</button
						>
					{:else if $profileMenuStore.tab === 'stats'}
						{#if getLevel(data.profile.xp) < 3}
							<div
								role="alert"
								class="alert alert-warning"
								style="grid-auto-flow: row; justify-items: center; text-align: center; grid-template-columns: unset;"
							>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									fill="none"
									viewBox="0 0 24 24"
									stroke-width="1.5"
									stroke="currentColor"
									class="stroke-current shrink-0 w-6 h-6"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z"
									/>
								</svg>

								<span>You need level 3 to view stats</span>

								<a
									on:click={() => ($profileMenuStore.opened = false)}
									href="/app/unlocks"
									class="btn btn-sm btn-warning shadow-none">View unlocks</a
								>
							</div>
						{:else}
							<div class="stat">
								<div class="stat-figure text-neutral-content">
									<svg
										xmlns="http://www.w3.org/2000/svg"
										viewBox="0 0 24 24"
										fill="currentColor"
										class="w-8 h-8"
									>
										<path
											fill-rule="evenodd"
											d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.006 5.404.434c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.434 2.082-5.005Z"
											clip-rule="evenodd"
										/>
									</svg>
								</div>
								<div class="stat-value">{data.profile.booksFinished}</div>
								<div class="text-active">Books rewritten</div>
							</div>

							<div class="stat">
								<div class="stat-figure text-neutral-content">
									<svg
										xmlns="http://www.w3.org/2000/svg"
										fill="none"
										viewBox="0 0 24 24"
										stroke-width="1.5"
										stroke="currentColor"
										class="w-8 h-8"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											d="M14.25 6.087c0-.355.186-.676.401-.959.221-.29.349-.634.349-1.003 0-1.036-1.007-1.875-2.25-1.875s-2.25.84-2.25 1.875c0 .369.128.713.349 1.003.215.283.401.604.401.959v0a.64.64 0 0 1-.657.643 48.39 48.39 0 0 1-4.163-.3c.186 1.613.293 3.25.315 4.907a.656.656 0 0 1-.658.663v0c-.355 0-.676-.186-.959-.401a1.647 1.647 0 0 0-1.003-.349c-1.036 0-1.875 1.007-1.875 2.25s.84 2.25 1.875 2.25c.369 0 .713-.128 1.003-.349.283-.215.604-.401.959-.401v0c.31 0 .555.26.532.57a48.039 48.039 0 0 1-.642 5.056c1.518.19 3.058.309 4.616.354a.64.64 0 0 0 .657-.643v0c0-.355-.186-.676-.401-.959a1.647 1.647 0 0 1-.349-1.003c0-1.035 1.008-1.875 2.25-1.875 1.243 0 2.25.84 2.25 1.875 0 .369-.128.713-.349 1.003-.215.283-.4.604-.4.959v0c0 .333.277.599.61.58a48.1 48.1 0 0 0 5.427-.63 48.05 48.05 0 0 0 .582-4.717.532.532 0 0 0-.533-.57v0c-.355 0-.676.186-.959.401-.29.221-.634.349-1.003.349-1.035 0-1.875-1.007-1.875-2.25s.84-2.25 1.875-2.25c.37 0 .713.128 1.003.349.283.215.604.401.96.401v0a.656.656 0 0 0 .658-.663 48.422 48.422 0 0 0-.37-5.36c-1.886.342-3.81.574-5.766.689a.578.578 0 0 1-.61-.58v0Z"
										/>
									</svg>
								</div>
								<div class="stat-title text-primary">Rewritten words</div>
								<div class="stat-value text-active">{data.profile.wordsFinished}</div>
							</div>

							<div class="stat">
								<div class="stat-figure text-neutral-content">
									<svg
										xmlns="http://www.w3.org/2000/svg"
										fill="none"
										viewBox="0 0 24 24"
										stroke-width="1.5"
										stroke="currentColor"
										class="w-8 h-8"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
										/>
									</svg>
								</div>
								<div class="stat-title text-primary">Rewritten pages</div>
								<div class="stat-value text-active">{data.profile.pagesFinished}</div>
							</div>
						{/if}

						<div class="divider">Badges</div>

						{#if getLevel(data.profile.xp) < 20}
							<div
								role="alert"
								class="alert alert-warning"
								style="grid-auto-flow: row; justify-items: center; text-align: center; grid-template-columns: unset;"
							>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									fill="none"
									viewBox="0 0 24 24"
									stroke-width="1.5"
									stroke="currentColor"
									class="stroke-current shrink-0 w-6 h-6"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z"
									/>
								</svg>

								<span>You need level 20 to view badges</span>

								<a
									on:click={() => ($profileMenuStore.opened = false)}
									href="/app/unlocks"
									class="btn btn-sm btn-warning shadow-none">View unlocks</a
								>
							</div>
						{:else}
							<div class="flex items-center w-full gap-4">
								<div class="avatar placeholder border-none">
									<div
										class="w-16 mask mask-hexagon bg-base-300 bg-opacity-50 text-white text-opacity-50"
									>
										<svg
											xmlns="http://www.w3.org/2000/svg"
											viewBox="0 0 24 24"
											fill="currentColor"
											class="w-6 h-6"
										>
											<path
												fill-rule="evenodd"
												d="M5.166 2.621v.858c-1.035.148-2.059.33-3.071.543a.75.75 0 0 0-.584.859 6.753 6.753 0 0 0 6.138 5.6 6.73 6.73 0 0 0 2.743 1.346A6.707 6.707 0 0 1 9.279 15H8.54c-1.036 0-1.875.84-1.875 1.875V19.5h-.75a2.25 2.25 0 0 0-2.25 2.25c0 .414.336.75.75.75h15a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-2.25-2.25h-.75v-2.625c0-1.036-.84-1.875-1.875-1.875h-.739a6.706 6.706 0 0 1-1.112-3.173 6.73 6.73 0 0 0 2.743-1.347 6.753 6.753 0 0 0 6.139-5.6.75.75 0 0 0-.585-.858 47.077 47.077 0 0 0-3.07-.543V2.62a.75.75 0 0 0-.658-.744 49.22 49.22 0 0 0-6.093-.377c-2.063 0-4.096.128-6.093.377a.75.75 0 0 0-.657.744Zm0 2.629c0 1.196.312 2.32.857 3.294A5.266 5.266 0 0 1 3.16 5.337a45.6 45.6 0 0 1 2.006-.343v.256Zm13.5 0v-.256c.674.1 1.343.214 2.006.343a5.265 5.265 0 0 1-2.863 3.207 6.72 6.72 0 0 0 .857-3.294Z"
												clip-rule="evenodd"
											/>
										</svg>
									</div>
								</div>
								<div class="w-full">
									<p class="text-primary text-sm">Bla bla bla bla</p>
									<progress class="progress w-56" value="40" max="100"></progress>
									<p class="text-xs">10 / 55</p>
								</div>
							</div>

							<div>
								<div class="avatar placeholder border-none">
									<div class="w-16 mask mask-hexagon bg-[#CD7F32] text-base-100">
										<svg
											xmlns="http://www.w3.org/2000/svg"
											viewBox="0 0 24 24"
											fill="currentColor"
											class="w-6 h-6"
										>
											<path
												fill-rule="evenodd"
												d="M5.166 2.621v.858c-1.035.148-2.059.33-3.071.543a.75.75 0 0 0-.584.859 6.753 6.753 0 0 0 6.138 5.6 6.73 6.73 0 0 0 2.743 1.346A6.707 6.707 0 0 1 9.279 15H8.54c-1.036 0-1.875.84-1.875 1.875V19.5h-.75a2.25 2.25 0 0 0-2.25 2.25c0 .414.336.75.75.75h15a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-2.25-2.25h-.75v-2.625c0-1.036-.84-1.875-1.875-1.875h-.739a6.706 6.706 0 0 1-1.112-3.173 6.73 6.73 0 0 0 2.743-1.347 6.753 6.753 0 0 0 6.139-5.6.75.75 0 0 0-.585-.858 47.077 47.077 0 0 0-3.07-.543V2.62a.75.75 0 0 0-.658-.744 49.22 49.22 0 0 0-6.093-.377c-2.063 0-4.096.128-6.093.377a.75.75 0 0 0-.657.744Zm0 2.629c0 1.196.312 2.32.857 3.294A5.266 5.266 0 0 1 3.16 5.337a45.6 45.6 0 0 1 2.006-.343v.256Zm13.5 0v-.256c.674.1 1.343.214 2.006.343a5.265 5.265 0 0 1-2.863 3.207 6.72 6.72 0 0 0 .857-3.294Z"
												clip-rule="evenodd"
											/>
										</svg>
									</div>
								</div>
								<div class="avatar placeholder border-none">
									<div class="w-16 mask mask-hexagon bg-primary text-primary-content">
										<svg
											xmlns="http://www.w3.org/2000/svg"
											viewBox="0 0 24 24"
											fill="currentColor"
											class="w-6 h-6"
										>
											<path
												fill-rule="evenodd"
												d="M5.166 2.621v.858c-1.035.148-2.059.33-3.071.543a.75.75 0 0 0-.584.859 6.753 6.753 0 0 0 6.138 5.6 6.73 6.73 0 0 0 2.743 1.346A6.707 6.707 0 0 1 9.279 15H8.54c-1.036 0-1.875.84-1.875 1.875V19.5h-.75a2.25 2.25 0 0 0-2.25 2.25c0 .414.336.75.75.75h15a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-2.25-2.25h-.75v-2.625c0-1.036-.84-1.875-1.875-1.875h-.739a6.706 6.706 0 0 1-1.112-3.173 6.73 6.73 0 0 0 2.743-1.347 6.753 6.753 0 0 0 6.139-5.6.75.75 0 0 0-.585-.858 47.077 47.077 0 0 0-3.07-.543V2.62a.75.75 0 0 0-.658-.744 49.22 49.22 0 0 0-6.093-.377c-2.063 0-4.096.128-6.093.377a.75.75 0 0 0-.657.744Zm0 2.629c0 1.196.312 2.32.857 3.294A5.266 5.266 0 0 1 3.16 5.337a45.6 45.6 0 0 1 2.006-.343v.256Zm13.5 0v-.256c.674.1 1.343.214 2.006.343a5.265 5.265 0 0 1-2.863 3.207 6.72 6.72 0 0 0 .857-3.294Z"
												clip-rule="evenodd"
											/>
										</svg>
									</div>
								</div>
								<div class="avatar placeholder border-none">
									<div class="w-16 mask mask-hexagon bg-warning text-warning-content gold-badge">
										<svg
											xmlns="http://www.w3.org/2000/svg"
											viewBox="0 0 24 24"
											fill="currentColor"
											class="w-6 h-6"
										>
											<path
												fill-rule="evenodd"
												d="M5.166 2.621v.858c-1.035.148-2.059.33-3.071.543a.75.75 0 0 0-.584.859 6.753 6.753 0 0 0 6.138 5.6 6.73 6.73 0 0 0 2.743 1.346A6.707 6.707 0 0 1 9.279 15H8.54c-1.036 0-1.875.84-1.875 1.875V19.5h-.75a2.25 2.25 0 0 0-2.25 2.25c0 .414.336.75.75.75h15a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-2.25-2.25h-.75v-2.625c0-1.036-.84-1.875-1.875-1.875h-.739a6.706 6.706 0 0 1-1.112-3.173 6.73 6.73 0 0 0 2.743-1.347 6.753 6.753 0 0 0 6.139-5.6.75.75 0 0 0-.585-.858 47.077 47.077 0 0 0-3.07-.543V2.62a.75.75 0 0 0-.658-.744 49.22 49.22 0 0 0-6.093-.377c-2.063 0-4.096.128-6.093.377a.75.75 0 0 0-.657.744Zm0 2.629c0 1.196.312 2.32.857 3.294A5.266 5.266 0 0 1 3.16 5.337a45.6 45.6 0 0 1 2.006-.343v.256Zm13.5 0v-.256c.674.1 1.343.214 2.006.343a5.265 5.265 0 0 1-2.863 3.207 6.72 6.72 0 0 0 .857-3.294Z"
												clip-rule="evenodd"
											/>
										</svg>
									</div>
								</div>
							</div>
						{/if}
					{:else if $profileMenuStore.tab === 'quests'}
						<p class="text-center opacity-50">Coming soon...</p>
					{/if}
				</div>
			</div>
		</div>
	</div>

	{#if $streakModalStore.opened}
		<div
			style="opacity: 100%; pointer-events: auto;"
			class="z-[200] modal modal-bottom sm:modal-middle"
		>
			<div class="modal-box">
				<h3 class="font-bold text-lg">Streaks</h3>
				<p class="py-4 text-primary">
					Rewrite at least one page every day, and increase your streak by one point each time. High
					streaks show dedication and give profile badges.
				</p>

				<div class="grid grid-cols-7 gap-4 sm:gap-8">
					{#each [-3, -2, -1, 0, 1, 2, 3] as day}
						<div class="col-span-1">
							<div
								class={`${day === 0 ? 'opacity-100' : 'opacity-0'} w-full justify-center flex my-2`}
							>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									fill="none"
									viewBox="0 0 24 24"
									stroke-width="1.5"
									stroke="currentColor"
									class="w-5 h-5"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										d="m4.5 5.25 7.5 7.5 7.5-7.5m-15 6 7.5 7.5 7.5-7.5"
									/>
								</svg>
							</div>

							{#if hasStreakOnDate(data.profile.lastStreakDate, data.profile.streak, day)}
								<div class="avatar placeholder w-full">
									<div class="border-2 border-base-content bg-base-content rounded-full w-full p-1">
										<svg
											xmlns="http://www.w3.org/2000/svg"
											viewBox="0 0 24 24"
											fill="currentColor"
											class="w-full text-base-100"
										>
											<path
												fill-rule="evenodd"
												d="M12.963 2.286a.75.75 0 0 0-1.071-.136 9.742 9.742 0 0 0-3.539 6.176 7.547 7.547 0 0 1-1.705-1.715.75.75 0 0 0-1.152-.082A9 9 0 1 0 15.68 4.534a7.46 7.46 0 0 1-2.717-2.248ZM15.75 14.25a3.75 3.75 0 1 1-7.313-1.172c.628.465 1.35.81 2.133 1a5.99 5.99 0 0 1 1.925-3.546 3.75 3.75 0 0 1 3.255 3.718Z"
												clip-rule="evenodd"
											/>
										</svg>
									</div>
								</div>
							{:else}
								<div class="avatar placeholder w-full">
									<div
										class="border-2 border-dashed border-neutral text-neutral-content rounded-full w-full"
									></div>
								</div>
							{/if}

							<p class="text-md font-bold text-center mt-1">
								{dateToDayName(getRelativeDate(day))}
							</p>
						</div>
					{/each}
				</div>

				<div class="stats shadow w-full">
					<div class="stat pl-0">
						<div class="stat-title text-center">Current streak</div>
						<div class="stat-value text-center">{data.profile.streak}</div>
					</div>
				</div>

				<div class="divider m-0"></div>

				<div class="stats shadow w-full">
					<div class="stat pl-0 w-full">
						<div class="stat-title">Total day</div>
						<div class="stat-value">{data.profile.totalStreak}</div>
					</div>

					<div class="stat float-right text-right pr-0 w-full">
						<div class="stat-title">Longest streak</div>
						<div class="stat-value">{data.profile.maxStreak}</div>
					</div>
				</div>

				{#if !hasStreak(data.profile.lastStreakDate)}
					<div role="alert" class="alert alert-error mt-4">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="stroke-current shrink-0 h-6 w-6"
							fill="none"
							viewBox="0 0 24 24"
							><path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
							/></svg
						>
						<span
							>You haven't completed streak today Rewrite a page to increase your streak by 1 point.</span
						>
					</div>
				{:else}
					<div role="alert" class="alert mt-4">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							fill="none"
							viewBox="0 0 24 24"
							class="stroke-info shrink-0 w-6 h-6"
							><path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
							></path></svg
						>
						<span class="text-primary">You have completed streak today. Come back tomorrow.</span>
					</div>
				{/if}

				<div class="modal-action">
					<button on:click={() => ($streakModalStore.opened = false)} class="btn">Close</button>
				</div>
			</div>
		</div>
	{/if}

	{#if $levelModalStore.opened}
		<div
			style="opacity: 100%; pointer-events: auto;"
			class="z-[200] modal modal-bottom sm:modal-middle"
		>
			<div class="modal-box">
				<h3 class="font-bold text-lg">Level</h3>
				<p class="py-4 text-primary">
					Earn points for each rewritten letter and level up. There are rewards at specific level
					minestones.
				</p>

				<div class="stats shadow w-full">
					<div class="stat pl-0">
						<div class="stat-title">Current level</div>
						<div class="stat-value">{getLevel(data.profile.xp)}</div>
						<div class="stat-desc">and {getExtraXp(data.profile.xp)} points</div>
					</div>

					<div class="stat float-right text-right pr-0">
						<div class="stat-title">Remaining points</div>
						<div class="stat-value">{getXpRemaining(data.profile.xp)}</div>
						<div class="stat-desc">to reach level {getLevel(data.profile.xp) + 1}</div>
					</div>
				</div>

				<progress class="progress w-full" value={getLevelProgress(data.profile.xp)} max={100}
				></progress>

				<div class="modal-action">
					<a
						on:click={() => ($levelModalStore.opened = false)}
						href="/app/unlocks"
						class="btn btn-primary">Show unlocks</a
					>

					<button on:click={() => ($levelModalStore.opened = false)} class="btn">Close</button>
				</div>
			</div>
		</div>
	{/if}
{/if}
