import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { astro, start } from './helpers.mjs';

describe('On-demand SSR with the Astro Node adapter', () => {
	const root = new URL('./fixtures/server/', import.meta.url);
	let server;
	before(async () => {
		await astro(['build'], root);
		server = await start('preview', root, 4530);
	});
	after(async () => {
		await server?.stop();
	});
	it('isolates generated styles across concurrent requests', async () => {
		await Promise.all(
			Array.from({ length: 12 }, async (_, index) => {
				const color = index % 2 ? 'red' : 'blue';
				const opposite = color === 'red' ? 'blue' : 'red';
				const response = await fetch(`${server.url}/?color=${color}`);
				assert.equal(response.status, 200);
				const html = await response.text();
				assert.match(html, new RegExp(`color: ${color}`));
				assert.doesNotMatch(html, new RegExp(`color: ${opposite}`));
				assert.equal((html.match(/<head>/g) ?? []).length, 1);
				assert.match(html, /data-rmx-style/);
			}),
		);
	});
});
