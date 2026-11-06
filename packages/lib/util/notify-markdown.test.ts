import { describe, it } from 'node:test';
import assert from 'node:assert';
import { notifyMarkdownToHtml } from './notify-markdown.ts';

describe('notifyMarkdownToHtml', () => {
	describe('edge cases and sanitisation', () => {
		it('returns an empty string when given an empty or falsy input', () => {
			assert.strictEqual(notifyMarkdownToHtml(''), '');
			assert.strictEqual(notifyMarkdownToHtml(undefined as unknown as string), '');
			assert.strictEqual(notifyMarkdownToHtml(null as unknown as string), '');
		});

		it('normalises escaped newlines (\\r\\n and \\r\\n) and trims whitespace', () => {
			const raw = '  \\r\\n\\r\\nParagraph 1\\r\\n\\r\\nParagraph 2  ';
			const expected = '<p class="govuk-body">Paragraph 1</p>\n<p class="govuk-body">Paragraph 2</p>';

			assert.strictEqual(notifyMarkdownToHtml(raw), expected);
		});

		it('normalises standard CRLF line endings (\\r\\n)', () => {
			const raw = 'Paragraph 1\r\n\r\nParagraph 2';
			const expected = '<p class="govuk-body">Paragraph 1</p>\n<p class="govuk-body">Paragraph 2</p>';

			assert.strictEqual(notifyMarkdownToHtml(raw), expected);
		});
	});

	describe('headings', () => {
		it('converts markdown headings (##) into GOV.UK small headings', () => {
			const raw = '## Before you submit your application';
			const expected = '<h3 class="govuk-heading-s">Before you submit your application</h3>';

			assert.strictEqual(notifyMarkdownToHtml(raw), expected);
		});

		it('handles headings with trailing whitespace cleanly', () => {
			const raw = '## Contact us   ';
			const expected = '<h3 class="govuk-heading-s">Contact us</h3>';

			assert.strictEqual(notifyMarkdownToHtml(raw).trim(), expected);
		});
	});

	describe('horizontal rules', () => {
		it('converts markdown horizontal rules (---) into visible GOV.UK section breaks', () => {
			const raw = 'Section above\n\n---\n\nSection below';
			const expected = [
				'<p class="govuk-body">Section above</p>',
				'<hr class="govuk-section-break govuk-section-break--m govuk-section-break--visible">',
				'<p class="govuk-body">Section below</p>'
			].join('\n');

			assert.strictEqual(notifyMarkdownToHtml(raw), expected);
		});
	});

	describe('links', () => {
		it('converts markdown links to GOV.UK links opening in a new tab', () => {
			const raw = 'Read our [guidance on S62A](https://www.gov.uk/guidance).';
			const expected =
				'<p class="govuk-body">Read our <a class="govuk-link" href="https://www.gov.uk/guidance" target="_blank" rel="noopener noreferrer">guidance on S62A</a>.</p>';

			assert.strictEqual(notifyMarkdownToHtml(raw), expected);
		});

		it('supports multiple links within the same paragraph', () => {
			const raw = 'See [Link A](https://example.com/a) and [Link B](https://example.com/b).';
			const expected =
				'<p class="govuk-body">See <a class="govuk-link" href="https://example.com/a" target="_blank" rel="noopener noreferrer">Link A</a> and <a class="govuk-link" href="https://example.com/b" target="_blank" rel="noopener noreferrer">Link B</a>.</p>';

			assert.strictEqual(notifyMarkdownToHtml(raw), expected);
		});
	});

	describe('bullet lists', () => {
		it('converts contiguous asterisk lines into an unordered GOV.UK bullet list', () => {
			const raw = '* Item one\n* Item two\n* Item three';
			const expected =
				'<ul class="govuk-list govuk-list--bullet"><li>Item one</li><li>Item two</li><li>Item three</li></ul>';

			assert.strictEqual(notifyMarkdownToHtml(raw), expected);
		});

		it('supports links embedded inside bullet list items', () => {
			const raw = '* Read the [guidance](https://www.gov.uk)\n* Download forms';
			const expected =
				'<ul class="govuk-list govuk-list--bullet"><li>Read the <a class="govuk-link" href="https://www.gov.uk" target="_blank" rel="noopener noreferrer">guidance</a></li><li>Download forms</li></ul>';

			assert.strictEqual(notifyMarkdownToHtml(raw), expected);
		});
	});

	describe('inset text blocks (^)', () => {
		it('converts single-line inset text blocks', () => {
			const raw = '^Important notice here';
			const expected = '<div class="govuk-inset-text">Important notice here</div>';

			assert.strictEqual(notifyMarkdownToHtml(raw), expected);
		});

		it('converts multiline inset text blocks separated by <br> tags', () => {
			const raw = ['^Planning Inspectorate', 'c/o QUADIENT', '69 Buckingham Avenue', 'Slough', 'SL1 4PN'].join('\n');

			const expected =
				'<div class="govuk-inset-text">Planning Inspectorate<br>c/o QUADIENT<br>69 Buckingham Avenue<br>Slough<br>SL1 4PN</div>';

			assert.strictEqual(notifyMarkdownToHtml(raw), expected);
		});

		it('strips redundant leading carets on subsequent inset lines', () => {
			const raw = ['^Line 1', '^Line 2', '^Line 3'].join('\n');

			const expected = '<div class="govuk-inset-text">Line 1<br>Line 2<br>Line 3</div>';

			assert.strictEqual(notifyMarkdownToHtml(raw), expected);
		});

		it('properly terminates an inset block when followed by an empty line and a new heading', () => {
			const raw = ['^Planning Inspectorate', 'Slough', '', '## Contact us'].join('\n');

			const expected = [
				'<div class="govuk-inset-text">Planning Inspectorate<br>Slough</div>',
				'<h3 class="govuk-heading-s">Contact us</h3>'
			].join('\n');

			assert.strictEqual(notifyMarkdownToHtml(raw), expected);
		});
	});

	describe('paragraphs and text wrapping', () => {
		it('wraps plain text blocks in <p class="govuk-body">', () => {
			const raw = 'This is a standard paragraph.';
			const expected = '<p class="govuk-body">This is a standard paragraph.</p>';

			assert.strictEqual(notifyMarkdownToHtml(raw), expected);
		});

		it('converts single line breaks within a paragraph to <br> tags', () => {
			const raw = 'From,\nPlanning & Environmental Applications Service';
			const expected = '<p class="govuk-body">From,<br>Planning & Environmental Applications Service</p>';

			assert.strictEqual(notifyMarkdownToHtml(raw), expected);
		});

		it('does not re-wrap existing block elements in <p> tags', () => {
			const raw = '## Heading\n\n* Item 1\n* Item 2\n\n---\n\n^Inset block';
			const result = notifyMarkdownToHtml(raw);

			assert.ok(!result.includes('<p class="govuk-body"><h3'));
			assert.ok(!result.includes('<p class="govuk-body"><ul'));
			assert.ok(!result.includes('<p class="govuk-body"><hr'));
			assert.ok(!result.includes('<p class="govuk-body"><div'));
		});
	});

	describe('full document integration', () => {
		it('accurately parses a composite GOV.UK Notify email document', () => {
			const rawEmail = [
				'Dear John Smith,',
				'',
				'Thank you for notifying us of your intention to submit a Section 62A application.',
				'',
				'## Before you submit',
				'',
				'* Read our [guidance](https://www.gov.uk/guidance).',
				'* Download the relevant form.',
				'',
				'Use our updated address on your notice instead:',
				'',
				'^Planning Inspectorate',
				'c/o QUADIENT',
				'Slough',
				'SL1 4PN',
				'',
				'## Contact us',
				'',
				'If you have questions, email section62a@planninginspectorate.gov.uk.',
				'',
				'---',
				'',
				'Confidentiality notice applies.'
			].join('\n');

			const expected = [
				'<p class="govuk-body">Dear John Smith,</p>',
				'<p class="govuk-body">Thank you for notifying us of your intention to submit a Section 62A application.</p>',
				'<h3 class="govuk-heading-s">Before you submit</h3>',
				'<ul class="govuk-list govuk-list--bullet"><li>Read our <a class="govuk-link" href="https://www.gov.uk/guidance" target="_blank" rel="noopener noreferrer">guidance</a>.</li><li>Download the relevant form.</li></ul>',
				'<p class="govuk-body">Use our updated address on your notice instead:</p>',
				'<div class="govuk-inset-text">Planning Inspectorate<br>c/o QUADIENT<br>Slough<br>SL1 4PN</div>',
				'<h3 class="govuk-heading-s">Contact us</h3>',
				'<p class="govuk-body">If you have questions, email section62a@planninginspectorate.gov.uk.</p>',
				'<hr class="govuk-section-break govuk-section-break--m govuk-section-break--visible">',
				'<p class="govuk-body">Confidentiality notice applies.</p>'
			].join('\n');

			assert.strictEqual(notifyMarkdownToHtml(rawEmail), expected);
		});
	});
});
