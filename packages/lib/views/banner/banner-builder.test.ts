import { describe, it } from 'node:test';
import assert from 'node:assert';
import { BannerBuilder } from './banner-builder.ts';

describe('BannerBuilder', () => {
	it('should return null when no messages are added', () => {
		const result = new BannerBuilder().build();

		assert.strictEqual(result, null);
	});

	it('should return single text message without html wrapping', () => {
		const result = new BannerBuilder().addInfoText('Saved draft').build();

		assert.deepStrictEqual(result, { type: 'info', text: 'Saved draft' });
	});

	it('should render single trusted single-line html as a heading paragraph', () => {
		const result = new BannerBuilder()
			.addInfoTrustedSingleLineHtml('<a href="https://test.com">Application linked</a>')
			.build();

		assert.deepStrictEqual(result, {
			type: 'info',
			html: '<p class="govuk-notification-banner__heading"><a href="https://test.com">Application linked</a></p>'
		});
	});

	it('should render single trusted single-line html success as a heading paragraph', () => {
		const result = new BannerBuilder().addSuccessTrustedSingleLineHtml('Application published').build();

		assert.deepStrictEqual(result, {
			type: 'success',
			html: '<p class="govuk-notification-banner__heading">Application published</p>'
		});
	});

	it('should escape text when rendering multiple messages', () => {
		const result = new BannerBuilder().addInfoText('<b>Unsafe</b>').addInfoText('Safe').build();

		assert.deepStrictEqual(result, {
			type: 'info',
			html: '<ul class="govuk-list govuk-list--bullet"><li><p class="govuk-body">&lt;b&gt;Unsafe&lt;/b&gt;</p></li><li><p class="govuk-body">Safe</p></li></ul>'
		});
	});

	it('should prefer success type and order success messages before info messages', () => {
		const result = new BannerBuilder()
			.addInfoText('Info one')
			.addSuccessText('Success one')
			.addInfoText('Info two')
			.addSuccessTrustedHtml('<strong>Success two</strong>')
			.build();

		assert.deepStrictEqual(result, {
			type: 'success',
			html: '<ul class="govuk-list govuk-list--bullet"><li><p class="govuk-body">Success one</p></li><li><strong>Success two</strong></li><li><p class="govuk-body">Info one</p></li><li><p class="govuk-body">Info two</p></li></ul>'
		});
	});

	it('should render linked case message with trusted anchor html', () => {
		const result = new BannerBuilder().addLinkedCase('<a href="/cases/1">case</a>').build();

		assert.deepStrictEqual(result, {
			type: 'info',
			html: '<p class="govuk-notification-banner__heading">This application is connected to a <a href="/cases/1">case</a>.</p>'
		});
	});
});
