const assert = require('assert');
const { getDetailedInformation } = require('./controller');
const { describe, it } = require('node:test');

// Mocking the render method in the response object
describe('detailed information controller', () => {
	describe('getDetailedInformation', () => {
		it('should render the detailed information page', () => {
			const req = {};
			const res = {
				renderCalledWith: {},
				render(viewName, data) {
					this.renderCalledWith = { viewName, data };
				}
			};

			getDetailedInformation(req, res);

			assert.strictEqual(res.renderCalledWith.viewName, 'detailed-information/view.njk');
			assert.ok(res.renderCalledWith.data.pageTitle);
			assert.ok(res.renderCalledWith.data.introDescription);
			assert.ok(res.renderCalledWith.data.chevrons.length, 3);
		});
	});
});
