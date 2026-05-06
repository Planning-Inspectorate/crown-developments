// Warnings/errors should not be handled with notificationBanner
type BannerMessageType = 'info' | 'success';

// A message must have exactly one of `text` or `html`.
export type BannerMessage =
	| { type: BannerMessageType; text: string; html?: never }
	| { type: BannerMessageType; html: string; text?: never };

export type StandardBannerMessage = {
	type: BannerMessageType;
	html: string;
};

const priority: Record<BannerMessageType, number> = {
	success: 1,
	info: 0
};

const HTML_ESCAPES: Record<string, string> = {
	'&': '&amp;',
	'<': '&lt;',
	'>': '&gt;',
	'"': '&quot;',
	"'": '&#39;'
};

function escapeHtml(value: string): string {
	return value.replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]);
}

export class BannerBuilder {
	#messages: BannerMessage[] = [];

	addMessage(message: BannerMessage): BannerBuilder {
		this.#messages.push(message);
		return this;
	}

	addInfoHtml(html: string): BannerBuilder {
		return this.addMessage({ type: 'info', html });
	}

	addInfoText(text: string): BannerBuilder {
		return this.addMessage({ type: 'info', text });
	}

	addSuccessHtml(html: string): BannerBuilder {
		return this.addMessage({ type: 'success', html });
	}

	addSuccessText(text: string): BannerBuilder {
		return this.addMessage({ type: 'success', text });
	}

	addLinkedCase(linkedCaseLink: string): BannerBuilder {
		// linkedCaseLink is a trusted HTML anchor produced server-side.
		return this.addInfoHtml(`This application is connected to a ${linkedCaseLink}.`);
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
			if ('text' in message && message.text !== undefined) {
				return { type, text: message.text };
			}
			return { type, html: message.html };
		}

		// Multiple messages: sort by priority (success first) and render as a bullet list.
		const sortedMessages = [...messages].sort((a, b) => priority[b.type] - priority[a.type]);
		const items = sortedMessages.map((message) =>
			'html' in message && message.html !== undefined
				? `<li>${message.html}</li>`
				: `<li><p class="govuk-body">${escapeHtml(message.text)}</p></li>`
		);

		return {
			type,
			html: `<ul class="govuk-list govuk-list--bullet">${items.join('')}</ul>`
		};
	}
}
