import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createElement, css } from 'remix/component';
import renderer from '../../dist/server.js';
import { defineRemixComponent } from '../../dist/component.js';

describe('Remix server renderer', () => {
	it('detects branded components without executing setup or claiming other frameworks', async () => {
		let executions = 0;
		const Component = defineRemixComponent(() => {
			executions++;
			return () => 'ok';
		});
		assert.equal(await renderer.check(Component), true);
		assert.equal(Component[Symbol.for('astro:renderer')], 'astro-remix');
		assert.equal(executions, 0);
		for (const other of [() => null, class Other {}, { setup() {} }, null, 'div']) {
			assert.equal(await renderer.check(other), false);
		}
	});
	it('preserves generated styles without nesting a head inside the island', async () => {
		const style = css({ color: 'red', '&:hover': { color: 'blue' } });
		const Component = () => () => createElement('p', { mix: style }, 'Hello');
		const { html } = await renderer.renderToStaticMarkup(Component, {}, {});
		assert.match(html, /<style data-rmx-style=/);
		assert.match(html, /&:hover/);
		assert.doesNotMatch(html, /<\/?head>/);
	});
	it('coerces Astro String objects and handles camel-case named slots without mutating props', async () => {
		const props = Object.freeze({ title: 'Title' });
		const Component = (handle) => () =>
			createElement('div', {}, handle.props.headerTitle, handle.props.children);
		const { html } = await renderer.renderToStaticMarkup(
			Component,
			props,
			{
				'header-title': new String('<h1>Heading</h1>'),
				default: new String('<p>Child</p>'),
			},
			{ astroStaticSlot: true, hydrate: 'load' },
		);
		assert.match(html, /<astro-slot name="header-title"><h1>Heading<\/h1><\/astro-slot>/);
		assert.match(html, /<astro-slot><p>Child<\/p><\/astro-slot>/);
		assert.deepEqual(props, { title: 'Title' });
	});
	it('uses static slots for unhydrated components and omits empty wrappers', async () => {
		const Component = (handle) => () =>
			createElement('div', {}, handle.props.children, handle.props.empty);
		const { html } = await renderer.renderToStaticMarkup(
			Component,
			{},
			{ default: '<span>SSR</span>', empty: '  ' },
			{ astroStaticSlot: true },
		);
		assert.match(html, /astro-static-slot/);
		assert.doesNotMatch(html, /name="empty"/);
	});
	it('escapes hostile slot names and never treats them as attributes or tags', async () => {
		const name = 'tab"><b id="injected">x</b><i title="';
		const Component = (handle) => () => Object.values(handle.props);
		const { html } = await renderer.renderToStaticMarkup(Component, {}, { [name]: '<p>Safe</p>' });
		assert.doesNotMatch(html, /<b id="injected">/);
		assert.match(html, /&quot;/);
	});
	it('preserves normal children props and propagates application render errors', async () => {
		const Component = (handle) => () => handle.props.children;
		assert.equal(
			(await renderer.renderToStaticMarkup(Component, { children: 'From props' }, {})).html,
			'From props',
		);
		await assert.rejects(
			() =>
				renderer.renderToStaticMarkup(
					() => {
						throw new Error('Application failed');
					},
					{},
					{},
				),
			/Application failed/,
		);
	});
});
