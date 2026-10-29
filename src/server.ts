import type { AstroComponentMetadata, NamedSSRLoadedRendererValue } from 'astro';
import { createElement, unsafeHTML } from 'remix/component';
import type { ElementType } from 'remix/component';
import { renderToString } from 'remix/component/server';
import { isRemixComponent } from './component.js';
import { packageName } from './package-name.js';
import { createIslandElement } from './slots.js';
import type { Props, Slots } from './slots.js';
import { normalizeSSRStyles } from './ssr-styles.js';

async function renderToStaticMarkup(
	Component: ElementType,
	props: Props,
	slots: Slots,
	metadata?: AstroComponentMetadata,
) {
	const hydrate = metadata?.astroStaticSlot ? Boolean(metadata.hydrate) : true;
	const node = createIslandElement(Component, props, slots, (value, name) =>
		createElement(hydrate ? 'astro-slot' : 'astro-static-slot', {
			name,
			innerHTML: unsafeHTML(value),
		}),
	);
	return { html: normalizeSSRStyles(await renderToString(node)) };
}

const renderer: NamedSSRLoadedRendererValue = {
	name: packageName,
	check: async (Component) => isRemixComponent(Component),
	renderToStaticMarkup,
	supportsAstroStaticSlot: true,
};

export default renderer;
