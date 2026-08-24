import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';
import { eslintConfig } from '@planning-inspectorate/coding-standards';

export default defineConfig([
	...eslintConfig,
	{
		files: ['**/*.ts'],
		// use a more strict typescript ruleset
		extends: [tseslint.configs.recommendedTypeChecked],
		languageOptions: {
			parserOptions: {
				// requires type information from TypeScript
				// https://typescript-eslint.io/getting-started/typed-linting
				projectService: true,
				tsconfigRootDir: import.meta.dirname
			}
		},
		rules: {
			// add in the type imports rule as per coding-standards
			// coding-standards also allows 'any', but we are more strict and leave that rule as default
			'@typescript-eslint/consistent-type-imports': 'error'
		}
	}
]);
