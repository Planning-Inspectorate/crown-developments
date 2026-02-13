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
	...tseslint.configs.recommended.map((config) => ({
		...config,
		files: ['**/*.ts']
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
		rules: {
			'@typescript-eslint/consistent-type-imports': 'error'
		}
	}
]);
