import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { before, describe, it } from 'node:test';
import { astro, basic } from './helpers.mjs';

describe('Astro build', () => {
	let html;
	before(async () => {
		await astro(['build']);
		html = await readFile(new URL('dist/index.html', basic), 'utf8');
	});
	it('emits five directive types, nested islands, and static content', () => {
		for (const directive of ['load', 'idle', 'visible', 'media', 'only'])
			assert.match(html, new RegExp(`client="${directive}"`));
		assert.match(html, /data-counter="static"/);
		assert.match(html, /Named slot/);
		assert.match(html, /Static slot/);
		assert.doesNotMatch(html, /<\/?astro-static-slot(?:\s|>)/);
	});
	it('emits SSR CSS without a synthetic head or Remix application bootstrap', () => {
		assert.equal((html.match(/<head>/g) ?? []).length, 1);
		assert.match(html, /data-rmx-style=/);
		assert.match(html, /@media/);
		assert.doesNotMatch(html, /X-Remix-Frame|data-rmx-data|remix\/router/);
	});
});

describe('Official integrations coexistence', () => {
	it('builds Remix together with React, Preact, Solid, Svelte and Vue', async () => {
		const root = new URL('./fixtures/mixed/', import.meta.url);
		await astro(['build'], root);
		const html = await readFile(new URL('dist/index.html', root), 'utf8');
		for (const framework of [
			'remix',
			'react',
			'preact',
			'solid',
			'svelte',
			'vue',
			'remix-in-react',
		]) {
			assert.match(html, new RegExp(`data-framework="${framework}"`));
		}
	});
	it('claims Remix components before earlier renderers can execute their setup', async () => {
		const root = new URL('./fixtures/renderer-order/', import.meta.url);
		await astro(['build'], root);
		const html = await readFile(new URL('dist/index.html', root), 'utf8');
		assert.equal((html.match(/data-foreign-setups="0"/g) ?? []).length, 2);
	});
});
