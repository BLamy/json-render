# AGENTS.md

Instructions for AI coding agents working with this codebase.

## Package Management

**Always check the latest version before installing a package.**

Before adding or updating any dependency, verify the current latest version on npm:

```bash
npm view <package-name> version
```

Or check multiple packages at once:

```bash
npm view ai version
npm view @ai-sdk/provider-utils version
npm view zod version
```

This ensures we don't install outdated versions that may have incompatible types or missing features.

## Code Style

- Do not use emojis in code or UI
- Use shadcn CLI to add shadcn/ui components: `pnpm dlx shadcn@latest add <component>`

## Workflow

- Run `pnpm type-check` after each turn to ensure type safety
- When making user-facing changes (new packages, API changes, new features, renamed exports, changed behavior), update the relevant documentation:
  - Package `README.md` files in `packages/*/README.md`
  - Root `README.md` (if packages table, install commands, or examples are affected)
  - Skills in `skills/*/SKILL.md` (if the package has a corresponding skill)
  - `AGENTS.md` (if workflow or conventions change)

<!-- opensrc:start -->

## Source Code Reference

Source code for dependencies is available in `opensrc/` for deeper understanding of implementation details.

See `opensrc/sources.json` for the list of available packages and their versions.

Use this source code when you need to understand how a package works internally, not just its types/interface.

### Fetching Additional Source Code

To fetch source code for a package or repository you need to understand, run:

```bash
npx opensrc <package>           # npm package (e.g., npx opensrc zod)
npx opensrc pypi:<package>      # Python package (e.g., npx opensrc pypi:requests)
npx opensrc crates:<package>    # Rust crate (e.g., npx opensrc crates:serde)
npx opensrc <owner>/<repo>      # GitHub repo (e.g., npx opensrc vercel/ai)
```

<!-- opensrc:end -->
