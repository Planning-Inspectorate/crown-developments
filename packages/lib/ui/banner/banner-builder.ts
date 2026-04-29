// Warnings/errors are intended to be handled separately
type BannerMessageType = 'info' | 'success';
export type BannerMessage = {
	type: BannerMessageType;
	text?: string;
	html?: string;
};
export type StandardBannerMessage = {
	type: BannerMessageType;
	html: string;
};

const priority: Record<BannerMessageType, number> = {
	success: 1,
	info: 0
};

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

	addDistressingContent(): BannerBuilder {
		return this
			.addInfoHtml(`<h3 class="govuk-notification-banner__heading">Application may contain distressing content</h3>
				<p class="govuk-body">A content warning tag has been applied to documents containing content that some may find distressing.</p>`);
	}

	addLinkedCase(linkedCaseLink: string): BannerBuilder {
		return this.addInfoHtml(
			'<p class="govuk-notification-banner__heading">This application is connected to a ' + linkedCaseLink + '.</p>'
		);
	}

	build(): StandardBannerMessage | null {
		return this.#buildInfoBanner(this.#messages);
	}

	/**
	 * Merge all success and info messages into a single banner message to avoid multiple banners showing.
	 * Success styling overrides info.
	 * */
	#buildInfoBanner(messages: BannerMessage[]): StandardBannerMessage | null {
		if (messages.length === 0) {
			return null;
		}
		let html = '';
		let type: BannerMessageType = 'info';

		const sortedMessages = [...messages].sort((a, b) => {
			const aPriority = priority[a.type] ?? 0;
			const bPriority = priority[b.type] ?? 0;
			return bPriority - aPriority; // highest priority first
		});

		sortedMessages.forEach((message) => {
			if (message.type === 'success') {
				type = 'success';
			}
			if (message.html) {
				html += message.html;
			}
			if (message.text) {
				html += `<p class="govuk-notification-banner__heading">${message.text}</p>`;
			}
		});
		return {
			type,
			html
		};
	}
}
