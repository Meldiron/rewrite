<script lang="ts">
	import { databases, storage } from '$lib/appwrite';
	import { toastStore } from '$lib/stores';
	import { ID, Query } from 'appwrite';
	import type { PageData } from './$types';
	import { invalidateAll } from '$app/navigation';
	import { latinize } from '$lib/latinize';
	import { getLevel, hasStreak, isStreakEnded } from '$lib/utils';
	import { onMount } from 'svelte';

	export let data: PageData;

	let endLevelModalOpened = false;
	let endLevelModalData = {
		xp: 0,
		words: 0
	};

	let currentMainTab: 'text' | 'screenshot' = 'text';
	let previousPageEl: HTMLDivElement;
	let inputEl: HTMLInputElement;

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

		let maxStreak = data.profile.maxStreak ?? 0;
		if (streak > maxStreak) {
			maxStreak = streak;
		}

		let totalStreak = data.profile.totalStreak ?? 0;
		totalStreak++;

		const xpToAdd = data.page.text.split(' ').join('').split('\n').join('').length;
		const wordsToAdd = data.page.text.split('\n').join(' ').split(' ').length;

		let xp = data.profile.xp ?? 0;
		xp += xpToAdd;

		let wordsFinished = data.profile.wordsFinished ?? 0;
		wordsFinished += wordsToAdd;

		let pagesFinished = data.profile.pagesFinished ?? 0;
		pagesFinished += 1;

		let booksFinished = data.profile.booksFinished ?? 0;
		if (data.totalFinishes + 1 >= data.totalPages) {
			booksFinished += 1;
		}

		let lastStreakDate: string | null = new Date().toISOString();

		if (isStreakEnded(data.profile.lastStreakDate)) {
			streak = 0;
			lastStreakDate = null;
		}

		await databases.updateDocument('main', 'profiles', data.profile.$id, {
			lastStreakDate,
			streak,
			totalStreak,
			maxStreak,
			xp,
			wordsFinished,
			pagesFinished,
			booksFinished
		});

		await invalidateAll();

		$toastStore = { type: 'success', text: 'Page marked as completed.' };

		endLevelModalOpened = true;
		endLevelModalData.xp = xpToAdd;
		endLevelModalData.words = wordsToAdd;
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

			let letterCopy = letter ?? '';
			let correctLetterCopy = correctLetter ?? '';

			if (data.user?.prefs.accentSensitivity !== true) {
				letterCopy = latinize(letterCopy);
				correctLetterCopy = latinize(correctLetterCopy);
			}

			if (data.user?.prefs.caseSensitivity !== true) {
				letterCopy = letterCopy.toLowerCase();
				correctLetterCopy = correctLetterCopy.toLowerCase();
			}

			if (letterCopy === correctLetterCopy && wrongLetters === 0) {
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
				onSkipWord();
			} else {
				e.target.value += ' ';
				handleWord(e.target.value, e.target);
			}
		}
	}

	function onChange(e: any) {
		handleWord(e.target.value, e.target);
	}

	let secondsLeft = 0;
	let secondsInterval: any = null;
	let canSkip = true;

	function onSkipWord() {
		if (!canSkip) {
			return;
		}

		const currentLevel = getLevel(data.profile.xp);

		secondsLeft =
			currentLevel >= 100
				? 1
				: currentLevel >= 50
					? 3
					: currentLevel >= 25
						? 5
						: currentLevel >= 10
							? 10
							: 15;
		canSkip = false;

		if (secondsInterval) {
			clearInterval(secondsInterval);
			secondsInterval = null;
		}
		secondsInterval = setInterval(() => {
			if (secondsLeft > 1) {
				secondsLeft--;
			} else {
				canSkip = true;
				clearInterval(secondsInterval);
			}
		}, 1000);

		nextWord(inputEl);
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

	<div class="flex gap-3">
		<button
			on:click={() => (currentMainTab = 'text')}
			class={`${currentMainTab === 'text' ? 'bg-base-100' : 'bg-base-200'} text-xs border-white w-[fit-content] px-3 py-2 pb-1 rounded-md rounded-b-none pb-3`}
		>
			Page to rewrite
		</button>
		<button
			on:click={() => (currentMainTab = 'screenshot')}
			class={`${currentMainTab === 'screenshot' ? 'bg-base-100' : 'bg-base-200'} text-xs border-white w-[fit-content] px-3 py-2 pb-1 rounded-md rounded-b-none pb-3`}
		>
			Book screenshot
		</button>
	</div>
	<div
		class={`${currentMainTab === 'screenshot' ? '' : 'hidden'} card relative rounded-tl-none rounded-md bg-base-100 shadow-xl p-3 text-xl`}
	>
		<img src={fileUrl} alt="Screenshot" class="rounded-md" />
	</div>
	<div
		class={`${currentMainTab === 'text' ? '' : 'hidden'} card relative rounded-tl-none rounded-md bg-base-100 shadow-xl p-3 text-xl`}
	>
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
	class="fixed bottom-0 p-6 left-0 w-full rounded-t-xl flex gap-4 justify-center backdrop-blur-md bg-black bg-opacity-25"
>
	<input
		bind:this={inputEl}
		disabled={data.isCompleted}
		on:keydown={onKeyDown}
		on:input={onChange}
		type="text"
		autofocus={true}
		placeholder="Type here"
		class="input input-lg border-3 input-bordered w-full"
	/>

	<button
		disabled={!canSkip}
		on:click={onSkipWord}
		class={`btn btn-lg btn-ghost btn-active text-sm ${canSkip ? '' : '!text-white !text-opacity-60'}`}
	>
		{#if canSkip}
			Skip word
		{:else}
			Wait {secondsLeft} {secondsLeft === 1 ? 'second' : 'seconds'}
		{/if}
	</button>
</div>

{#if endLevelModalOpened}
	<div
		style="opacity: 100%; pointer-events: auto;"
		class="z-[200] modal modal-bottom sm:modal-middle"
	>
		<div class="modal-box">
			<h3 class="font-bold text-lg">Page complered</h3>
			<p class="py-4 text-primary">You have successfully rewritten a page and earned rewards.</p>

			<ul class="steps steps-vertical">
				<li class="step">
					<div class="flex gap-4 items-center">
						<span>Level</span> <kbd class="kbd">+{endLevelModalData.xp} XP</kbd>
					</div>
				</li>
				<li class="step">
					<div class="flex gap-4 items-center">
						<span>Words</span> <kbd class="kbd">+{endLevelModalData.words}</kbd>
					</div>
				</li>
				<li class="step">
					<div class="flex gap-4 items-center"><span>Pages</span> <kbd class="kbd">+1</kbd></div>
				</li>
			</ul>

			<div class="modal-action">
				<button on:click={() => (endLevelModalOpened = false)} class="btn">Close</button>
				<a
					on:click={() => (endLevelModalOpened = false)}
					href="/app/unlocks"
					class="btn btn-primary">Next Page</a
				>
			</div>
		</div>
	</div>
{/if}
