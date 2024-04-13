<script lang="ts">
	import { goto, invalidate, invalidateAll } from '$app/navigation';
	import { account } from '$lib/appwrite';
	import { toastStore } from '$lib/stores';
	import { hasStreak } from '$lib/utils';
	import '../app.css';
	import type { PageData } from './$types';

	export let data: PageData;

	let streakModal: HTMLDialogElement;
	let leftMenu: HTMLInputElement;
	let userMenu: HTMLInputElement;
	let activeUserTab = 'settings';

	let isSigningOut = false;

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
			userMenu.checked = false;
		}
	}

	function getToastClasses(type: string) {
		if (type === 'success') {
			return 'alert-success bg-success-content border-success-content text-success';
		}

		return 'alert-base-100 bg-base-100 border-base-100 text-primary';
	}
</script>

<div class="navbar bg-base-100">
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
				on:click={() => streakModal.showModal()}
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
	<!-- <nav class="grid grid-flow-col gap-4">
		<a class="link link-hover">Legal stuff</a>
		<a class="link link-hover">Other legal stuff</a>
		<a class="link link-hover">More legal stuff</a>
	</nav> -->
	<aside class="text-secondary-content">
		<p>Copyright © 2024 - All right reserved by Almost Apps</p>
	</aside>
</footer>

<div class="dropdown">
	<div class="drawer">
		<input bind:this={leftMenu} id="left-menu" type="checkbox" class="drawer-toggle" />
		<div class="drawer-content"></div>
		<div class="drawer-side">
			<label for="left-menu" aria-label="close sidebar" class="drawer-overlay"></label>
			<ul class="menu p-4 w-80 min-h-full bg-base-200 text-base-content gap-2">
				<li>
					<a class="p-3" href="/" on:click={() => (leftMenu.checked = false)}>
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
					<a class="p-3" href="/app/books" on:click={() => (leftMenu.checked = false)}>
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

						Books
					</a>
				</li>
			</ul>
		</div>
	</div>
</div>

<div class="drawer drawer-end">
	<input bind:this={userMenu} id="user-menu" type="checkbox" class="drawer-toggle" />
	<div class="drawer-content"></div>
	<div class="drawer-side">
		<label for="user-menu" aria-label="close sidebar" class="drawer-overlay"></label>
		<div class="p-4 w-80 min-h-full bg-base-200 text-base-content">
			<div role="tablist" class="tabs tabs-bordered">
				<button
					role="tab"
					on:click={() => (activeUserTab = 'stats')}
					class={`tab ${activeUserTab === 'stats' ? 'tab-active' : ''}`}>Stats</button
				>
				<button
					role="tab"
					on:click={() => (activeUserTab = 'quests')}
					class={`tab ${activeUserTab === 'quests' ? 'tab-active' : ''}`}>Quests</button
				>
				<button
					role="tab"
					on:click={() => (activeUserTab = 'settings')}
					class={`tab ${activeUserTab === 'settings' ? 'tab-active' : ''}`}>Settings</button
				>
			</div>
			<div class="mt-4">
				{#if activeUserTab === 'settings'}
					<button on:click={signOut} disabled={isSigningOut} class="btn btn-active btn-block"
						>Sign out</button
					>
				{:else if activeUserTab === 'stats'}
					<div class="divider">Stats</div>
				{:else if activeUserTab === 'quests'}
					<div class="divider">Quests</div>
				{/if}
			</div>
		</div>
	</div>
</div>

{#if $toastStore !== null}
	<div class="toast toast-end">
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

<dialog bind:this={streakModal} id="streak-modal" class="modal modal-bottom sm:modal-middle">
	<div class="modal-box">
		<h3 class="font-bold text-lg">Streaks</h3>
		<p class="py-4">
			Rewrite at least one page every day, and increase your streak by one point each time. High
			streaks show dedication and give profile badges.
		</p>
		<p>
			Your current streak is: <span class="text-xl font-bold">{data.profile.streak}</span>
		</p>

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
			<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="stroke-info shrink-0 w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
			<span>You have completed streak today. Come back tomorrow.</span>
		  </div>
		{/if}

		<div class="modal-action">
			<form method="dialog">
				<button class="btn">Close</button>
			</form>
		</div>
	</div>
</dialog>
