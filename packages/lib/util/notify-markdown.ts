import escape from 'escape-html';

/**
 * Util for converting from GovUK notify markdown into usable
 * html for displaying styled in govuk format
 */
export function notifyMarkdownToHtml(markdown: string): string {
	if (!markdown) return '';

	let text = escape(
		markdown
			.replace(/\\r\\n/g, '\n')
			.replace(/\r\n/g, '\n')
			.trim()
	);

	text = text.replace(/(^|\n)\^([\s\S]*?)(?=\n\s*\n|$)/g, (_, prefix, content: string) => {
		const cleanContent = content
			.split('\n')
			.map((line) => line.replace(/^\^\s*/, '').trim())
			.filter(Boolean)
			.join('<br>');

		return `${prefix}<div class="govuk-inset-text">${cleanContent}</div>`;
	});

	text = text.replace(/^##\s*(.+)$/gm, '<h3 class="govuk-heading-s">$1</h3>');

	text = text.replace(
		/^---$/gm,
		'<hr class="govuk-section-break govuk-section-break--m govuk-section-break--visible">'
	);

	text = text.replace(/\[([^\]]+)\]\(((?:[^()]|\([^()]*\))*)\)/g, (match, label: string, url: string) => {
		const isSafeProtocol = /^(?:https?:\/\/|mailto:)/i.test(url);
		if (!isSafeProtocol) {
			return label;
		}
		return `<a class="govuk-link" href="${url}" target="_blank" rel="noopener noreferrer">${label}</a>`;
	});

	text = text.replace(/^[ \t]*\*[ \t]*.*(?:\n[ \t]*\*[ \t]*.*)*/gm, (match) => {
		const items = match
			.split('\n')
			.map((line) => line.replace(/^[ \t]*\*[ \t]*/, '').trim())
			.filter(Boolean)
			.map((item) => `<li>${item}</li>`)
			.join('');
		return `<ul class="govuk-list govuk-list--bullet">${items}</ul>`;
	});

	const blocks = text.split(/\n{2,}/);
	const htmlBlocks = blocks.map((block) => {
		const trimmed = block.trim();
		if (!trimmed) return '';

		if (/^<(h3|div|ul|hr)/.test(trimmed)) {
			return trimmed;
		}

		return `<p class="govuk-body">${trimmed.replace(/\n/g, '<br>')}</p>`;
	});

	return htmlBlocks.filter(Boolean).join('\n');
}
