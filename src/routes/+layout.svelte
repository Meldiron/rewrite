<script lang="ts">
	import { goto, invalidate, invalidateAll } from '$app/navigation';
	import { account } from '$lib/appwrite';
	import { toastStore } from '$lib/stores';
	import '../app.css';
	import type { PageData } from './$types';

	export let data: PageData;

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
		<a href="/leaderboard" class="btn btn-ghost btn-circle">
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
					d="M16.5 18.75h-9m9 0a3 3 0 0 1 3 3h-15a3 3 0 0 1 3-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 0 1-.982-3.172M9.497 14.25a7.454 7.454 0 0 0 .981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 0 0 7.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 0 0 2.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 0 1 2.916.52 6.003 6.003 0 0 1-5.395 4.972m0 0a6.726 6.726 0 0 1-2.749 1.35m0 0a6.772 6.772 0 0 1-3.044 0"
				/>
			</svg>
		</a>

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
