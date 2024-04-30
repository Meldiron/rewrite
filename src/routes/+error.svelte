<script lang="ts">
	import { page } from '$app/stores';
</script>

<div class="hero min-h-screen bg-base-200">
	<div class="hero-content text-center">
		<div class="max-w-md">
			<h1 class="text-5xl font-bold mb-6">Sorry!</h1>
			<p class="">Website encountered an error.</p>
			<p class="text-error mb-6 mt-2 text-sm">{$page.error.message}</p>
			<a href="/" class="btn btn-primary">Back to homepage</a>
		</div>
	</div>
</div>
