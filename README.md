# astro-remix

This [Astro integration](https://docs.astro.build/en/guides/integrations-guide/)
enables server-side rendering and client-side hydration for
[Remix 3](https://github.com/remix-run/remix) components, the same way Astro
supports React, Preact, Solid, Svelte and Vue.

Astro owns routing, layouts, endpoints, actions and navigation. Remix owns the
component tree inside each island.

## Installation

Requires Node 24.3 or later, Astro 7.4 or later and Remix 3.1 or later.

### Quick install

```sh
npx astro add astro-remix
```

This installs `astro-remix` and `remix`, and adds the integration to your
`astro.config.*` file.

### Manual install

```sh
npm install astro-remix remix
```

```js
// astro.config.mjs
import { defineConfig } from 'astro/config';
import remix from 'astro-remix';

export default defineConfig({ integrations: [remix()] });
```

## Usage

Write Remix components in `.jsx` or `.tsx` files:

```tsx
// src/components/Counter.tsx
import { css, on } from 'remix/component';
import type { Handle } from 'remix/component';

const style = css({ padding: '1rem', '&:hover': { color: 'rebeccapurple' } });

export function Counter(handle: Handle<{ initialCount?: number }>) {
	let count = handle.props.initialCount ?? 0;

	return () => (
		<button
			mix={[
				style,
				on('click', () => {
					count++;
					handle.update();
				}),
			]}
		>
			{count}
		</button>
	);
}
```

Then use them in Astro components, pages and MDX with any
[client directive](https://docs.astro.build/en/reference/directives-reference/#client-directives):

```astro
---
import { Counter } from '../components/Counter';
---

<Counter initialCount={0} />
<Counter client:load initialCount={1} />
<Counter client:idle initialCount={2} />
<Counter client:visible initialCount={3} />
<Counter client:media="(min-width: 768px)" initialCount={4} />
<Counter client:only="astro-remix" initialCount={5}>
  <p slot="fallback">Loading…</p>
</Counter>
```

Without a directive, Astro renders static HTML and CSS and ships no JavaScript
for the component. Props passed to hydrated components must be serializable by
Astro.

### Styles

CSS created with `css()` is rendered with the island's HTML, so it applies before
JavaScript loads, including for static and deferred islands. Remix adopts those
styles when the island hydrates.

Islands render component markup only. Put titles, metadata and scripts in an
Astro layout.

### Slots

The default slot becomes `handle.props.children`. Named slots become camel-case
props: `slot="header-title"` becomes `handle.props.headerTitle`. Slot content
keeps its existing DOM during hydration, so Astro islands nested inside a Remix
component keep working.

## Options

### `include` / `exclude`

[Picomatch](https://github.com/micromatch/picomatch) patterns that select which
`.jsx` and `.tsx` files are compiled as Remix components. By default, every
`.jsx` and `.tsx` file outside `node_modules` is included.

## Combining multiple JSX frameworks

When you use Remix with React, Preact or Solid, give each integration a
non-overlapping `include` pattern:

```js
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import remix from 'astro-remix';

export default defineConfig({
	integrations: [
		remix({ include: ['**/components/remix/**'] }),
		react({ include: ['**/components/react/**'] }),
	],
});
```

These filters control compilation, not editor types. Add a
`/** @jsxImportSource remix/component */` pragma to Remix files, or use a
per-directory `tsconfig.json`, when another JSX runtime is your project default.
A file with a different `@jsxImportSource` pragma is never compiled as Remix.

## TypeScript

Keep your existing Astro TypeScript configuration. In a project that only uses
Remix, Astro's default `astro/tsconfigs/*` presets work without extra JSX
settings. The integration adds types so that Astro checks component props
inferred from `Handle<Props>`.

## Precompiled components

Components from your project are detected automatically. Components that are
already compiled, such as those from a component library, can opt in explicitly:

```tsx
import { defineRemixComponent } from 'astro-remix/component';
import { ExternalCounter } from 'some-component-library';

export const Counter = defineRemixComponent(ExternalCounter);
```

## Hot module replacement

In development, edits to named component exports refresh in place and keep
compatible component state, following Remix's HMR rules. Other module shapes,
such as default-only exports, fall back to a full page reload.

## Limitations

- `handle.id` values are not prefixed per island. Use explicit IDs when markup
  outside the component must reference an ID that stays stable across server
  rendering and hydration.
- `Frame`, `clientEntry()`, Remix routing and Remix server features are not used;
  Astro provides those capabilities.

## Contributing

```sh
npm ci
npm run typecheck
npm test
npx playwright install chromium
npm run test:browser
```

Browser tests run Astro in development and production and cover every client
directive, nested islands, navigation, HMR, MDX, and coexistence with the
official React, Preact, Solid, Svelte and Vue integrations. Set
`PLAYWRIGHT_CHROMIUM_EXECUTABLE` to use an existing Chromium executable.

To try local changes in another Astro project, run `npm run build` here and
`npm install --install-links ../astro-remix` in that project.

Design notes live in [`docs/`](docs/).

## License

MIT
