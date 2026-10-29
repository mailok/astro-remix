import type { Handle, RemixNode } from 'remix/component';

declare global {
	namespace astroHTML.JSX {
		type LibraryManagedAttributes<Component, Props> = Component extends (
			handle: Handle<infer ComponentProps, any>,
		) => () => RemixNode
			? ComponentProps extends Record<string, never>
				? {}
				: ComponentProps
			: Props;
	}
}

export {};
