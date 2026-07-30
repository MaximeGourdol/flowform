# flowform

Monorepo for a **headless TypeScript library for multi-step form management**.

This README documents the **repository architecture and tooling** only — not the
library's public API (that lives with each package once its source is written).

## Layout

```
.
├── packages/
│   ├── core/        @flowform/core — headless engine (framework-agnostic)
│   ├── react/       (reserved) React bindings — empty for now
│   └── adapters/    (reserved) validation-schema adapters — empty for now
├── .changeset/      Changesets config (versioning + changelogs)
├── .github/workflows/ci.yml   CI: lint + typecheck + test
├── .husky/          Git hooks (pre-commit)
├── tsconfig.base.json         Shared strict TS config, extended by each package
├── tsconfig.json              Root solution config (project references)
├── eslint.config.js           Flat ESLint config (strict type-checked rules)
├── vitest.config.ts           Vitest workspace (one project per package)
├── pnpm-workspace.yaml        pnpm workspace definition
└── package.json               Root scripts + shared devDependencies
```

Only `packages/core` has source today. `react` and `adapters` are placeholders
(`.gitkeep`) reserved for future packages.

## Tooling

| Concern         | Tool                                 |
| --------------- | ------------------------------------ |
| Package manager | pnpm (workspaces)                    |
| Language        | TypeScript (strict, `tsconfig.base`) |
| Build           | tsup — ESM + CJS + `.d.ts`           |
| Tests           | Vitest (workspace mode, per package) |
| Lint            | ESLint (flat config, type-checked)   |
| Format          | Prettier                             |
| Versioning      | Changesets                           |
| Git hooks       | Husky + lint-staged                  |
| CI              | GitHub Actions                       |

### TypeScript

`tsconfig.base.json` is the single source of strictness. Every package's
`tsconfig.json` extends it and only sets its own `rootDir` / `outDir`. Key flags:
`strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`.

## Root scripts

Run from the repository root — each fans out across all packages.

| Command          | Does                                           |
| ---------------- | ---------------------------------------------- |
| `pnpm build`     | Build every package (tsup → ESM + CJS + types) |
| `pnpm test`      | Run all package test suites (Vitest workspace) |
| `pnpm lint`      | Lint the whole repo (zero warnings tolerated)  |
| `pnpm typecheck` | Type-check every package (`tsc --noEmit`)      |
| `pnpm format`    | Format the repo with Prettier                  |
| `pnpm changeset` | Record a version bump + changelog entry        |

## Local workflow

```bash
pnpm install          # install workspace deps + set up git hooks
pnpm build            # build all packages
pnpm test             # run all tests
pnpm lint             # lint
pnpm typecheck        # type-check
```

`pre-commit` runs lint-staged (ESLint + Prettier on staged files), then
`typecheck` and `test` — a commit is blocked if any of them fail.

## Adding a package

1. Create `packages/<name>/` with a `package.json` (`@flowform/<name>`).
2. Add a `tsconfig.json` extending `../../tsconfig.base.json`.
3. Add build (`tsup`) + `typecheck` scripts mirroring `packages/core`.
4. It's automatically picked up by the pnpm workspace, Vitest, and the root scripts.

## License

[MIT](./LICENSE)
