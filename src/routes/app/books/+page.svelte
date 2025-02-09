<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { databases, functions, getFilePreview, storage } from '$lib/appwrite';
	import { profileMenuStore, toastStore } from '$lib/stores';
	import { ExecutionMethod, Query } from 'appwrite';
	import type { PageData } from './$types';
	import debounce from 'lodash/debounce';
	import { formatNumber, getLevel } from '$lib/utils';

	export let data: PageData;

	let hasMore = data.books.documents.length < data.books.total;

	function getFinishes(bookId: string) {
		const finishes = data.finishes.documents.find((f) => f.bookId === bookId);
		return finishes ? finishes.pageNumbers.length : 0;
	}

	let submitting = false;
	async function pinBook(bookId: string) {
		if (submitting) return;

		submitting = true;

		try {
			if (data.profile.pinnedBooks.includes(bookId)) {
				data.profile.pinnedBooks = data.profile.pinnedBooks.filter((id: any) => id !== bookId);
			} else {
				data.profile.pinnedBooks.push(bookId);
			}

			await databases.updateDocument('main', 'profiles', data.profile.$id, {
				pinnedBooks: data.profile.pinnedBooks
			});
			await invalidateAll();
			$toastStore = null;
		} catch (err: any) {
			$toastStore = err.message || err || 'An error occurred';
		} finally {
			submitting = false;
		}
	}

	let submittingLoadMore = false;
	async function loadMore() {
		if (submittingLoadMore) return;

		submittingLoadMore = true;

		try {
			const lastDocId = data.books.documents[data.books.documents.length - 1].$id;
			const nextPage = await databases.listDocuments('main', 'books', [
				Query.cursorAfter(lastDocId),
				Query.limit(data.perPage),
				Query.equal('isPublic', data.isPublic)
			]);

			data.books.documents = [...data.books.documents, ...nextPage.documents];
			data.books.total = nextPage.total;
			hasMore = data.books.documents.length < data.books.total;

			if (nextPage.documents.length <= 0) {
				hasMore = false;
			}

			$toastStore = null;
		} catch (err: any) {
			$toastStore = err.message || err || 'An error occurred';
		} finally {
			submittingLoadMore = false;
		}
	}

	function getNextPage(bookId: string) {
		let nextPage = 1;

		const finishes = data.finishes.documents.find((f) => f.bookId === bookId);

		if (finishes && finishes.pageNumbers.length > 0) {
			nextPage = finishes.pageNumbers[0];
			finishes.pageNumbers.forEach((p: any) => {
				if (p > (nextPage ?? 0)) {
					nextPage = p;
				}
			});

			nextPage = (nextPage ?? 0) + 1;
		}

		return nextPage;
	}

	const handleSearch = debounce((e: any) => {
		goto(`/app/books/?type=${data.isPublic ? 'public' : 'private'}&search=${e.target.value}`);
	}, 200);

	let edittingSubitting = false;
	let edittingId = '';
	let edittingTitle = '';

	async function saveEditingBook() {
		if (edittingSubitting) {
			return;
		}

		edittingSubitting = true;

		try {
			const response = await functions.createExecution(
				'api',
				JSON.stringify({
					title: edittingTitle
				}),
				false,
				`/v1/books/${edittingId}/metadata`,
				ExecutionMethod.PUT
			);

			$toastStore = {
				type: response.responseStatusCode === 200 ? 'success' : 'error',
				text: response.responseBody
			};

			edittingTitle = '';
			edittingId = '';

			await invalidateAll();
		} catch (err: any) {
			$toastStore = err.message || err || 'An error occurred';
		} finally {
			edittingSubitting = false;
		}
	}
</script>

<div class="max-w-2xl mx-auto">
	<div class="flex flex-col sm:flex-row gap-1 justify-between w-full items-center">
		<h1 class="text-4xl font-semibold my-8">
			<span>{data.isPublic ? 'Public Library' : 'Custom Library'}</span><span
				class=" animate-cursor text-primary">_</span
			>
		</h1>
		{#if !data.isPublic}
			<a href="/app/books-new" class="btn btn-outline">Add EPUB/PDF</a>
		{/if}
	</div>

	{#if data.books.documents.length > 0 || data.search}
		<label class="input input-bordered flex items-center gap-2 mb-4 mt-4">
			<input
				value={data.search}
				on:input={handleSearch}
				type="text"
				class="grow"
				placeholder="Search"
			/>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				viewBox="0 0 16 16"
				fill="currentColor"
				class="w-4 h-4 opacity-70"
				><path
					fill-rule="evenodd"
					d="M9.965 11.026a5 5 0 1 1 1.06-1.06l2.755 2.754a.75.75 0 1 1-1.06 1.06l-2.755-2.754ZM10.5 7a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0Z"
					clip-rule="evenodd"
				/></svg
			>
		</label>
	{/if}

	<div class="flex flex-col gap-6">
		{#if data.books.documents.length <= 0}
			<div role="alert" class="alert alert-error">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					fill="none"
					viewBox="0 0 24 24"
					class="stroke-current shrink-0 w-6 h-6"
					><path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
					></path></svg
				>
				<span>No books found.</span>
			</div>
		{/if}
		{#each data.books.documents as book}
			{#if !book.ready}
				<div role="alert" class="alert bg-base-100">
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
					<span class="text-info"
						><b class="font-semibold">{book.title}</b> is being processed. Please wait. It usually takes
						1 minutes per 50 pages of e-book.</span
					>
				</div>
			{:else}
				<div class="indicator w-full">
					{#if getFinishes(book.$id) === book.pages}
						<span
							style="width: fit-content;"
							class="indicator-item indicator-top md:indicator-top md:indicator-end indicator-center text-success p-2 bg-success-content rounded-full border border-success"
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								viewBox="0 0 24 24"
								fill="currentColor"
								class="w-4 h-4"
							>
								<path
									fill-rule="evenodd"
									d="M19.916 4.626a.75.75 0 0 1 .208 1.04l-9 13.5a.75.75 0 0 1-1.154.114l-6-6a.75.75 0 0 1 1.06-1.06l5.353 5.353 8.493-12.74a.75.75 0 0 1 1.04-.207Z"
									clip-rule="evenodd"
								/>
							</svg>
						</span>
					{/if}

					<div
						class={`w-full card lg:card-side bg-base-100 shadow-xl ${getFinishes(book.$id) === book.pages ? 'border border-success !bg-success-content' : ''} ${data.profile.pinnedBooks.includes(book.$id) ? 'border border-base-content' : ''}`}
					>
						<figure>
							<a href={`/app/books/${book.$id}`}>
								<div class="w-full aspect-[3/4] !w-[250px]">
									<img
										class="object-cover w-full h-full object-contain transform transition duration-300 scale-[100%] hover:scale-[110%]"
										src={storage.getFileView('pages', `${book.$id}-1`).toString()}
										alt="Book"
									/>
								</div>
							</a>
						</figure>
						<div class="card-body">
							<p class="text-content font-light text-xs uppercase -mt-2 tracking-widest">
								{formatNumber(getFinishes(book.$id))} / {formatNumber(book.pages)}
							</p>
							<progress class="progress w-full mb-2" value={getFinishes(book.$id)} max={book.pages}
							></progress>

							{#if edittingId !== book.$id}
								<h2 class="card-title text-primary">{book.title}</h2>
							{:else}
								<input
									disabled={edittingSubitting}
									bind:value={edittingTitle}
									type="text"
									placeholder="Book title"
									class="input input-bordered w-full input-lg"
								/>
							{/if}
							<div class="h-full">
								{#if edittingId !== book.$id}
									<button
										disabled={edittingSubitting}
										on:click={() => {
											edittingTitle = book.title;
											edittingId = book.$id;
										}}
										class="btn btn-content btn-ghost btn-active btn-sm"
									>
										<svg
											xmlns="http://www.w3.org/2000/svg"
											fill="none"
											viewBox="0 0 24 24"
											stroke-width="1.5"
											stroke="currentColor"
											class="w-4 h-4"
										>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125"
											/>
										</svg>
									</button>
								{:else}
									<button
										disabled={edittingSubitting}
										on:click={() => {
											edittingTitle = '';
											edittingId = '';
										}}
										class="btn btn-content btn-ghost btn-sm"
									>
										<svg
											xmlns="http://www.w3.org/2000/svg"
											fill="none"
											viewBox="0 0 24 24"
											stroke-width="1.5"
											stroke="currentColor"
											class="w-4 h-4"
										>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												d="M6 18 18 6M6 6l12 12"
											/>
										</svg>
									</button>
									<button
										on:click={saveEditingBook}
										class="btn btn-content btn-ghost btn-active btn-sm"
									>
										<svg
											xmlns="http://www.w3.org/2000/svg"
											fill="none"
											viewBox="0 0 24 24"
											stroke-width="1.5"
											stroke="currentColor"
											class="w-4 h-4"
										>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												d="m4.5 12.75 6 6 9-13.5"
											/>
										</svg>
									</button>
								{/if}
							</div>
							<div class="card-actions justify-end">
								<button
									on:click={() => pinBook(book.$id)}
									disabled={submitting}
									class="btn btn-primary btn-ghost"
								>
									{#if data.profile.pinnedBooks.includes(book.$id)}
										<svg
											xmlns="http://www.w3.org/2000/svg"
											viewBox="0 0 24 24"
											fill="currentColor"
											class="w-6 h-6"
										>
											<path
												fill-rule="evenodd"
												d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.006 5.404.434c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.434 2.082-5.005Z"
												clip-rule="evenodd"
											/>
										</svg>
									{:else}
										<svg
											xmlns="http://www.w3.org/2000/svg"
											fill="none"
											viewBox="0 0 24 24"
											stroke-width="1.5"
											stroke="currentColor"
											class="w-6 h-6"
										>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z"
											/>
										</svg>
									{/if}
								</button>

								<a href={`/app/books/${book.$id}`} class="btn btn-primary btn-ghost">All pages</a>
								{#if getFinishes(book.$id) !== book.pages}
									<a
										href={`/app/books/${book.$id}/${getNextPage(book.$id)}`}
										class="btn btn-primary">Open page {formatNumber(getNextPage(book.$id))}</a
									>
								{/if}
							</div>
						</div>
					</div>
				</div>
			{/if}
		{/each}
		{#if hasMore}
			<button disabled={submittingLoadMore} on:click={loadMore} class="btn btn-outline"
				>Load more</button
			>
		{/if}

		{#if data.isPublic}
			<div role="alert" class="alert alert-info shadow-lg">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					fill="none"
					viewBox="0 0 24 24"
					stroke-width="1.5"
					stroke="currentColor"
					class="w-6 h-6"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z"
					/>
				</svg>
				<div>
					<h3 class="font-bold">
						Public library content is provided by <a
							href="https://english-e-reader.net/"
							target="_blank"
							class="underline">English e-Reader</a
						>
					</h3>
					<div class="text-xs">
						If a book needs to be removed for licencing reasons, please contact me:
						contact@almostapps.eu
					</div>
				</div>
			</div>
		{/if}
	</div>
</div>
