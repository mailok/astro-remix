import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { after, afterEach, before, beforeEach, describe, it } from 'node:test';
import { chromium } from 'playwright';
import { astro, basic, start } from './helpers.mjs';

for (const mode of ['dev', 'preview']) {
	describe(`Browser integration (${mode})`, () => {
		let browser, server, page, errors;
		before(async () => {
			if (mode === 'preview') await astro(['build']);
			server = await start(mode, basic, mode === 'dev' ? 4510 : 4511);
			browser = await chromium.launch({
				headless: true,
				executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined,
			});
		});
		after(async () => {
			await browser?.close();
			await server?.stop();
		});
		beforeEach(async () => {
			page = await browser.newPage({ viewport: { width: 900, height: 700 } });
			page.setDefaultTimeout(15000);
			errors = [];
			page.on('pageerror', (error) => errors.push(error.message));
			page.on('console', (msg) => {
				if (msg.type() === 'error') errors.push(msg.text());
			});
		});
		afterEach(async () => {
			await page?.close();
			assert.deepEqual(errors, [], 'No browser errors or hydration mismatches');
		});

		async function ready(name) {
			await page.waitForFunction((name) => {
				const island = document.querySelector(`[data-counter="${name}"]`)?.closest('astro-island');
				return island && !island.hasAttribute('ssr');
			}, name);
		}
		const counter = (name) => page.locator(`[data-counter="${name}"]`);
		const css = (name, property) =>
			counter(name).evaluate((el, property) => getComputedStyle(el)[property], property);

		it('renders CSS without JavaScript, including deferred islands and media queries', async () => {
			const context = await browser.newContext({
				javaScriptEnabled: false,
				viewport: { width: 500, height: 700 },
			});
			try {
				const staticPage = await context.newPage();
				await staticPage.goto(server.url);
				for (const name of ['static', 'load', 'media', 'visible', 'nested']) {
					const style = await staticPage.locator(`[data-counter="${name}"]`).evaluate((el) => ({
						color: getComputedStyle(el).color,
						padding: getComputedStyle(el).padding,
					}));
					assert.deepEqual(style, { color: 'rgb(102, 51, 153)', padding: '8px' });
				}
				assert.equal(await staticPage.locator('head').count(), 1);
				assert.equal(await staticPage.getByText('Loading', { exact: true }).count(), 1);
			} finally {
				await context.close();
			}
		});

		it('hydrates load/idle/only and keeps static, media and invisible components unhydrated', async () => {
			await page.goto(server.url);
			for (const name of ['load', 'idle', 'only', 'nested']) await ready(name);
			for (const name of ['static', 'load', 'idle', 'only'])
				await counter(name).getByRole('button', { name: 'Increment', exact: true }).click();
			assert.deepEqual(await page.locator('[data-counter] output').allTextContents(), [
				'1',
				'3',
				'4',
				'4',
				'6',
				'6',
				'7',
			]);
			assert.equal(
				await counter('media').evaluate((el) => el.closest('astro-island').hasAttribute('ssr')),
				true,
			);
			assert.equal(
				await counter('visible').evaluate((el) => el.closest('astro-island').hasAttribute('ssr')),
				true,
			);
			assert.equal(await page.getByText('Loading', { exact: true }).count(), 0);
		});

		it('hydrates media and visible only when their conditions are met, keeping CSS before and after', async () => {
			await page.goto(server.url);
			await ready('load');
			assert.equal(await css('media', 'color'), 'rgb(102, 51, 153)');
			assert.equal(await css('visible', 'color'), 'rgb(102, 51, 153)');
			await page.setViewportSize({ width: 1300, height: 700 });
			await ready('media');
			await counter('media').getByRole('button').click();
			assert.equal(await counter('media').locator('output').textContent(), '5');
			await counter('visible').scrollIntoViewIfNeeded();
			await ready('visible');
			await counter('visible').getByRole('button').click();
			assert.equal(await counter('visible').locator('output').textContent(), '8');
			await page.mouse.move(0, 0);
			assert.equal(await css('visible', 'color'), 'rgb(102, 51, 153)');
			await counter('visible').hover();
			assert.equal(await css('visible', 'color'), 'rgb(0, 100, 0)');
		});

		it('reuses SSR DOM and preserves nested island nodes across hydration and parent updates', async () => {
			let release;
			const gate = new Promise((resolve) => {
				release = resolve;
			});
			await page.route(
				/\/(?:_astro\/(?:Counter|Slots)[^/]*\.js|src\/components\/(?:Counter|Slots)\.tsx)(?:\?|$)/,
				async (route) => {
					await gate;
					await route.continue();
				},
			);
			await page.goto(server.url, { waitUntil: 'domcontentloaded' });
			await page.evaluate(() => {
				window.beforeNodes = {
					root: document.querySelector('[data-counter="load"]'),
					nested: document.querySelector('[data-counter="nested"]'),
					button: document.querySelector('[data-counter="nested"] button'),
				};
			});
			release();
			await ready('load');
			await ready('nested');
			assert.equal(
				await page.evaluate(
					() =>
						window.beforeNodes.root === document.querySelector('[data-counter="load"]') &&
						window.beforeNodes.nested === document.querySelector('[data-counter="nested"]') &&
						window.beforeNodes.button === document.querySelector('[data-counter="nested"] button'),
				),
				true,
			);
			await counter('nested').getByRole('button').click();
			await page.getByRole('button', { name: 'Parent 0', exact: true }).first().click();
			assert.equal(await counter('nested').locator('output').textContent(), '7');
			assert.equal(await page.getByText('Named slot', { exact: true }).count(), 1);
			assert.equal(
				await page.evaluate(
					() => window.beforeNodes.nested === document.querySelector('[data-counter="nested"]'),
				),
				true,
			);
		});

		it('updates existing roots without duplicating subscriptions or click handlers', async () => {
			await page.goto(server.url);
			await ready('load');
			const setups = await page.evaluate(() => window.lifecycle.setups);
			await counter('load').evaluate((el) =>
				el
					.closest('astro-island')
					.setAttribute('props', JSON.stringify({ name: [0, 'renamed'], initialCount: [0, 20] })),
			);
			await ready('renamed');
			await counter('renamed').getByRole('button').click();
			assert.equal(await counter('renamed').locator('output').textContent(), '3');
			assert.equal(await page.evaluate(() => window.lifecycle.setups), setups);
		});

		it('disposes roots during Astro navigation without removing styles needed on the next page', async () => {
			await page.goto(server.url);
			await ready('load');
			await ready('nested');
			const setups = await page.evaluate(() => window.lifecycle.setups);
			await page.getByRole('link', { name: 'Other page', exact: true }).click();
			await ready('other');
			assert.ok(await page.evaluate((setups) => window.lifecycle.cleanups >= setups, setups));
			assert.equal(await css('other', 'color'), 'rgb(102, 51, 153)');
			await counter('other').getByRole('button').click();
			assert.equal(await counter('other').locator('output').textContent(), '9');
		});

		it('hydrates Remix components inside MDX pages', async () => {
			await page.goto(`${server.url}/example/`);
			await ready('mdx');
			await counter('mdx').getByRole('button').click();
			assert.equal(await counter('mdx').locator('output').textContent(), '10');
		});

		it('reports asynchronous component render failures to the browser', async () => {
			await page.goto(server.url + '/error/');
			await page.waitForFunction(() => !document.querySelector('astro-island').hasAttribute('ssr'));
			const failure = page.waitForEvent('pageerror');
			await page.getByRole('button', { name: 'Fail render', exact: true }).click();
			assert.equal((await failure).message, 'Remix render failed');
			assert.ok(errors.length > 0);
			assert.ok(errors.splice(0).every((message) => message.includes('Remix render failed')));
		});

		if (mode === 'dev')
			it('refreshes supported Remix components and CSS without resetting compatible state', async () => {
				const source = new URL('src/components/Counter.tsx', basic);
				const original = await readFile(source, 'utf8');
				// Linux file watchers can drop a write that closely follows the previous one.
				async function edit(content, applied) {
					for (let attempt = 1; ; attempt++) {
						await writeFile(source, content);
						try {
							return await page.waitForFunction(applied, undefined, { timeout: 3000 });
						} catch (error) {
							if (attempt === 5) throw error;
						}
					}
				}
				try {
					await page.goto(server.url);
					await ready('load');
					await counter('load').getByRole('button').click();
					await edit(
						original.replace('{handle.props.name}</h2>', '{handle.props.name} refreshed</h2>'),
						() =>
							document.querySelector('[data-counter="load"] h2')?.textContent === 'load refreshed',
					);
					assert.equal(await counter('load').locator('output').textContent(), '3');
					await page.mouse.move(0, 0);
					await edit(
						original.replace('rgb(102, 51, 153)', 'rgb(128, 0, 0)'),
						() =>
							getComputedStyle(document.querySelector('[data-counter="load"]')).color ===
							'rgb(128, 0, 0)',
					);
					assert.equal(await counter('load').locator('output').textContent(), '3');
				} finally {
					await writeFile(source, original);
				}
			});
	});
}
