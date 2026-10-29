import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { it } from 'node:test';

it('embeds every original source in distributed sourcemaps', async () => {
	const dist = new URL('../../dist/', import.meta.url);
	const maps = (await readdir(dist)).filter((file) => file.endsWith('.js.map'));
	assert.ok(maps.length > 0);
	for (const file of maps) {
		const map = JSON.parse(await readFile(new URL(file, dist), 'utf8'));
		assert.equal(map.sourcesContent?.length, map.sources.length, file);
		for (const [index, source] of map.sources.entries()) {
			assert.equal(
				map.sourcesContent[index],
				await readFile(new URL(source, new URL(file, dist)), 'utf8'),
				file + ': ' + source,
			);
		}
	}
});
