<script lang="ts">
	import { databases, getFilePreview, storage } from '$lib/appwrite';
	import { toastStore } from '$lib/stores';
	import { ID, Query } from 'appwrite';
	import type { PageData } from './$types';
	import { invalidateAll } from '$app/navigation';
	import { latinize } from '$lib/latinize';
	import {
		formatNumber,
		getLevel,
		getLevelProgress,
		getXpRemaining,
		hasStreak,
		isStreakEnded
	} from '$lib/utils';
	import { onMount, tick } from 'svelte';

	export let data: PageData;

	let isSavingProgress = false;
	let endLevelModalOpened = false;
	let endLevelModalData = {
		xp: 0,
		accentXp: 0,
		caseXp: 0,
		doubleXp: 0
	};

	let previousPageEl: HTMLDivElement;
	let inputEl: HTMLInputElement;

	let madeMistake = false;

	let activeAutocorrects = 0;
	let lengthyWords = 0;
	let noMistakeWords = 0;
	let accentWords = 0;
	let caseWords = 0;

	let totalWords = 1;

	$: data, scrollToBottom();
	$: data, reloadStats();
	$: data, setActiveAutocorrects();
	$: data, updateTotalWords();

	function updateTotalWords() {
		totalWords = data.page.text.split('\n').join(' ').split(' ').length;
	}

	function setActiveAutocorrects() {
		activeAutocorrects = data.profile.autocorrects;
	}

	function scrollToBottom() {
		setTimeout(() => {
			if (previousPageEl) {
				previousPageEl.scrollTop = previousPageEl.scrollHeight;
			}
		}, 1);
	}

	onMount(() => {
		scrollToBottom();
	});

	$: fileId = `${data.book.$id}-${data.page.page}`;
	$: fileUrl = getFilePreview('pages', fileId);

	$: linesOfWords = data.page.text.split('\n').map((line: string) => line.split(' '));

	let correctWords = 0;
	let activeLine = 0;
	let activeWord = 0;
	let correctLetters = 0;
	let wrongLetters = 0;
	let goldenWords: string[] = [];
	reloadStats();

	function reloadStats() {
		goldenWords = [];
		correctLetters = 0;
		wrongLetters = 0;

		const key = `${data.book.$id}-${data.page.page}`;
		const autoSaves = JSON.parse(localStorage.getItem('autoSaves') ?? '{}');

		if (!autoSaves[key]) {
			activeLine = 0;
			activeWord = 0;
			correctWords = 0;
		} else {
			activeLine = autoSaves[key].activeLine;
			activeWord = autoSaves[key].activeWord;
			correctWords = autoSaves[key].correctWords;
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
		autoSaves[key].correctWords = Math.max(correctWords, 0);

		localStorage.setItem('autoSaves', JSON.stringify(autoSaves));
	}

	$: currentWord = linesOfWords[activeLine][activeWord];

	async function finishPage() {
		if (data.isCompleted) {
			$toastStore = { type: 'info', text: 'You have already rewriten this page.' };
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

		let xpToAddDouble = 0;

		if (
			data.profile.doubleXpUntilDate &&
			Date.now() <= new Date(data.profile.doubleXpUntilDate).getTime()
		) {
			xpToAddDouble = xpToAddBase;
		}

		let xp = data.profile.xp ?? 0;
		xp += xpToAddBase;
		xp += xpToAddAccent;
		xp += xpToAddCase;
		xp += xpToAddDouble;

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
		endLevelModalData.doubleXp = xpToAddDouble;

		let questsFinished = data.profile.questsFinished;
		let currentQuest = data.profile.currentQuest;
		let coins = data.profile.coins;

		try {
			const currentQuestJson = JSON.parse(data.profile.currentQuest);
			currentQuestJson.progress += goldenWords.length;
			if (currentQuestJson.progress >= currentQuestJson.amount) {
				currentQuest = '';
				questsFinished++;
				coins += currentQuestJson.reward;
			} else {
				currentQuest = JSON.stringify(currentQuestJson);
			}
		} catch (err) {}

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
			currentQuest,
			questsFinished,
			coins,
			wordsFinished,
			pagesFinished,
			booksFinished,
			lengthyWordsFinished: (data.profile.lengthyWordsFinished ?? 0) + lengthyWords,
			wordsWithoutMistakeFinished: (data.profile.wordsWithoutMistakeFinished ?? 0) + noMistakeWords,
			wordsWithAccentSensitivityFinished:
				(data.profile.wordsWithAccentSensitivityFinished ?? 0) + accentWords,
			wordsWithCaseSensitivityFinished:
				(data.profile.wordsWithCaseSensitivityFinished ?? 0) + caseWords
		});

		lengthyWords = 0;
		noMistakeWords = 0;
		accentWords = 0;
		caseWords = 0;

		await invalidateAll();

		$toastStore = { type: 'success', text: 'Page marked as completed.' };

		const key = `${data.book.$id}-${data.page.page}`;
		const autoSaves = JSON.parse(localStorage.getItem('autoSaves') ?? '{}');
		if (!autoSaves[key]) {
			autoSaves[key] = {};
		}

		autoSaves[key].activeLine = 0;
		autoSaves[key].correctWords = 0;
		autoSaves[key].activeWord = 0;
		correctWords = 0;
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

	async function nextWord(target: any, endedWithWildcard = false) {
		correctWords++;

		if (!madeMistake) {
			noMistakeWords++;
		}

		if (currentWord.length >= 10) {
			lengthyWords++;
		}

		if (data.user?.prefs.caseSensitivity === true) {
			caseWords++;
		}

		if (data.user?.prefs.accentSensitivity === true) {
			accentWords++;
		}

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
		} else {
			if (endedWithWildcard) {
				await tick();
				handleWord(target.value, target, true, true);
			}
		}

		const wordEl = document.getElementById(`${activeLine}-${activeWord}`);
		if (wordEl) {
			wordEl.scrollIntoView({
				behavior: 'smooth',
				block: 'center',
				inline: 'center'
			});
		}
	}

	async function handleWord(
		word: string,
		target: any,
		isWildcard = false,
		isAutoBeginningWorld = false
	) {
		const beginAsWildcard = isWildcard;
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

		if (wrongLetters <= 0 && beginAsWildcard) {
			for (let l = i; l < currentWord.length; l++) {
				const currentLetter = latinize(currentWord[l]);
				const pattern = /^[0-9a-zA-Z]*$/;
				if (pattern.test(currentLetter)) {
					break;
				}

				target.value = target.value + currentLetter;
				correctLetters++;
			}
		}

		if (beginAsWildcard && target.value.length === currentWord.length && wrongLetters === 0) {
			nextWord(target, true);
			return;
		}

		if (wrongLetters > 0) {
			madeMistake = true;
		}

		const lastChar = letters[letters.length - 1];

		if (lastChar === ' ') {
			if (wrongLetters === 1 && correctLetters === currentWord.length) {
				madeMistake = false;
				nextWord(target);
			} else if (activeAutocorrects > 0) {
				activeAutocorrects--;
				databases.updateDocument('main', 'profiles', data.profile.$id, {
					autocorrects: activeAutocorrects
				});

				madeMistake = false;
				nextWord(target);
			}
		}
	}

	function clearMistakes(target: any) {
		for (let i = 1; i < wrongLetters; i++) {
			target.value = target.value.slice(0, target.value.length - 1);
		}
		handleWord(target.value, target, false);
	}

	function onKeyDown(e: any) {
		if (wrongLetters > 0 && e.key.toLowerCase() === 'backspace') {
			// clearMistakes(e.target); // Bad UX
		}

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

		secondsLeft = 5;
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

	function isQuestWord(word: string, index: string) {
		try {
			const currentQuest = JSON.parse(data.profile.currentQuest);

			if (currentQuest.type === 'length') {
				if (word.length >= +currentQuest.details) {
					if (!goldenWords.includes(index)) {
						goldenWords.push(index);
					}
					return true;
				} else {
					return false;
				}
			}

			const correctLetter = latinize(currentQuest.details).toLowerCase();

			if (currentQuest.type === 'contains') {
				for (let letter of word.split('')) {
					letter = latinize(letter).toLowerCase();

					if (letter === correctLetter) {
						if (!goldenWords.includes(index)) {
							goldenWords.push(index);
						}

						return true;
					}
				}
			}

			if (currentQuest.type === 'starts') {
				let letter = getWordSimplified(word).split('')[0] ?? '';
				letter = latinize(letter).toLowerCase();
				if (letter === correctLetter) {
					if (!goldenWords.includes(index)) {
						goldenWords.push(index);
					}

					return true;
				}
			}

			if (currentQuest.type === 'ends') {
				let letter = getWordSimplified(word).split('')[word.length - 1] ?? '';
				letter = latinize(letter).toLowerCase();
				if (letter === correctLetter) {
					if (!goldenWords.includes(index)) {
						goldenWords.push(index);
					}

					return true;
				}
			}

			return false;
		} catch (err) {
			return false;
		}
	}

	function getWordSimplified(word: string) {
		const pattern = /^[0-9a-zA-Z]*$/g;
		const found = word.match(pattern) ?? [];
		return found.join('');
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
		Page {formatNumber(data.page.page)} / {formatNumber(data.totalPages)}

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
			<span>You have already rewriten this page.</span>
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
</div>

<div
	class={`${data.user?.prefs.pageScreenshot ? 'grid w-full grid-cols-12 gap-6' : 'max-w-2xl mx-auto'}`}
>
	<div
		class={`${data.user?.prefs.pageScreenshot ? 'col-span-6' : 'col-span-12'} card relative rounded-md ${data.isCompleted ? 'bg-success bg-opacity-10' : 'bg-base-100'} shadow-xl p-3 text-xl`}
	>
		{#each linesOfWords as words, lineIndex}
			<p class="my-1 flex flex-wrap gap-1 text-primary text-opacity-60">
				{#each words as word, wordIndex}
					{@const isActiveLine = activeLine === lineIndex}
					{@const isActiveWord = isActiveLine && activeWord === wordIndex}
					{@const index = lineIndex + '-' + wordIndex}
					{@const isGolden = isQuestWord(word, index)}
					<span id={`${lineIndex}-${wordIndex}`}>
						{#each word.split('') as letter, letterIndex}
							{@const isGreen =
								activeLine > lineIndex ||
								(isActiveWord && letterIndex < correctLetters) ||
								(isActiveLine && activeWord > wordIndex)}
							{@const isRed = isActiveWord && letterIndex < correctLetters + wrongLetters}
							<span
								class={`${isActiveWord ? 'underline' : ''} ${!isGreen && !isRed && isGolden ? 'text-base-content' : ''} ${isGreen ? 'text-success' : ''} ${isRed ? 'text-error' : ''}`}
								>{letter}</span
							>
						{/each}
					</span>
				{/each}
			</p>
		{/each}
	</div>

	{#if data.user?.prefs.pageScreenshot}
		<div class="col-span-6">
			<img src={fileUrl} alt="Screenshot" class="top-[85px] sticky rounded-md w-full" />
		</div>
	{/if}
</div>

<div class="fixed bottom-0 left-0 w-full">
	<button
		class={`btn border-none text-sm rounded-none rounded-tr-xl backdrop-blur-md bg-black bg-opacity-50`}
	>
		{activeAutocorrects}
		{activeAutocorrects === 1 ? 'Autocorrect' : 'Autocorrects'}
	</button>

	<div class="w-full p-6 pt-0 rounded-tr-xl backdrop-blur-md bg-black bg-opacity-50">
		<div class="relative">
			<progress class="progress my-2 h-3" value={correctWords} max={totalWords}></progress>

			<div class="absolute left-0 top-0 h-full text-xs flex">
				<p class="mt-[5.5px] ml-1 text-black">
					{Math.ceil((correctWords / totalWords) * 100)}%
				</p>
			</div>
		</div>

		<div class="flex gap-4 justify-center">
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
	</div>
</div>

{#if endLevelModalOpened}
	<div
		style="opacity: 100%; pointer-events: auto;"
		class="z-[200] modal modal-bottom sm:modal-middle"
	>
		<div class="modal-box">
			<h3 class="font-bold text-lg">Page complered</h3>
			<p class="py-4 text-primary">You have successfully rewriten a page and earned rewards.</p>
			<div class="flex flex-col gap-4">
				<div class="flex gap-4 items-center">
					<kbd class="kbd">{formatNumber(endLevelModalData.xp)}</kbd> <span>Base XP</span>
				</div>
				{#if endLevelModalData.doubleXp && endLevelModalData.doubleXp > 0}
					<div class="flex gap-4 items-center">
						<kbd class="kbd">{formatNumber(endLevelModalData.doubleXp)}</kbd> <span>Double XP</span>
					</div>
				{/if}
				<div class="flex gap-4 items-center">
					<kbd class="kbd">{formatNumber(endLevelModalData.caseXp)}</kbd>
					<span>Bonus for case sensitivity</span>
				</div>
				<div class="flex gap-4 items-center">
					<kbd class="kbd">{formatNumber(endLevelModalData.accentXp)}</kbd>
					<span>Bonus for accent sensitivity</span>
				</div>
			</div>

			<div class="divider"></div>

			<div class="flex gap-4 items-center mt-4">
				<kbd class="kbd"
					>{formatNumber(
						endLevelModalData.doubleXp +
							endLevelModalData.accentXp +
							endLevelModalData.caseXp +
							endLevelModalData.xp
					)}</kbd
				> <span>Total XP</span>
			</div>

			<div class="my-4">
				<div class="flex items-center justify-end gap-4">
					<p class="text-primary">{getXpRemaining(data.profile.xp)} XP left</p>
				</div>
				<progress
					class={`progress progress-base-200 w-full ${isSavingProgress ? 'opacity-50' : 'opacity-100'}`}
					value={getLevelProgress(data.profile.xp)}
					max={100}
				></progress>
				<div class="flex items-center justify-between gap-4">
					<p>Level {getLevel(data.profile.xp)}</p>
					<p>Level {getLevel(data.profile.xp) + 1}</p>
				</div>
			</div>

			<div class="modal-action">
				<button
					disabled={isSavingProgress}
					on:click={() => (endLevelModalOpened = false)}
					class="btn">Close</button
				>
				{#if isSavingProgress}
					<button disabled={true} class="btn btn-primary"> Next Page </button>
				{:else}
					<a
						on:click={() => (endLevelModalOpened = false)}
						href={`/app/books/${data.book.$id}/${data.page.page + 1}`}
						class="btn btn-primary"
					>
						Next page
					</a>
				{/if}
			</div>
		</div>
	</div>
{/if}
