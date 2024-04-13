<script lang="ts">
	import { storage } from '$lib/appwrite';
	import type { PageData } from './$types';

	export let data: PageData;
</script>

<div class="max-w-2xl mx-auto">
	<h1 class="text-4xl font-semibold my-8">
		<span>Books</span><span class=" animate-cursor text-primary">_</span>
	</h1>

	<div class="flex flex-col gap-6">
		{#if data.books.documents.length <= 0}
			<div role="alert" class="alert alert-info">
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
				<span>No books found. Let's add some!</span>
			</div>
		{/if}
		{#each data.books.documents as book}
			{#if !book.ready}
			<div role="alert" class="alert bg-base-100">
				<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="stroke-info shrink-0 w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
				<span class="text-info"><b class="font-semibold">{book.title}</b> is being processed. Please wait. It usually takes 2 minutes per 100 pages of e-book.</span>
			  </div>
			{:else}
			<div class="card lg:card-side bg-base-100 shadow-xl">
				<figure>
					<div class="w-full aspect-[3/4] !w-[250px]">
						<img
							class="object-cover w-full h-full object-contain transform transition duration-300 scale-[100%] hover:scale-[110%]"
							src={storage.getFilePreview(
								'pages',
								`${book.$id}-1`,
								1280,
								undefined,
								undefined,
								undefined,
								undefined,
								undefined,
								undefined,
								undefined,
								undefined,
								undefined,
								'webp'
							).toString()}
							alt="Book"
						/>
					</div>
				</figure>
				<div class="card-body">
					<h2 class="card-title text-primary">{book.title}</h2>
					<div class="h-full">
						<p class="text-semibold">{book.author}</p>
						<p class="mt-2 text-sm opacity-50">{book.publisher}</p>
					</div>
					<div class="card-actions justify-end">
						<a href={`/app/books/${book.$id}`} class="btn btn-primary">Rewrite book</a>
					</div>
				</div>
			</div>
			{/if}
		{/each}

		<a href="/app/books-new" class="btn btn-outline btn-block">Add EPUB book</a>
	</div>
</div>
