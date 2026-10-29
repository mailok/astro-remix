# Official Astro integrations and the Remix adapter design

The five integrations use the same Astro renderer contract, but their compiler,
detection, slot and lifecycle implementations are framework-specific. A Remix
adapter should reuse Astro's island scheduling rather than introduce a second
application runtime.

This review targets `withastro/astro` commit
`883e672fd0beb575b14776bc842bdee84433e6af`, retrieved on 2026-10-29. Source links
below are pinned to that revision. The package was exercised against installed
Astro 7.4.4 and Remix 3.1.0; reading upstream tests is distinct from running the
complete Astro monorepo suite.

## Common integration contract

All five register a named renderer in `astro:config:setup`, provide server and
client entrypoints, and expose a `container-renderer` entrypoint. Their manifests
separate framework peer dependencies from integration tooling. Config-time Node
code stays outside browser and server-renderer entrypoints.

The server identifies the framework with `check()` and returns `{ html, attrs? }`
from `renderToStaticMarkup()`. Metadata determines whether slot wrappers must
survive for hydration. Astro owns serialization, `client:*` scheduling, fallback
markup and the `astro:unmount` event.

Clients distinguish hydration from `client:only`, remove fallback content when
mounting without SSR, and dispose their framework root on `astro:unmount`. React,
Solid, Svelte and Vue retain an instance/update handle for subsequent prop
updates. No generic renderer should treat every JavaScript function as its own
component.

## Preact

[Package source](https://github.com/withastro/astro/tree/883e672fd0beb575b14776bc842bdee84433e6af/packages/integrations/preact)

- `index.ts` uses `@preact/preset-vite`, propagates include/exclude/Babel options,
  publishes filter options through a virtual module, and supports optional React
  compatibility aliases and debug instrumentation.
- Environment configuration separates client optimization from SSR handling;
  compatibility mode deduplicates the underlying runtime and routes React aliases
  through Vite rather than Node's external-module resolver.
- `server.ts` recognizes Preact classes, applies source filters, and probes
  functional components by rendering. It excludes known foreign shapes and
  suppresses a specific React hook warning during probing. This demonstrates the
  costs and side effects of speculative detection.
- Rendering uses `renderToStringAsync`. A per-SSR-result context seeds an island
  mask for `useId` and serializes shared signals. The client reconstructs shared
  signal identity instead of merely copying their current values.
- `StaticHtml` uses `astro-slot` versus `astro-static-slot` and opts out of updates
  to protect externally owned content. The client chooses `hydrate()` or
  `render()` and tears down using `render(null, element)`.
- Build coverage lives primarily in Astro's core test fixtures: functions,
  classes, TypeScript, fragments, pragmas, `useId`, signals and slots. Shared
  browser tests exercise all directives and development edits.

**Remix consequence:** configure the compiler and optimizer explicitly, keep one
runtime instance, avoid detection by executing setup, and preserve slot DOM.
Preact signal serialization is framework-specific and should not be copied.

## React

[Package source](https://github.com/withastro/astro/tree/883e672fd0beb575b14776bc842bdee84433e6af/packages/integrations/react)

- `index.ts` delegates JSX/Fast Refresh to `@vitejs/plugin-react`, configures
  environment-specific optimizer entries, deduplicates React/ReactDOM, and injects
  the development preamble before hydration. `.astro` files are explicitly
  excluded to protect virtual TypeScript scripts from JSX refresh transforms.
- `version.ts` selects React 17 versus 18/19 renderer entrypoints. Version
  detection reads package metadata rather than importing the runtime too early,
  avoiding a development/production runtime mismatch.
- `server.ts` handles React element brands, class ancestry and filtered function
  probing. It converts named slots, optionally parses React children, and uses a
  per-result identifier prefix. Streaming is buffered to the renderer's HTML
  contract through readable- or pipeable-stream implementations.
- The server strips selected React 19 resource hints from island output. This is
  a concrete precedent for normalizing framework-emitted document metadata at
  the renderer boundary, not evidence that all such metadata should be dropped.
- `client.ts` preserves roots in a WeakMap, shares identifier prefixes, handles
  React action state, and chooses `hydrateRoot()` or `createRoot()`. The static
  slot component is memoized to protect externally owned descendants.
- `actions.ts` is an Astro-specific bridge to React `useActionState`, not a React
  backend. It is separate from the generic component renderer.
- Package tests include component/slot behavior, resource hints, compiler options,
  parsed children and streaming controls. Core browser tests cover directives,
  identifiers, MDX, nested frameworks and HMR.

**Remix consequence:** normalize only the synthetic CSS head; keep CSS itself.
Keep compiler/config imports out of runtime entrypoints, preserve roots and
slots, and do not mistake a successful bundle for editor/type-check support.

## Solid

[Package source](https://github.com/withastro/astro/tree/883e672fd0beb575b14776bc842bdee84433e6af/packages/integrations/solid)

- `index.ts` uses `vite-plugin-solid` with SSR enabled, source filters and optional
  development tools. It crawls framework packages so libraries using Solid export
  conditions pass through the correct SSR transform pipeline.
- `check()` rejects known foreign component shapes and renders synchronously to
  avoid waiting on resources during detection. Production rendering has distinct
  sync/async paths and uses `Suspense` and `NoHydration` according to metadata.
- The renderer tracks an island render ID per SSR result, returns it as an
  attribute, and supplies a hydration bootstrap script once through Astro's
  `renderHydrationScript()` hook.
- The client uses an update store, reconciles changed props, and preserves
  existing slot elements. Its tree walker rejects nested `astro-island` subtrees
  so the outer adapter does not take ownership of their slots.
- Core fixtures cover slots, escaping, server-only rendering, asynchronous work,
  mixed JSX frameworks and browser behavior. Some Solid build/dev suites in this
  revision are explicitly skipped; their presence is not proof of a passing run.

**Remix consequence:** isolate the component boundary, preserve nested ownership,
and avoid introducing any document-level Remix bootstrap just to hydrate a root.
Solid's resource, signal and hydration-script machinery is not portable to Remix.

## Svelte

[Package source](https://github.com/withastro/astro/tree/883e672fd0beb575b14776bc842bdee84433e6af/packages/integrations/svelte)

- `index.ts` registers `@sveltejs/vite-plugin-svelte`, exports `vitePreprocess`, and
  crawls Svelte-peer libraries for SSR transformation. Server optimizer exclusions
  prevent two copies of Svelte's stateful SSR runtime.
- Detection uses Svelte-generated `$$payload`/`$$renderer` parameter names rather
  than rendering an arbitrary function.
- The server uses `svelte/server`, per-result ID prefixes, raw snippets and both
  modern and legacy slot contracts. Slot names are escaped. An explicit
  compatibility normalization removes Svelte's unwanted empty class attributes.
- The client chooses `hydrate()` versus `mount()`, keeps an application map and
  updates a rune-backed prop object, including removal of missing props. It
  calls `unmount()` during Astro cleanup.
- `editor.cts` and the shims adapt Svelte signatures for Astro language tooling,
  including generic props and hydration directives. This is a separate contract
  from successful rendering.
- Package tests cover prop errors, generics, directive types, hostile slot names,
  async/conditional rendering and class normalization. Core browser tests add
  directives, slots, MDX, nesting and updates.

**Remix consequence:** provide explicit detection and prop-type adaptation, test
invalid props as well as valid ones, and do not let duplicate runtime instances
silently break shared state or stylesheet adoption.

## Vue

[Package source](https://github.com/withastro/astro/tree/883e672fd0beb575b14776bc842bdee84433e6af/packages/integrations/vue)

- `index.ts` configures the Vue SFC plugin, optional JSX, a virtual app entrypoint
  and development tools. It directly imports the user's app entrypoint from Vue
  components so Astro can associate its CSS with pages.
- Environment configuration selects optimizer inclusion/exclusion per target.
  Detection checks Vue object shapes (`ssrRender`, `__ssrInlineRender`, `setup`),
  including render-function-only components rather than only template SFCs.
- The server creates an SSR app, seeds its ID prefix, runs app setup and provides
  slots as functions. The client uses `createSSRApp()` or `createApp()`, supports
  async setup with `Suspense`, retains the app and forces updates when props or
  slots change.
- `StaticHtml` explicitly coerces Astro's String-wrapped slot values to primitive
  strings. The package has a regression test for that distinction.
- `editor.cts` and Vue shims provide Astro-facing prop and HTML-attribute types.
  Tests cover application setup/CSS, type checking, multiple renderers and static
  slot behavior; core tests cover directives, MDX, async components and HMR.

**Remix consequence:** coerce Astro slot values, keep document/framework app
initialization outside the island adapter, and test real coexistence rather than
assuming that different file extensions make all combinations safe.

## Standard Astro TypeScript configuration

The Remix JSX plugin handles compilation per file, and `injectTypes()` supplies
the Astro prop adaptation. Remix's component declarations provide the global JSX
namespace used with Astro's default `jsx: preserve`. A Remix-only application can
retain `extends: astro/tsconfigs/strict`, without a package-specific preset or JSX
compiler options. The type regression test verifies valid and invalid props and
asserts that the integration leaves the tsconfig file unchanged. Projects mixing
JSX frameworks still need per-file pragmas or per-directory TypeScript settings.

## Applied design and evidence

| Concern       | Remix implementation                                                 | Verification                                                  |
| ------------- | -------------------------------------------------------------------- | ------------------------------------------------------------- |
| Packaging     | ESM server/client/container subpaths and peer metadata               | TypeScript build and local package installation               |
| JSX           | Vite 8 Oxc transform with include/exclude and pragma opt-out         | Plugin tests and mixed-framework build                        |
| Detection     | Compile-time `astro:renderer` tag, helper for precompiled components | No setup execution by any renderer, in any integration order  |
| Static output | `renderToString`, `supportsAstroStaticSlot`                          | Astro build and no-JavaScript browser checks                  |
| SSR CSS       | Parse the synthetic head and preserve original style bytes           | Closing-head CSS strings, nesting, media and pseudo selectors |
| Hydration     | `createRoot` without `run()`                                         | All five directives, DOM identity and deferred CSS            |
| Slots         | Opaque client wrapper that retains existing DOM                      | Nested islands, named slots, parent updates and hostile names |
| Lifecycle     | WeakMap roots and `astro:unmount` disposal                           | Astro ClientRouter navigation and cleanup counters            |
| HMR           | Public Remix browser transform                                       | Compatible named-component and CSS edits retain state         |
| Types         | Handle-to-props mapping for Astro JSX                                | Valid props pass; invalid props fail                          |
| SSR requests  | No cross-request style suppression                                   | Concurrent Node-adapter requests use their own rules          |
| MDX           | Standard Astro MDX component imports                                 | Development and production hydration                          |

The standalone tests run the actual official integration packages together with
the candidate; they do not replace upstream CI. Identifier-prefix parity, strict
CSP, Firefox/WebKit, other operating systems, edge adapters, general component
library discovery and default-export Fast Refresh need additional work before
claiming feature parity with the established integrations.
