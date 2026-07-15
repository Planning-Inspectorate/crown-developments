import { escapeHtml } from '@pins/crowndev-lib/util/string.ts';

// Warnings/errors should not be handled with notificationBanner
type BannerMessageType = 'info' | 'success';

// A message must have exactly one of `text` or `html`.
export type BannerMessage =
	{ type: BannerMessageType; text: string; html?: never } | { type: BannerMessageType; html: string; text?: never };

type InternalHtmlMessage = {
	kind: 'html';
	type: BannerMessageType;
	html: string;
};

type InternalTextMessage = {
	kind: 'text';
	type: BannerMessageType;
	text: string;
};

type InternalSingleLineHtmlMessage = {
	kind: 'singleLineHtml';
	type: BannerMessageType;
	html: string;
};

type InternalBannerMessage = InternalHtmlMessage | InternalSingleLineHtmlMessage | InternalTextMessage;

const priority: Record<BannerMessageType, number> = {
	success: 1,
	info: 0
};

/**
 * Builder for constructing a single banner message out of one or more informational or success messages.
 */
export class BannerBuilder {
	#messages: InternalBannerMessage[] = [];

	/**
	 * Add a prebuilt internal banner message to the queue.
	 */
	addMessage(message: InternalBannerMessage): BannerBuilder {
		this.#messages.push(message);
		return this;
	}

	/**
	 * Add an informational message containing trusted HTML.
	 */
	addInfoTrustedHtml(html: string): BannerBuilder {
		return this.addMessage({ kind: 'html', type: 'info', html });
	}

	/**
	 * Add an informational plain-text message.
	 */
	addInfoText(text: string): BannerBuilder {
		return this.addMessage({ kind: 'text', type: 'info', text });
	}

	/**
	 * Add an informational trusted HTML message intended for a single line.
	 */
	addInfoTrustedSingleLineHtml(html: string): BannerBuilder {
		return this.addMessage({ kind: 'singleLineHtml', type: 'info', html });
	}

	/**
	 * Add a success message containing trusted HTML.
	 */
	addSuccessTrustedHtml(html: string): BannerBuilder {
		return this.addMessage({ kind: 'html', type: 'success', html });
	}

	/**
	 * Add a success plain-text message.
	 */
	addSuccessText(text: string): BannerBuilder {
		return this.addMessage({ kind: 'text', type: 'success', text });
	}

	/**
	 * Add a success trusted HTML message intended for a single line.
	 */
	addSuccessTrustedSingleLineHtml(html: string): BannerBuilder {
		return this.addMessage({ kind: 'singleLineHtml', type: 'success', html });
	}

	/**
	 * Add a single-line informational message describing a linked case.
	 */
	addLinkedCase(linkedCaseLink: string): BannerBuilder {
		// linkedCaseLink is a trusted HTML anchor produced server-side.
		return this.addInfoTrustedSingleLineHtml(`This application is connected to a ${linkedCaseLink}.`);
	}

	/**
	 * Render an internal banner message as HTML markup.
	 */
	#renderHtmlMessage(message: InternalBannerMessage, single: boolean): string {
		switch (message.kind) {
			case 'html':
				return message.html;
			case 'text':
				return `<p class="govuk-body">${escapeHtml(message.text)}</p>`;
			case 'singleLineHtml':
				return this.#renderTrustedSingleLineHtml(message.html, single);
		}
	}

	/**
	 * Wrap trusted single-line HTML in the appropriate banner paragraph styling.
	 */
	#renderTrustedSingleLineHtml(html: string, single: boolean): string {
		const cssClass = single ? 'govuk-notification-banner__heading' : 'govuk-body';
		return `<p class="${cssClass}">${html}</p>`;
	}

	/**
	 * Merge all success and info messages into a single banner message to avoid multiple banners showing.
	 * Success styling overrides info. Returns null when there are no messages.
	 */
	build(): BannerMessage | null {
		const messages = this.#messages;
		if (messages.length === 0) {
			return null;
		}

		const type: BannerMessageType = messages.some((m) => m.type === 'success') ? 'success' : 'info';

		// Single message: render without a list wrapper.
		if (messages.length === 1) {
			const message = messages[0];
			if (message.kind === 'text') {
				return { type, text: message.text };
			}
			return { type, html: this.#renderHtmlMessage(message, true) };
		}

		// Multiple messages: sort by priority (success first) and render as a bullet list.
		const sortedMessages = [...messages].sort((a, b) => priority[b.type] - priority[a.type]);
		const items = sortedMessages.map((message) => `<li>${this.#renderHtmlMessage(message, false)}</li>`);

		return {
			type,
			html: `<ul class="govuk-list govuk-list--bullet">${items.join('')}</ul>`
		};
	}
}
