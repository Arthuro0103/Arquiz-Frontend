import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // Development-friendly TypeScript rules
      '@typescript-eslint/no-explicit-any': 'off', // Allow during development
      '@typescript-eslint/no-unused-vars': ['warn', { 
        'argsIgnorePattern': '^_',
        'varsIgnorePattern': '^_',
        'destructuredArrayIgnorePattern': '^_',
        'ignoreRestSiblings': true
      }],
      '@typescript-eslint/no-unsafe-function-type': 'warn',
      '@typescript-eslint/no-namespace': 'warn',
      
      // React specific rules - development friendly
      'react/no-unescaped-entities': 'off', // Allow unescaped quotes in development
      'react-hooks/exhaustive-deps': 'warn', // Don't break builds for deps
      
      // General rules
      'prefer-const': 'warn',
      'no-case-declarations': 'warn',
      
      // Allow console logs in all environments for now
      'no-console': 'off',
    },
  },
  {
    // Very lenient rules for test files
    files: ['**/*.test.{js,jsx,ts,tsx}', '**/*.spec.{js,jsx,ts,tsx}', '**/tests/**/*'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      'react-hooks/exhaustive-deps': 'off',
      'no-console': 'off',
    },
  },
  {
    // Lenient rules for type definition files
    files: ['**/*.types.{ts,tsx}', '**/types/**/*'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-namespace': 'off',
    },
  },
  {
    // Lenient rules for hook files
    files: ['**/hooks/**/*', '**/stores/**/*', '**/contexts/**/*'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'warn',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
];

export default eslintConfig;
