/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// More info at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon
export default defineConfig({
	base: '/',
	plugins: [react(), tailwindcss()],
	server: {
		host: 'auth.emarket.com',
		port: 8010
		// cors: true
	},
});
