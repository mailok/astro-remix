import { createElement, createRoot } from 'remix/component';
import type { ElementType, VirtualRoot } from 'remix/component';
import { packageName } from './package-name.js';
import { createIslandElement } from './slots.js';
import type { Props, Slots } from './slots.js';
import StaticHtml from './static-html.js';

const roots = new WeakMap<HTMLElement, VirtualRoot>();

export default (element: HTMLElement) =>
	async (Component: ElementType, props: Props, slots: Slots, { client }: { client: string }) => {
		let root = roots.get(element);
		if (!root && !element.hasAttribute('ssr')) return;

		if (!root) {
			if (client === 'only') element.replaceChildren();
			root = createRoot(element);
			root.addEventListener('error', (event) => {
				if (typeof globalThis.reportError === 'function') globalThis.reportError(event.error);
				else console.error(`[${packageName}]`, event.error);
			});
			roots.set(element, root);
			element.addEventListener(
				'astro:unmount',
				() => {
					roots.get(element)?.dispose();
					roots.delete(element);
				},
				{ once: true },
			);
		}

		root.render(
			createIslandElement(Component, props, slots, (value, name) =>
				createElement(StaticHtml, { value, name }),
			),
		);
		root.flush();
	};
