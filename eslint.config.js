import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import checkFile from 'eslint-plugin-check-file';
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
		files: ['**/*.{js,ts}'],
		plugins: {
			'check-file': checkFile
		},
		rules: {
			'check-file/filename-naming-convention': [
				'error',
				{
					'**/*.{js,ts}': 'KEBAB_CASE'
				},
				{
					ignoreMiddleExtensions: true
				}
			],
			'check-file/folder-naming-convention': [
				'error',
				{
					'**/*': 'KEBAB_CASE'
				}
			]
		}
	},
	{
		files: ['**/*.ts'],
		plugins: {
			'@typescript-eslint': tseslint.plugin
		},
		rules: {
			'@typescript-eslint/consistent-type-imports': 'error'
		}
	}
]);
