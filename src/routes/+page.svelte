<script lang="ts">
	import type { PageData } from './$types';

	export let data: PageData;
</script>

<div class="hero min-h-screen bg-base-200">
	<div class="hero-content text-center">
		<div class="max-w-md">
			<h1 class="text-5xl font-bold">Rewrite books</h1>
			<p class="py-6 text-primary">
				Practice typing skills and speed by rewriting books as you read them. Use your own books for
				learning or entertainment.
			</p>
			<div class="flex flex-col sm:flex-row gap-4 w-full justify-center">
				{#if data.user === null}
					<a href="https://auth.rewrite.almostapps.eu/">
						<button class="btn btn-active btn-ghost btn-wide">Sign In</button>
					</a>

					<a href="https://auth.rewrite.almostapps.eu/">
						<button class="btn btn-active btn-outline btn-wide">Sign Up</button>
					</a>
				{:else}
					<a href="/app/books?type=public">
						<button class="btn btn-active btn-outline btn-wide">Public library</button>
					</a>
					<a href="/app/books?type=private">
						<button class="btn btn-active btn-wide">Custom library</button>
					</a>
				{/if}
			</div>
		</div>
	</div>
</div>
