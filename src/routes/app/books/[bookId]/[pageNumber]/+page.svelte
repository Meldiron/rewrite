<script lang="ts">
	import { databases, storage } from '$lib/appwrite';
	import { toastStore } from '$lib/stores';
	import { ID, Query } from 'appwrite';
	import type { PageData } from './$types';
	import { invalidateAll } from '$app/navigation';
	import { latinize } from '$lib/latinize';
	import { hasStreak } from '$lib/utils';
	import { onMount } from 'svelte';

	export let data: PageData;

	let previousPageEl: HTMLDivElement;

	$: data, scrollToBottom();

	function scrollToBottom() {
		setTimeout(() => {
			if (previousPageEl) {
				previousPageEl.scrollTop = previousPageEl.scrollHeight;
				console.log('Scrolled');
			}
		}, 1);
	}

	onMount(() => {
		scrollToBottom();
	});

	$: fileId = `${data.book.$id}-${data.page.page}`;
	$: fileUrl = storage
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

	$: linesOfWords = data.page.text.split('\n').map((line: string) => line.split(' '));

	let activeLine = 0;
	let activeWord = 0;
	let correctLetters = 0;
	let wrongLetters = 0;

	$: {
		if (data) {
			activeLine = 0;
			activeWord = 0;
			correctLetters = 0;
			wrongLetters = 0;
		}
	}

	$: currentWord = linesOfWords[activeLine][activeWord];

	async function finishPage() {
		data.isCompleted = true;

		$toastStore = { type: 'info', text: 'Saving...' };

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

		let streak = data.profile.streak ?? 0;
		if (!hasStreak(data.profile.lastStreakDate)) {
			streak++;
		}

		let xp = data.profile.xp ?? 0;
		xp += data.page.text.split(' ').join('').split('\n').join('').length;

		let wordsFinished = data.profile.wordsFinished ?? 0;
		wordsFinished += data.page.text.split('\n').join(' ').split(' ').length;

		let pagesFinished = data.profile.pagesFinished ?? 0;
		pagesFinished += 1;

		let booksFinished = data.profile.booksFinished ?? 0;
		if (data.totalFinishes + 1 >= data.totalPages) {
			booksFinished += 1;
		}

		await databases.updateDocument('main', 'profiles', data.profile.$id, {
			lastStreakDate: new Date().toISOString(),
			streak,
			xp,
			wordsFinished,
			pagesFinished,
			booksFinished
		});

		await invalidateAll();

		$toastStore = { type: 'success', text: 'Page marked as completed.' };
	}

	async function previousWord(target: any) {
		activeWord--;

		if (activeWord < 0) {
			activeLine--;
			activeWord = linesOfWords[activeLine].length - 1;
		}

		if (activeLine < 0) {
			activeLine = 0;
			activeWord = 0;
			correctLetters = 0;
			wrongLetters = 0;
			return;
		}

		wrongLetters = 0;
		correctLetters = linesOfWords[activeLine][activeWord].length;
		target.value = linesOfWords[activeLine][activeWord];
	}

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

			finishPage();
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
		if (e.target.value === '' && e.key.toLowerCase() === 'backspace') {
			previousWord(e.target);
			e.preventDefault();
			return;
		}

		if (
			e.key.toLowerCase() === 'enter' &&
			(e.target.value[e.target.value.length - 1] ?? '') !== ' '
		) {
			if (e.metaKey || e.ctrlKey) {
				nextWord(e.target);
			} else {
				e.target.value += ' ';
				handleWord(e.target.value, e.target);
			}
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
	<div class="divider">
		<a
			href={`/app/books/${data.book.$id}/${data.page.page - 1}`}
			class="btn btn-xs btn-active btn-ghost">Back</a
		>
		Page {data.page.page} / {data.totalPages}

		<a
			href={`/app/books/${data.book.$id}/${data.page.page + 1}`}
			class="btn btn-xs btn-active btn-ghost">Next</a
		>
	</div>

	{#if data.isCompleted}
		<div role="alert" class="alert alert-success mb-4">
			<svg
				xmlns="http://www.w3.org/2000/svg"
				class="stroke-current shrink-0 h-6 w-6"
				fill="none"
				viewBox="0 0 24 24"
				><path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
				/></svg
			>
			<span>You have already rewritten this page.</span>
			<a href={`/app/books/${data.book.$id}/${data.page.page + 1}`} class="btn btn-primary"
				>Next page</a
			>
		</div>
	{/if}

	{#if data.previousPage}
		<div
			class="bg-neutral text-xs border-white w-[fit-content] px-3 py-2 rounded-md rounded-b-none pb-3"
		>
			Previously read
		</div>
		<div bind:this={previousPageEl} class="relative max-h-[150px] overflow-y-scroll mb-4">
			<div
				class="card rounded-tl-none mt-0 bg-neutral p-3 text-md rounded-md shadow-xl text-base-content tracking-wide"
			>
				{#each data.previousPage.text.split('\n') as row}
					<p>{row}</p>
				{/each}
			</div>
		</div>
	{/if}

	<div
		class="bg-base-100 text-xs border-white w-[fit-content] px-3 py-2 pb-1 rounded-md rounded-b-none pb-3"
	>
		Page to rewrite
	</div>
	<div class="card relative rounded-tl-none rounded-md bg-base-100 shadow-xl p-3 text-xl">
		{#if data.isCompleted}
			<div
				class="absolute rounded-xl inset-0 bg-gradient-to-b from-[rgba(0,0,0,0.5)] via-[rgba(0,0,0,0.8)] to-[rgba(0,0,0,0.5)] flex items-start pt-4 justify-center pointer-events-none"
			></div>
		{/if}
		{#each linesOfWords as words, lineIndex}
			<p class="my-1 flex flex-wrap gap-1 text-primary text-opacity-60">
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
		autofocus={true}
		placeholder="Type here"
		class="input input-lg border-3 input-bordered w-full"
	/>
</div>

<div class="fixed right-0 top-0 h-full flex items-center pointer-events-none">
	<div
		class="indicator max-h-[75vh] rounded-xl rounded-r-none transform translate-x-[70%] transition duration-500 hover:translate-x-[0%] h-full pointer-events-auto"
	>
		<span
			class="pointer indicator-item indicator-middle indicator-start btn btn-circle btn-active btn-primary"
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				fill="none"
				viewBox="0 0 24 24"
				stroke-width="1.5"
				stroke="currentColor"
				class="w-5 h-5"
			>
				<path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
			</svg>
		</span>

		<img src={fileUrl} alt="Screenshot" class="rounded-xl rounded-r-none" />
	</div>
</div>
