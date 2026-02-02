export default {
	extends: ['stylelint-config-standard-scss', 'stylelint-config-prettier-scss'],
	plugins: ['stylelint-order', 'stylelint-scss'],
	rules: {
		'max-nesting-depth': 3,
		'selector-max-compound-selectors': 3,
		'selector-class-pattern': [
			'^(govuk-|pins-)?[a-z0-9]+(?:-[a-z0-9]+)*(?:__(?:[a-z0-9]+(?:-[a-z0-9]+)*))?(?:--(?:[a-z0-9]+(?:-[a-z0-9]+)*))?$',
			{
				message:
					'Selector should have govuk- or pins- prefix and use lowercase and separate words with hyphens or underscores (selector-class-pattern)'
			}
		],
		'color-named': 'never',
		'declaration-no-important': true,
		'order/properties-alphabetical-order': true,
		'scss/at-mixin-pattern': '^[a-z0-9\\-]+$',
		'scss/dollar-variable-pattern': '^[a-z0-9\\-]+$',
		'scss/percent-placeholder-pattern': '^[a-z0-9\\-]+$',
		'scss/selector-no-redundant-nesting-selector': true,
		'no-descending-specificity': null
	}
};
