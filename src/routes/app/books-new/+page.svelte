<script lang="ts">
	import { databases, storage } from '$lib/appwrite';
	import type { PageData } from './$types';
	import { functions } from '$lib/appwrite';
	import { ID } from 'appwrite';
	import { goto, invalidateAll } from '$app/navigation';
	import { toastStore } from '$lib/stores';

	let submitting = false;
	let files: any = null;
	let fileId = '';

	async function getBookDocument(id: string) {
		try {
			return await databases.getDocument('main', 'books', id);
		} catch (err) {
			await new Promise((resolve, reject) => {
				setTimeout(() => {
					resolve(true);
				}, 1000);
			});
			return await getBookDocument(id);
		}
	}

	async function onSubmit() {
		if (submitting) return;

		submitting = true;

		try {
			let submitId = '';
			if (fileId) {
				submitId = fileId;
			} else {
				$toastStore = { type: 'info', text: 'Uploading book...' };
				const storageBook = await storage.createFile('books', ID.unique(), files[0]);
				submitId = storageBook.$id;
			}

			$toastStore = { type: 'info', text: 'Getting book details...' };

			await functions.createExecution('addBook', submitId, true);

			await getBookDocument(submitId);

			$toastStore = { type: 'success', text: 'Book added.' };

			await invalidateAll();
			await goto('/app/books');
		} catch (err: any) {
			$toastStore = err.message || err || 'An error occurred';
		} finally {
			submitting = false;
		}
	}
</script>

<div class="max-w-96 mx-auto">
	<div class="card w-96 bg-base-100 shadow-xl">
		<form on:submit|preventDefault={onSubmit} class="card-body">
			<h2 class="card-title">Add a book</h2>

			<label class="form-control w-full">
				<div class="label">
					<span class="label-text">Pick .epub file</span>
				</div>
				<input bind:files type="file" class="file-input file-input-bordered w-full" />
			</label>

			<div class="divider">OR</div>

			<label class="form-control w-full max-w-xs">
				<div class="label">
					<span class="label-text">Enter file ID</span>
				</div>
				<input
					bind:value={fileId}
					type="text"
					placeholder="File ID"
					class="input input-bordered w-full max-w-xs"
				/>
			</label>

			<button type="submit" class="mt-3 btn btn-primary btn-block" disabled={submitting}
				>Submit</button
			>
		</form>
	</div>
</div>
