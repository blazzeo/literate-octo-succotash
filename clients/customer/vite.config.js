/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// More info at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon
export default defineConfig({
	base: '/',
	plugins: [react(), tailwindcss()],
	server: {
		host: 'shop.emarket.com',
		port: 8011,
		cors: {
			origin: [
				'http://localhost:8010',
				'http://localhost:8011',
				'http://localhost:8012',
				'http://localhost:8013'
			],
			credentials: true
		}
	},
});
