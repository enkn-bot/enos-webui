import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');

describe('ENOS research intent frontend contract', () => {
	test('response message strips the research marker and renders the offer only after completion', () => {
		const responseMessage = read('src/lib/components/chat/Messages/ResponseMessage.svelte');

		expect(responseMessage).toContain(
			"const RESEARCH_OFFER_MARKER = '<!--enos-research-offer-->';"
		);
		expect(responseMessage).toContain(
			"let c = (message.content ?? '').replaceAll(RESEARCH_OFFER_MARKER, '');"
		);
		expect(responseMessage).toContain(
			"$: hasOffer = (message.content ?? '').includes(RESEARCH_OFFER_MARKER) && message.done === true;"
		);
		expect(responseMessage).toContain(
			"import ResearchOffer from './ResponseMessage/ResearchOffer.svelte';"
		);
		expect(responseMessage).toContain('content={displayContent}');
		expect(responseMessage).toContain("on:confirm={() => dispatch('researchConfirm')}");
	});

	test('research offer exposes confirm and local dismissal controls', () => {
		const researchOffer = read(
			'src/lib/components/chat/Messages/ResponseMessage/ResearchOffer.svelte'
		);
		const followUps = read('src/lib/components/chat/Messages/ResponseMessage/FollowUps.svelte');
		const followUpButtonClass =
			' py-1.5 bg-transparent text-left text-sm flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white transition cursor-pointer w-full';

		expect(followUps).toContain(followUpButtonClass);
		expect(researchOffer).toContain("import { createEventDispatcher } from 'svelte';");
		expect(researchOffer).toContain('let hidden = false;');
		expect(researchOffer).toContain('{#if !hidden}');
		expect(researchOffer).toContain("dispatch('confirm')");
		expect(researchOffer).toContain('hidden = true;');
		expect(researchOffer).toContain('Yes, dig in');
		expect(researchOffer).toContain('Not now');
		expect(researchOffer).toContain(`class="${followUpButtonClass}"`);
	});

	test('chat forwards research confirmations and submits with deep research enabled', () => {
		const chat = read('src/lib/components/chat/Chat.svelte');
		const messages = read('src/lib/components/chat/Messages.svelte');
		const message = read('src/lib/components/chat/Messages/Message.svelte');
		const multiResponseMessages = read(
			'src/lib/components/chat/Messages/MultiResponseMessages.svelte'
		);

		expect(chat).toContain('let deepResearchEnabled = false;');
		expect(chat).toContain('deep_research: deepResearchEnabled');
		expect(chat).toContain("await submitPrompt('Yes, research that.', []);");
		expect(chat).toContain('deepResearchEnabled = true;');
		expect(chat).toContain('deepResearchEnabled = false;');
		expect(chat).toContain('on:researchConfirm={handleResearchConfirm}');
		expect(messages).toContain('on:researchConfirm');
		expect(message).toContain('on:researchConfirm');
		expect(multiResponseMessages).toContain('on:researchConfirm');
	});
});
