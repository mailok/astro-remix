import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import preact from '@astrojs/preact';
import solid from '@astrojs/solid-js';
import svelte from '@astrojs/svelte';
import vue from '@astrojs/vue';
import remix from 'astro-remix';
import { fileURLToPath } from 'node:url';

export default defineConfig({
	integrations: [
		remix({ include: '**/components/remix/**' }),
		react({ include: '**/components/react/**' }),
		preact({ include: '**/components/preact/**' }),
		solid({ include: '**/components/solid/**' }),
		svelte(),
		vue(),
	],
	devToolbar: { enabled: false },
	vite: { server: { fs: { allow: [fileURLToPath(new URL('../../../', import.meta.url))] } } },
});
