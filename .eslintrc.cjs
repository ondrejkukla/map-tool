module.exports = {
	root: true,
	env: {
		browser: true,
		es2020: true,
	},
	extends: [
		'eslint:recommended',
		'plugin:@typescript-eslint/recommended',
		'plugin:react/recommended',
		'plugin:react-hooks/recommended',
		'prettier', // Disables ESLint rules that conflict with Prettier
		'plugin:prettier/recommended', // Enables eslint-plugin-prettier and eslint-config-prettier
	],
	parser: '@typescript-eslint/parser',
	parserOptions: {
		ecmaVersion: 2020,
		sourceType: 'module',
		ecmaFeatures: {
			jsx: true,
		},
	},
	settings: {
		react: {
			version: 'detect',
		},
	},
	rules: {
		'linebreak-style': ['error', 'unix'],
		'prettier/prettier': [
			'error',
			{
				tabWidth: 4,
				useTabs: true,
				singleQuote: true,
				trailingComma: 'es5',
				jsxBracketSameLine: false,
				printWidth: 80,
			},
		],
		'react/react-in-jsx-scope': 'off',
		// Add any additional rules here if necessary
	},
	ignorePatterns: ['node_modules', 'dist'],
};
