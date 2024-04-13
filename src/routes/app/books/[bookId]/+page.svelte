<script lang="ts">
	import type { PageData } from './$types';

	export let data: PageData;
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
					{#each data.pages.documents as page}
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
										class="btn btn-sm btn-active btn-ghost">Rewrite page</a
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
