// Warnings/errors are intended to be handled separately
type BannerMessageType = 'info' | 'success';
export type BannerMessage = {
	type: BannerMessageType;
	text?: string;
	html?: string;
};
type StandardBannerMessage = {
	type: BannerMessageType;
	html: string;
};

const priority: Record<BannerMessageType, number> = {
	success: 1,
	info: 0
};

/**
 * Merge all success and info messages into a single banner message to avoid multiple banners showing.
 * Success styling overrides info.
 * */
export function buildInfoBanner(messages: BannerMessage[]): StandardBannerMessage | null {
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
