<script lang="ts">
	import { account } from '$lib/appwrite';
	import { toastStore } from '$lib/stores';

	let email = '';
	let finished = false;

	let submitting = false;

	async function onSubmit() {
		if (submitting) return;

		submitting = true;

		try {
			await account.createMagicURLSession(
				'unique()',
				email,
				window.location.origin + '/auth/sign-in-finish'
			);
			finished = true;
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
		<div class="card w-96 bg-base-100 shadow-xl">
			{#if !finished}
				<form on:submit|preventDefault={onSubmit} class="card-body">
					<h2 class="card-title">Sign into your account</h2>

					<p class="text-primary">
						If you don't have account yet, enter email below to create one.
					</p>

					<label class="form-control w-full max-w-xs mt-3">
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

					<button type="submit" class="mt-3 btn btn-primary btn-block" disabled={submitting}>
						Sign in with E-mail
					</button>
				</form>
			{:else}
				<div class="card-body">
					<h2 class="card-title">Sign into your account</h2>

					<p class="text-primary">
						Please check your e-mail inbox, we sent you an email to finish sign-in process.
					</p>
					<kbd class="kbd">{email}</kbd>

					<button
						on:click={() => {
							email = '';
							finished = false;
						}}>Try different e-mail</button
					>
				</div>
			{/if}
		</div>
	</div>
</div>
