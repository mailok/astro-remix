import { packageName } from './package-name.js';

/** Astro core matches components tagged with this symbol without running any renderer's `check()`. */
const renderer = Symbol.for('astro:renderer');

/** Marks a precompiled Remix component for renderer detection without executing setup. */
export function defineRemixComponent<T extends Function>(component: T): T {
	Object.defineProperty(component, renderer, { value: packageName, configurable: true });
	return component;
}

export function isRemixComponent(component: unknown): component is Function {
	return typeof component === 'function' && Reflect.get(component, renderer) === packageName;
}
