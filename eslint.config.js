import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import eslintConfigPrettier from 'eslint-config-prettier';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig([
	js.configs.recommended,
	{
		languageOptions: {
			ecmaVersion: 2025,
			sourceType: 'module',
			globals: globals.node
		}
	},
	...tseslint.configs.recommendedTypeChecked.map((config) => ({
		...config,
		files: ['**/*.ts'],
		ignores: ['**/*.d.ts'],
		languageOptions: {
			parser: tseslint.parser,
			parserOptions: {
				projectService: true,
				tsconfigRootDir: import.meta.dirname
			}
		}
	})),
	globalIgnores([
		'.husky',
		'dist/**',
		'node_modules/**',
		'**/*.test.ts',
		'**/.static/**',
		'packages/database/src/client/**'
	]),
	eslintConfigPrettier,
	{
		files: ['**/*.ts'],
		ignores: ['**/*.d.ts'],
		rules: {
			'@typescript-eslint/consistent-type-imports': 'error'
		}
	}
]);
