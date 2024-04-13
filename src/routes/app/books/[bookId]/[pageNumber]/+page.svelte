<script lang="ts">
	import { databases, storage } from '$lib/appwrite';
	import { toastStore } from '$lib/stores';
	import { ID, Query } from 'appwrite';
	import type { PageData } from './$types';
	import { invalidateAll } from '$app/navigation';
	import { latinize } from '$lib/latinize';

	export let data: PageData;

	const fileId = `${data.book.$id}-${data.page.page}`;
	const fileUrl = storage
		.getFilePreview(
			'pages',
			fileId,
			1920,
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
		)
		.toString();

	const linesOfWords = data.page.text.split('\n').map((line: string) => line.split(' '));

	let activeLine = 0;
	let activeWord = 0;
	let correctLetters = 0;
	let wrongLetters = 0;

	$: currentWord = linesOfWords[activeLine][activeWord];

	async function nextWord(target: any) {
		target.value = '';
		correctLetters = 0;
		wrongLetters = 0;

		activeWord++;

		if (activeWord >= linesOfWords[activeLine].length) {
			activeWord = 0;
			activeLine++;
		}

		if (activeLine >= linesOfWords.length) {
			activeLine = 0;
			activeWord = 0;
			correctLetters = 0;
			wrongLetters = 0;

			data.isCompleted = true;

			$toastStore = { type: 'debug', text: 'Saving...' };

			const finishes = await databases.listDocuments('main', 'finishes', [
				Query.equal('bookId', data.book.$id),
				Query.limit(1)
			]);
			if (finishes.documents.length <= 0) {
				await databases.createDocument('main', 'finishes', ID.unique(), {
					userId: data.user?.$id ?? 'UNKNOWN',
					bookId: data.book.$id,
					pageNumbers: [data.page.page]
				});
			} else {
				const pageNumbers = [...finishes.documents[0].pageNumbers];

				if (!pageNumbers.includes(data.page.page)) {
					pageNumbers.push(data.page.page);
				}

				await databases.updateDocument('main', 'finishes', finishes.documents[0].$id, {
					pageNumbers
				});
			}

			$toastStore = { type: 'success', text: 'Page marked as completed.' };
			await invalidateAll();
		}
	}

	async function handleWord(word: string, target: any) {
		if (data.isCompleted) {
			return;
		}

		correctLetters = 0;
		wrongLetters = 0;

		const letters = word.split('');

		let i = 0;
		for (const letter of letters) {
			const correctLetter = currentWord[i];

			if (
				latinize((letter ?? '').toLowerCase()) === latinize((correctLetter ?? '').toLowerCase()) &&
				wrongLetters === 0
			) {
				correctLetters++;
			} else {
				wrongLetters++;
			}

			i++;
		}

		const lastChar = letters[letters.length - 1];
		if (lastChar === ' ' && wrongLetters === 1 && correctLetters === currentWord.length) {
			nextWord(target);
		}
	}

	function onKeyDown(e: any) {
		if (e.key.toLowerCase() === 'enter') {
			nextWord(e.target);
		}
	}

	function onChange(e: any) {
		handleWord(e.target.value, e.target);
	}
</script>

<div class="max-w-2xl mx-auto">
	<div class="divider"><a href="/app/books" class="hover:underline">Books</a></div>
	<h1 class="text-4xl font-semibold text-primary text-center my-8">
		<a href={`/app/books/${data.book.$id}`} class="hover:underline">{data.book.title}</a>
	</h1>
	<div class="divider">Page {data.page.page} / {data.totalPages}</div>

	<div class="card relative p-10 rounded-md bg-base-100 shadow-xl p-3 text-xl">
		{#if data.isCompleted}
			<div
				class="absolute rounded-xl inset-0 bg-gradient-to-b from-transparent via-[rgba(0,0,0,0.8)] to-black flex items-start pt-8 justify-center backdrop-blur-md"
			>
				Already rewritten.
			</div>
		{/if}
		{#each linesOfWords as words, lineIndex}
			<p class="my-1 inline-flex gap-1 text-primary text-opacity-60">
				{#each words as word, wordIndex}
					{@const isActiveLine = activeLine === lineIndex}
					{@const isActiveWord = isActiveLine && activeWord === wordIndex}
					<span>
						{#each word.split('') as letter, letterIndex}
							{@const isGreen =
								activeLine > lineIndex ||
								(isActiveWord && letterIndex < correctLetters) ||
								(isActiveLine && activeWord > wordIndex)}
							{@const isRed = isActiveWord && letterIndex < correctLetters + wrongLetters}
							<span
								class={`${isActiveWord ? 'underline' : ''} ${isGreen ? 'text-success' : ''} ${isRed ? 'text-error' : ''}`}
								>{letter}</span
							>
						{/each}
					</span>
				{/each}
			</p>
		{/each}
	</div>
</div>

<div
	class="fixed bottom-0 p-6 left-0 w-full rounded-t-xl flex justify-center backdrop-blur-md bg-black bg-opacity-25"
>
	<input
		disabled={data.isCompleted}
		on:keydown={onKeyDown}
		on:input={onChange}
		type="text"
		placeholder="Type here"
		class="input input-lg border-3 input-bordered w-full"
	/>
</div>

<div class="fixed right-6 top-0 h-full flex items-center">
	<div
		class="indicator max-h-[75vh] rounded-xl transform translate-x-[90%] transition duration-1000 hover:translate-x-[0%] h-full"
	>
		<span class="indicator-item indicator-start btn btn-circle btn-active btn-primary">
			<svg
				xmlns="http://www.w3.org/2000/svg"
				fill="none"
				viewBox="0 0 24 24"
				stroke-width="1.5"
				stroke="currentColor"
				class="w-5 h-5"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z"
				/>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
				/>
			</svg>
		</span>

		<img src={fileUrl} alt="Screenshot" class="rounded-xl" />
	</div>
</div>
