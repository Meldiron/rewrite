<script lang="ts">
	import type { PageData } from './$types';

	export let data: PageData;

	$: tableDocuments = data.pages.documents.filter((page: any) => {
		if (hideCompleted) {
			return !data.finishedPageNumbers.includes(page.page);
		}

		return true;
	});

	let hideCompleted = true;

	let nextPage: number | null = null;

	$: {
		if (data.finishedPageNumbers.length === 0) {
			nextPage = null;
		} else if (data.finishedPageNumbers.length >= data.pages.total) {
			nextPage = -1;
		} else {
			nextPage = data.finishedPageNumbers[0];
			data.finishedPageNumbers.forEach((p: any) => {
				if (p > (nextPage ?? 0)) {
					nextPage = p;
				}
			});

			nextPage = (nextPage ?? 0) + 1;
		}
	}
</script>

<div class="max-w-2xl mx-auto">
	<div class="divider"><a href="/app/books" class="hover:underline">Books</a></div>
	<h1 class="text-4xl font-semibold text-primary text-center my-8">
		<span>{data.book.title}</span>
	</h1>

	<p class="text-center mb-6">
		Completed {data.finishedPageNumbers.length} / {data.pages.total} pages
	</p>

	<div class="divider"></div>

	<h1 class="text-4xl font-semibold my-8">
		<span>Pages</span><span class=" animate-cursor text-primary">_</span>
	</h1>

	<div class="mb-4 flex justify-between items-center gap-4">
		{#if nextPage === null}
			<a href={`/app/books/${data.book.$id}/1`} class="btn btn-primary">
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
						d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z"
					/>
				</svg>
				Start rewiting
			</a>
		{:else if nextPage > 0}
			<a href={`/app/books/${data.book.$id}/${nextPage}`} class="btn btn-primary">
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
						d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z"
					/>
				</svg>
				Continue page {nextPage}
			</a>
		{/if}
		<div class="form-control">
			<label class="label cursor-pointer">
				<span class="label-text text-primary mr-4">Hide completed ({data.finishedPageNumbers.length})</span>
				<input type="checkbox" class="toggle" bind:checked={hideCompleted} />
			</label>
		</div>
	</div>

	<div class="card bg-base-100 shadow-xl p-3">
		<div class="overflow-x-auto">
			<table class="table table-zebra table-lg">
				<thead>
					<tr>
						<th class="font-bold">Page</th>
						<td>Length</td>
						<td>Completed</td>
						<th></th>
					</tr>
				</thead>
				<tbody>
					{#each tableDocuments as page}
						<tr>
							<th class="font-bold">{page.page}</th>
							<td>{page.words ?? 0} words</td>
							<td>
								{#if data.finishedPageNumbers.includes(page.page)}
									<div class="badge">Yes</div>
								{:else}
									<div class="badge badge-error">No</div>
								{/if}
							</td>
							<td class="float-right">
								{#if !data.finishedPageNumbers.includes(page.page)}<a
										href={`/app/books/${data.book.$id}/${page.page}`}
										class={`btn btn-sm btn-ghost ${page.page === nextPage ? 'btn-active' : ''}`}>Rewrite page</a
									>
								{:else}
									<a href={`/app/books/${data.book.$id}/${page.page}`} class="btn btn-sm btn-ghost"
										>View page</a
									>
								{/if}</td
							>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>
</div>
