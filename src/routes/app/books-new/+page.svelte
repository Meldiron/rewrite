<script lang="ts">
	import { databases, storage } from '$lib/appwrite';
	import type { PageData } from './$types';
	import { functions } from '$lib/appwrite';
	import { ID } from 'appwrite';
	import { goto, invalidateAll } from '$app/navigation';
	import { toastStore } from '$lib/stores';

	export let data: PageData;

	let submitting = false;
	let files: any = null;
	let fileId = '';

	async function getBookDocument(id: string, executionId: string) {
		try {
			const execution = await functions.getExecution('addBook', executionId);

			if (execution.status === 'failed') {
				$toastStore = { type: 'error', text: 'Unexpected error. Please ensure you have tokens.' };
				return null;
			}

			return await databases.getDocument('main', 'books', id);
		} catch (err) {
			await new Promise((resolve, reject) => {
				setTimeout(() => {
					resolve(true);
				}, 1000);
			});
			return await getBookDocument(id, executionId);
		}
	}

	async function onSubmit() {
		if (submitting) return;

		if (data.tokens?.balance === 0) {
			$toastStore = { type: 'error', text: "You don't have any tokens." };
			return;
		}

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

			$toastStore = { type: 'info', text: 'Please wait...' };

			const execution = await functions.createExecution('addBook', submitId, true);

			const awaited = await getBookDocument(submitId, execution.$id);

			if (!awaited) {
				return;
			}

			$toastStore = { type: 'success', text: 'Book added.' };

			await invalidateAll();
			await goto('/app/books?type=private');
		} catch (err: any) {
			$toastStore = err.message || err || 'An error occurred';
		} finally {
			submitting = false;
		}
	}

	let submittingLicense = false;
	let licenseKey = '';

	async function onActivate() {
		if (submittingLicense) return;

		submittingLicense = true;

		try {
			$toastStore = { type: 'info', text: 'Activating key...' };

			const response = await functions.createExecution(
				'api',
				licenseKey,
				false,
				'/v1/tokens',
				'POST'
			);

			$toastStore = {
				type: response.responseStatusCode === 200 ? 'success' : 'error',
				text: response.responseBody
			};

			await invalidateAll();
		} catch (err: any) {
			$toastStore = err.message || err || 'An error occurred';
		} finally {
			submittingLicense = false;
		}
	}
</script>

<div class="max-w-2xl mx-auto">
	<div class="card w-full bg-base-100 shadow-xl">
		<form on:submit|preventDefault={onSubmit} class="card-body">
			<h2 class="card-title">Add a book</h2>

			<p class="text-primary">
				Submit .EPUB or .PDF file and rewrite your book or document. After upload, please wait for
				up to 15 minutes for book to be ready. Contact us if book isn't ready within 1 hour.
			</p>

			<label class="form-control w-full">
				<div class="label">
					<span class="label-text">Pick .epub or .pdf file</span>
				</div>
				<input
					bind:files
					required={true}
					type="file"
					accept=".epub,.pdf"
					class="file-input file-input-bordered w-full"
				/>
			</label>

			<!-- <div class="divider">OR</div>

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
			</label> -->

			<button type="submit" class="mt-3 btn btn-primary btn-block" disabled={submitting}
				>Submit for 1 token</button
			>

			<p class="text-center text-sm mt-4 font-bold">
				You have <span class="text-lg font-extrabold">{data.tokens?.balance ?? 0}</span>
				{(data.tokens?.balance ?? 0) === 1 ? 'token' : 'tokens'}
			</p>
		</form>
	</div>

	<div class="mt-4 flex flex-col gap-4">
		<div class="collapse collapse-arrow bg-base-100">
			<input type="radio" name="my-accordion-2" checked={true} />
			<div class="collapse-title text-xl font-medium">What are tokens?</div>
			<div class="collapse-content">
				<p class="text-primary">
					When preparing e-book for rewritting, we use external technologies which are not free. To
					cover the costs, we use tokens. Each token allows you to upload 1 e-book.
				</p>
			</div>
		</div>
		<div class="collapse collapse-arrow bg-base-100">
			<input type="radio" name="my-accordion-2" />
			<div class="collapse-title text-xl font-medium">How do I get tokens?</div>
			<div class="collapse-content">
				<p class="text-primary">
					To purchase tokens, visit <a
						href="https://rewrite.lemonsqueezy.com/buy/1e49884c-71ad-439b-a967-48ebc8da8d33"
						class="text-primary underline"
						target="_blank">Rewrite store</a
					>. We offer multiple variants to make it cheaper when purchasing larger package. After
					payment, you will recieve a key.
				</p>
			</div>
		</div>
		<div class="collapse collapse-arrow bg-base-100">
			<input type="radio" name="my-accordion-2" />
			<div class="collapse-title text-xl font-medium">How do I activate key?</div>
			<div class="collapse-content">
				<p class="text-primary">
					After the payment, you will be given license key. You also recieve email recipe which
					includes this key, in case you left the website after payment by mistake.
				</p>
				<p>A key can be activated one-time below, to gain the tokens.</p>

				<form on:submit|preventDefault={onActivate} class="card-body">
					<label class="form-control w-full">
						<div class="label">
							<span class="label-text">Enter license key</span>
						</div>
						<input
							bind:value={licenseKey}
							type="text"
							required={true}
							placeholder="XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
							class="input input-bordered w-full"
						/>
					</label>

					<button type="submit" class="mt-3 btn btn-primary btn-block" disabled={submittingLicense}
						>Activate</button
					>

					<p class="text-center text-sm mt-4 font-bold">
						You have <span class="text-lg font-extrabold">{data.tokens?.balance ?? 0}</span>
						{(data.tokens?.balance ?? 0) === 1 ? 'token' : 'tokens'}
					</p>
				</form>
			</div>
		</div>
		<div class="collapse collapse-arrow bg-base-100">
			<input type="radio" name="my-accordion-2" />
			<div class="collapse-title text-xl font-medium">What if I cannot afford it?</div>
			<div class="collapse-content">
				<p class="text-primary">
					Our goal with tokens isn't to make a profit, instead, to cover expenses to keep Rewrite
					running. If your situation doesn't allow you to purchase tokens and you are vividly
					looking forward using Rewrite with your own books, please contact me at
					matejbaco2000@gmail.com. We are open to making exceptions.
				</p>
			</div>
		</div>
	</div>
</div>
