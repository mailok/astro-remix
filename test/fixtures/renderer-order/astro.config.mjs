import { defineConfig } from 'astro/config';
import solid from '@astrojs/solid-js';
import remix from 'astro-remix';
import { fileURLToPath } from 'node:url';

export default defineConfig({
	integrations: [
		solid({ include: '**/components/solid/**' }),
		remix({ include: '**/components/remix/**' }),
	],
	devToolbar: { enabled: false },
	vite: { server: { fs: { allow: [fileURLToPath(new URL('../../../', import.meta.url))] } } },
});
