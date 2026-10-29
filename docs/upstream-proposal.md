# Proposing an official Remix integration to Astro

`astro-remix` is published as a community integration. Becoming `@astrojs/remix`
requires Astro maintainer agreement on the namespace, ongoing maintenance,
supported runtime versions and release process.

## Renaming to @astrojs/remix

The package name is defined once, in `src/package-name.ts`. It is the renderer
name, the `client:only` value, the `astro:renderer` tag and the prefix of every
entrypoint specifier. Renaming requires:

1. Set `packageName` in `src/package-name.ts` and `name` in `package.json`.
2. Replace `astro-remix` with `@astrojs/remix` in the README, the test helper
   symlink (`test/helpers.mjs`) and the fixtures' imports and dependencies.
3. Deprecate the community package:
   `npm deprecate astro-remix "Moved to @astrojs/remix"`.

Users then replace `client:only="astro-remix"` with `client:only="remix"` once
the core patch below is merged.

## Package placement

The expected destination is `packages/integrations/remix` in the Astro monorepo.
The runtime entrypoints, container renderer, source filters and component-only
scope follow the five official integrations reviewed in
[the comparison](official-integrations-review.md).

Before transplantation, replace standalone build/test commands with the monorepo
tooling, use workspace dependencies where appropriate, add project references,
wire fixtures into the existing test infrastructure, and review the lockfile and
release metadata. The standalone package directory is not a complete monorepo PR.

## Making astro add remix work

The CLI first tries `@astrojs/<name>` for an unscoped name. It validates
`astro-integration` package metadata, installs required peers other than Astro,
and adds the integration's default export to `astro.config.*`. There is no
separate installation allowlist that must be extended for package lookup.

The companion `upstream/astro-add-remix.patch` targets Astro commit
`883e672fd0beb575b14776bc842bdee84433e6af`. It changes six existing files:

1. Include Remix in CLI help.
2. Recognize `client:only="remix"` when multiple renderers are installed and
   include Remix in renderer-selection diagnostics.
3. Include Remix in the existing JSX-integration conflict warnings.

No Remix TypeScript preset is needed in the CLI: the package handles JSX
compilation and generated type injection while retaining Astro's standard
TypeScript configuration.

The patch applies cleanly to the reviewed revision. It has not been run through
the full Astro monorepo suite.
It does not include the package itself, published npm metadata, docs or release
configuration. Do not apply it to installed `node_modules` as a deployment step.

The community package uses `client:only="astro-remix"`, which works without
modifying Astro because core falls back to matching the renderer name. The
shorter hint becomes part of the proposed core change. `astro add remix` will
only work once an approved package is published as `@astrojs/remix`; today the
CLI falls back to the unrelated `remix` package.

## Questions to settle with maintainers

- **Runtime scope:** peer on `remix` for the documented `remix/component` import
  path, or depend directly on the smaller `@remix-run/component` packages?
- **Node support:** the tested `remix` package requires Node 24.3, while Astro's
  reviewed baseline supports Node 22.23.4. Do not advertise Node 22 support for
  this package without resolving that difference and running its matrix.
- **Renderer tag:** detection relies on `Symbol.for('astro:renderer')`, which
  core marks `@internal` and `@astrojs/mdx` already uses. Confirm it may be used
  by another first-party renderer, or expose it publicly.
- **TypeScript preset:** `astro add` writes `jsxImportSource` presets for React,
  Preact and Solid and warns when they conflict. Without a `remix` preset, a later
  `astro add react` silently retypes Remix files that lack a pragma.
- **Type extension:** approve or replace the package-level
  `astroHTML.JSX.LibraryManagedAttributes` augmentation. It must continue to infer
  normal framework props and preserve Remix prop errors.
- **Identifiers:** determine how Remix should expose a stable SSR/client seed or
  prefix before promising identifier parity across hydration.
- **Development updates:** coordinate default-export and other unsupported HMR
  shapes with Remix rather than copying its private refresh protocol.
- **SSR style placement:** accept inline SSR style tags per island or design a
  public head/style-collection hook. Avoid response rewriting and private Astro
  metadata to hoist runtime-generated rules.
- **Maintenance:** agree on ownership and expected coverage before proposing an
  official integration as a one-off contribution.

## Pre-PR checklist

- [x] Review the five official integration implementations and relevant tests.
- [x] Separate the package from the demo application.
- [x] Compile the package and verify portable exports.
- [x] Preserve CSS in SSR HTML without nested head tags.
- [x] Verify all five directives, static output, nested slots and cleanup.
- [x] Verify the actual React, Preact, Solid, Svelte and Vue packages together.
- [x] Check valid and invalid Astro component props.
- [x] Exercise MDX, supported Remix HMR and Node-adapter SSR isolation.
- [ ] Publish `astro-remix` to npm and gather community usage.
- [ ] Agree on the runtime dependency and Node compatibility policy.
- [ ] Resolve identifier-prefix and type-extension questions.
- [ ] Run Chromium, Firefox and WebKit, plus Astro's OS/Node CI matrix.
- [ ] Test strict CSP and intended deployment adapters.
- [ ] Port package tests and CLI tests to Astro's shared helpers.
- [ ] Add documentation, changeset/release wiring and final package metadata.
- [ ] Publish an approved package; verify a fresh `astro add remix` installation.
- [ ] Propose the integration in [withastro/roadmap discussions](https://github.com/withastro/roadmap/discussions).
- [ ] Open the upstream PR only after the proposal scope is agreed.
