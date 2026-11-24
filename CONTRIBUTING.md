# Contributing to `@restorino/sdk`

We welcome contributions from the community to make the Restorino TypeScript SDK faster, more robust, and easier to use!

---

## Code of Conduct

By participating in this project, you agree to abide by our Code of Conduct and treat all contributors with respect, professionalism, and kindness.

---

## Getting Started

### Prerequisites

- **Node.js**: `^22.23.4 || ^24.22.3 || >=26.12.1` (Pinned to protect against CVE-2026-111497)
- **Package Manager**: `pnpm` (version `10.33.2` or compatible)

### Setup Repository

```bash
# 1. Clone your fork
git clone https://github.com/restorino/restorino-sdk-ts.git
cd restorino-sdk-ts

# 2. Install dependencies
pnpm install

# 3. Build project
pnpm run build
```

---

## Development Workflow

1. **Create a Branch**:
   ```bash
   git checkout -b feat/my-new-feature
   ```

2. **Run Tests & Typechecking**:
   ```bash
   # Type check sources
   pnpm run typecheck

   # Run complete test suite (unit, contract, security, documentation)
   pnpm test
   ```

3. **Single-File Bundle (Lovable / v0)**:
   When modifying modules or types in `src/`, always regenerate the standalone bundle:
   ```bash
   pnpm run bundle:single
   ```

4. **Commit Messages**:
   We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:
   - `feat(module): add new storefront method`
   - `fix(http): resolve timeout edge case`
   - `docs(readme): improve example descriptions`
   - `test(auth): add google sign-in verification tests`

---

## Submitting a Pull Request

1. Ensure all tests and typechecks pass (`pnpm test` and `pnpm run typecheck`).
2. Push your branch to GitHub and open a Pull Request against `main`.
3. Provide a clear summary of what was changed and why.
4. Maintainers will review your PR and provide feedback promptly.

Thank you for contributing to the Restorino open-source ecosystem!
