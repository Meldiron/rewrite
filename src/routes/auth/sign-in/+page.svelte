<script lang="ts">
	import { invalidateAll, goto } from '$app/navigation';
	import { account } from '$lib/appwrite';
	import { toastStore } from '$lib/stores';

	let password = '';
	let email = '';

	let submitting = false;

	async function onSubmit() {
		if (submitting) return;

		submitting = true;

		try {
			await account.createEmailSession(email, password);
			await invalidateAll();
			await goto('/app');
			$toastStore = null;
		} catch (err: any) {
			$toastStore = err.message || err || 'An error occurred';
		} finally {
			submitting = false;
		}
	}
</script>

<div class="w-full flex justify-center">
	<div>
		<div role="alert" class="alert alert-warning mb-4 w-96">
			<svg
				xmlns="http://www.w3.org/2000/svg"
				class="stroke-current shrink-0 h-6 w-6"
				fill="none"
				viewBox="0 0 24 24"
				><path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
				/></svg
			>
			<span>Registrations are closed. App is currently in closed beta testing.</span>
		</div>

		<div class="card w-96 bg-base-100 shadow-xl">
			<form on:submit|preventDefault={onSubmit} class="card-body">
				<h2 class="card-title">Sign into your account</h2>

				<label class="form-control w-full max-w-xs">
					<div class="label">
						<span class="label-text">E-mail</span>
					</div>
					<input
						bind:value={email}
						type="email"
						required={true}
						placeholder="my@email.com"
						class="input input-bordered w-full max-w-xs"
					/>
				</label>

				<label class="form-control w-full max-w-xs">
					<div class="label">
						<span class="label-text">Password</span>
					</div>
					<input
						bind:value={password}
						type="password"
						required={true}
						placeholder="********"
						class="input input-bordered w-full max-w-xs"
					/>
				</label>

				<button type="submit" class="mt-3 btn btn-primary btn-block" disabled={submitting}
					>Sign In</button
				>
			</form>
		</div>
	</div>
</div>
