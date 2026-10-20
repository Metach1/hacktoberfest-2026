# Contributing to Startletes

Thanks for your interest in contributing. Please keep contributions focused, approachable, and consistent with the product brief in [`docs/PROJECT_BRIEF.md`](./docs/PROJECT_BRIEF.md).

## Before you start

- Check the open issues and pull requests to avoid duplicating work.
- For changes that affect product behavior, use the repository's OpenSpec workflow and review existing proposals under [`openspec/changes`](./openspec/changes).
- Ask before beginning large or cross-cutting work.
- Follow the [Code of Conduct](./CODE_OF_CONDUCT.md).

## Local development

1. Install Node.js 20.19 or newer and npm.
2. Clone the repository and install dependencies:

   ```bash
   npm install
   ```

3. Generate the fictional athlete dataset and the region-map paths:

   ```bash
   npm run seed
   npm run build:regions
   ```

4. Start the development server:

   ```bash
   npm run dev
   ```

## Validate your changes

Run the relevant checks before opening a pull request:

```bash
npm run lint
npm run test
npm run build
```

- `npm run test` runs the dependency-free Node test suite (`node --test`).
- For changes to sample data, also run `npm run seed` and verify its output remains fictional and covers the 17 populated regions.
- For changes to the region-map source or taxonomy, run `npm run build:regions` and verify `data/ph-regions.json` still covers all 18 regions. Record any new data source's provenance and license in [`data/geojson/SOURCE.md`](./data/geojson/SOURCE.md).

## Pull requests

- Keep each pull request focused and explain the problem and solution.
- Describe user-visible changes and link related issues or OpenSpec proposals.
- Include screenshots for visual changes when useful.
- Document any new commands or configuration.
- Never include real athlete data, personal documents, credentials, or payment information. All athlete and funding examples must remain fictional; payments and payouts are mock-only.
- Respond constructively to review feedback and keep the branch up to date.

## Reporting a vulnerability

Do not report security vulnerabilities in public issues. Use GitHub's private vulnerability reporting for this repository when it is enabled; otherwise, contact the maintainers privately using the contact method described in the [Code of Conduct](./CODE_OF_CONDUCT.md).
