<script lang="ts">
	import { databases, getFilePreview, storage } from '$lib/appwrite';
	import { toastStore } from '$lib/stores';
	import { ID, Query } from 'appwrite';
	import type { PageData } from './$types';
	import { invalidateAll } from '$app/navigation';
	import { latinize } from '$lib/latinize';
	import { getLevel, getLevelProgress, getXpRemaining, hasStreak, isStreakEnded } from '$lib/utils';
	import { onMount } from 'svelte';

	export let data: PageData;

	let isSavingProgress = false;
	let endLevelModalOpened = false;
	let endLevelModalData = {
		xp: 0,
		accentXp: 0,
		caseXp: 0
	};

	let currentMainTab: 'text' | 'screenshot' = 'text';
	let previousPageEl: HTMLDivElement;
	let inputEl: HTMLInputElement;

	$: data, scrollToBottom();
	$: data, reloadStats();

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
	$: fileUrl = getFilePreview(
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
	);

	$: linesOfWords = data.page.text.split('\n').map((line: string) => line.split(' '));

	let activeLine = 0;
	let activeWord = 0;
	let correctLetters = 0;
	let wrongLetters = 0;
	reloadStats();

	function reloadStats() {
		correctLetters = 0;
		wrongLetters = 0;

		const key = `${data.book.$id}-${data.page.page}`;
		const autoSaves = JSON.parse(localStorage.getItem('autoSaves') ?? '{}');

		if (!autoSaves[key]) {
			activeLine = 0;
			activeWord = 0;
		} else {
			activeLine = autoSaves[key].activeLine;
			activeWord = autoSaves[key].activeWord;
		}
	}

	$: activeLine, autoSave();
	$: activeWord, autoSave();

	function autoSave() {
		const key = `${data.book.$id}-${data.page.page}`;
		const autoSaves = JSON.parse(localStorage.getItem('autoSaves') ?? '{}');
		if (!autoSaves[key]) {
			autoSaves[key] = {};
		}

		autoSaves[key].activeLine = Math.max(activeLine, 0);
		autoSaves[key].activeWord = Math.max(activeWord, 0);

		localStorage.setItem('autoSaves', JSON.stringify(autoSaves));
	}

	$: currentWord = linesOfWords[activeLine][activeWord];

	async function finishPage() {
		if (data.isCompleted) {
			$toastStore = { type: 'info', text: 'You have already rewritten this page.' };
			return;
		}

		data.isCompleted = true;

		$toastStore = { type: 'info', text: 'Saving...' };

		let totalStreak = data.profile.totalStreak ?? 0;

		let streak = data.profile.streak ?? 0;
		if (!hasStreak(data.profile.lastStreakDate)) {
			streak++;
			totalStreak++;
		}

		let maxStreak = data.profile.maxStreak ?? 0;
		if (streak > maxStreak) {
			maxStreak = streak;
		}

		const xpToAddBase = data.page.text.split(' ').join('').split('\n').join('').length;
		const wordsToAdd = data.page.text.split('\n').join(' ').split(' ').length;

		const xpToAddAccent =
			data.user?.prefs.accentSensitivity === true ? Math.floor(xpToAddBase * 0.1) : 0;
		const xpToAddCase =
			data.user?.prefs.caseSensitivity === true ? Math.floor(xpToAddBase * 0.1) : 0;

		let xp = data.profile.xp ?? 0;
		xp += xpToAddBase;
		xp += xpToAddAccent;
		xp += xpToAddCase;

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

		endLevelModalOpened = true;
		endLevelModalData.xp = xpToAddBase;
		endLevelModalData.accentXp = xpToAddAccent;
		endLevelModalData.caseXp = xpToAddCase;

		isSavingProgress = true;

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

		const key = `${data.book.$id}-${data.page.page}`;
		const autoSaves = JSON.parse(localStorage.getItem('autoSaves') ?? '{}');
		if (!autoSaves[key]) {
			autoSaves[key] = {};
		}

		autoSaves[key].activeLine = 0;
		autoSaves[key].activeWord = 0;
		activeLine = 0;
		activeWord = 0;
		correctLetters = 0;
		wrongLetters = 0;

		localStorage.setItem('autoSaves', JSON.stringify(autoSaves));

		isSavingProgress = false;
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

	async function handleWord(word: string, target: any, isWildcard = false) {
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
				if (isWildcard && wrongLetters === 0) {
					const pattern = /^[0-9a-zA-Z]*$/;
					if (pattern.test(correctLetterCopy)) {
						wrongLetters++;
					} else {
						correctLetters++;
						target.value = target.value.slice(0, i) + correctLetter + target.value.slice(i + 1);
						isWildcard = false;
					}
				} else {
					wrongLetters++;
				}
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

		if (e.key.toLowerCase() === 'enter') {
			if (e.metaKey || e.ctrlKey) {
				onSkipWord();
			} else {
				e.target.value += ' ';
				handleWord(e.target.value, e.target, true);
			}
		}
	}

	function onChange(e: any) {
		handleWord(e.target.value, e.target, e.data === ' ');
	}

	let secondsLeft = 0;
	let secondsInterval: any = null;
	let canSkip = true;

	function onSkipWord() {
		if (!canSkip) {
			return;
		}

		secondsLeft = 3;
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
	<div class="divider"><a href="/app/books?type=public" class="hover:underline">Books</a></div>
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

	<div class="flex gap-3 sticky top-[60px] z-[20] backdrop-blur-sm w-[fit-content] p-3 rounded-xl">
		<button
			on:click={() => (currentMainTab = 'text')}
			class={`${currentMainTab === 'text' ? 'bg-white text-black' : 'bg-base-300'} text-xs w-[fit-content] px-3 py-2 pb-1 rounded-md pb-3`}
		>
			Page to rewrite
		</button>
		<button
			on:click={() => (currentMainTab = 'screenshot')}
			class={`${currentMainTab === 'screenshot' ? 'bg-white text-black' : 'bg-base-300'} text-xs w-[fit-content] px-3 py-2 pb-1 rounded-md pb-3`}
		>
			Page screenshot
		</button>
	</div>
	<div
		class={`${currentMainTab === 'screenshot' ? '' : 'hidden'} card relative rounded-tl-none rounded-md bg-base-100 shadow-xl p-3 text-xl`}
	>
		<img src={fileUrl} alt="Screenshot" class="rounded-md" />
	</div>
	<div
		class={`${currentMainTab === 'text' ? '' : 'hidden'} card relative rounded-md ${data.isCompleted ? 'bg-success bg-opacity-10' : 'bg-base-100'} shadow-xl p-3 text-xl`}
	>
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
			<div class="flex flex-col gap-4">
				<div class="flex gap-4 items-center">
					<kbd class="kbd">{endLevelModalData.xp}</kbd> <span>Base XP</span>
				</div>
				<div class="flex gap-4 items-center">
					<kbd class="kbd">{endLevelModalData.caseXp}</kbd> <span>Bonus for case sensitivity</span>
				</div>
				<div class="flex gap-4 items-center">
					<kbd class="kbd">{endLevelModalData.accentXp}</kbd>
					<span>Bonus for accent sensitivity</span>
				</div>
			</div>

			<div class="divider"></div>

			<div class="flex gap-4 items-center mt-4">
				<kbd class="kbd"
					>{endLevelModalData.accentXp + endLevelModalData.caseXp + endLevelModalData.xp}</kbd
				> <span>Total XP</span>
			</div>

			<div class="my-4">
				<div class="flex items-center justify-end gap-4">
					<p class="text-primary">{getXpRemaining(data.profile.xp)} XP left</p>
				</div>
				{#if isSavingProgress}
					<progress class="progress progress-base-200 w-full"></progress>
				{:else}
					<progress
						class="progress progress-base-200 w-full"
						value={getLevelProgress(data.profile.xp)}
						max={100}
					></progress>
				{/if}
				<div class="flex items-center justify-between gap-4">
					<p>Level {getLevel(data.profile.xp)}</p>
					<p>Level {getLevel(data.profile.xp) + 1}</p>
				</div>
			</div>

			<div class="modal-action">
				<button on:click={() => (endLevelModalOpened = false)} class="btn">Close</button>
				<a
					on:click={() => (endLevelModalOpened = false)}
					href={`/app/books/${data.book.$id}/${data.page.page + 1}`}
					class="btn btn-primary">Next Page</a
				>
			</div>
		</div>
	</div>
{/if}
