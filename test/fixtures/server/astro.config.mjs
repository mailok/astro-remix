import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import remix from 'astro-remix';
export default defineConfig({
	output: 'server',
	adapter: node({ mode: 'standalone' }),
	integrations: [remix()],
	devToolbar: { enabled: false },
});
