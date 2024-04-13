<script lang="ts">
	import { functions } from "$lib/appwrite";

    async function fake() {
        await functions.createExecution('addBook', '6619e087ade71ebf8041', true);
    }
</script>

<p>TODO: New book</p>

<button on:click={fake}>Faker</button>