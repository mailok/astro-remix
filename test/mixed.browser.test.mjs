import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { chromium } from 'playwright';
import { astro, start } from './helpers.mjs';

const root = new URL('./fixtures/mixed/', import.meta.url);
for (const mode of ['dev', 'preview']) {
	describe(`Mixed official renderers (${mode})`, () => {
		let browser, server;
		before(async () => {
			if (mode === 'preview') await astro(['build'], root);
			server = await start(mode, root, mode === 'dev' ? 4520 : 4521);
			browser = await chromium.launch({
				headless: true,
				executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined,
			});
		});
		after(async () => {
			await browser?.close();
			await server?.stop();
		});
		it('hydrates all six runtimes and preserves nested islands during a Remix parent update', async () => {
			const page = await browser.newPage();
			const errors = [];
			page.on('pageerror', (error) => errors.push(error.message));
			page.on('console', (msg) => {
				if (msg.type() === 'error') errors.push(msg.text());
			});
			try {
				await page.goto(server.url);
				await page.waitForFunction(() =>
					[...document.querySelectorAll('astro-island')].every(
						(island) => !island.hasAttribute('ssr'),
					),
				);
				for (const framework of [
					'remix',
					'react',
					'preact',
					'solid',
					'svelte',
					'vue',
					'remix-in-react',
				]) {
					const counter = page.locator(`[data-framework="${framework}"]`);
					await counter.getByRole('button').click();
					assert.equal(await counter.locator('output').textContent(), '1', framework);
				}
				await page.getByRole('button', { name: 'Shell 0', exact: true }).click();
				for (const framework of ['remix', 'react', 'preact', 'solid', 'svelte', 'vue']) {
					const counter = page.locator(`[data-framework="${framework}"]`);
					assert.equal(await counter.locator('output').textContent(), '1', framework);
					await counter.getByRole('button').click();
					assert.equal(await counter.locator('output').textContent(), '2', framework);
				}
				assert.deepEqual(errors, []);
			} finally {
				await page.close();
			}
		});
	});
}
