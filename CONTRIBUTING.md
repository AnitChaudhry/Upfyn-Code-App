# Contributing to Upfyn Code

First off, thank you for considering contributing to Upfyn Code! Every contribution helps make this project better for everyone.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How Can I Contribute?](#how-can-i-contribute)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Commit Message Guidelines](#commit-message-guidelines)
- [Issue Guidelines](#issue-guidelines)

## Code of Conduct

This project follows our [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold it. Please report unacceptable behavior to **opensource@upfyn.com**.

## How Can I Contribute?

### Reporting Bugs

Found a bug? Please [open an issue](https://github.com/AnitChaudhry/Upfyn-Code-App/issues/new?template=bug_report.yml) using our bug report template.

### Suggesting Features

Have an idea? [Submit a feature request](https://github.com/AnitChaudhry/Upfyn-Code-App/issues/new?template=feature_request.yml) and tell us about it.

### Your First Contribution

Look for issues labeled **`good first issue`** — these are specifically curated for new contributors:

- [Good First Issues](https://github.com/AnitChaudhry/Upfyn-Code-App/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22)
- [Help Wanted](https://github.com/AnitChaudhry/Upfyn-Code-App/issues?q=is%3Aissue+is%3Aopen+label%3A%22help+wanted%22)

### Areas for Contribution

| Area | Description |
|------|------------|
| Bug Fixes | Fix reported issues and edge cases |
| New Features | Add functionality to existing modules |
| UI/UX | Improve the visual design and user experience |
| Accessibility | Make the app more accessible (a11y) |
| Internationalization | Add new language translations |
| Documentation | Improve README, guides, and code comments |
| Performance | Optimize rendering, reduce bundle size |
| Testing | Add test coverage |

## Getting Started

### Prerequisites

- **Node.js** 18+ (with npm) or **Bun**
- **Git** installed and configured
- **Claude Code CLI** — install from [claude.ai/code](https://claude.ai/code)

### Setup

```bash
# 1. Fork the repository on GitHub

# 2. Clone your fork
git clone https://github.com/YOUR_USERNAME/Upfyn-Code-App.git
cd Upfyn-Code-App

# 3. Add upstream remote
git remote add upstream https://github.com/AnitChaudhry/Upfyn-Code-App.git

# 4. Install dependencies
npm install

# 5. Start development server
npm run dev
```

The app will be available at `http://localhost:1420`.

## Development Workflow

### Branching Strategy

Always create a new branch from `main` for your work:

```bash
# Sync your fork first
git fetch upstream
git checkout main
git merge upstream/main

# Create your feature branch
git checkout -b feature/your-feature-name
# or
git checkout -b fix/your-bug-fix-name
```

**Branch naming convention:**

| Prefix | Usage |
|--------|-------|
| `feature/` | New features |
| `fix/` | Bug fixes |
| `docs/` | Documentation changes |
| `refactor/` | Code refactoring |
| `improve/` | Performance improvements |
| `ci/` | CI/CD changes |

### Keeping Your Fork Updated

```bash
git fetch upstream
git checkout main
git merge upstream/main
git push origin main
```

## Pull Request Process

1. **Create your branch** from `main` following the naming convention above
2. **Make your changes** — keep them focused on a single concern
3. **Test your changes** locally:
   ```bash
   npm run dev          # Test in browser
   npx tsc --noEmit     # Type check
   ```
4. **Commit your changes** following our [commit message guidelines](#commit-message-guidelines)
5. **Push to your fork** and open a Pull Request against `main`
6. **Fill out the PR template** completely
7. **Wait for review** — a maintainer will review your PR and may request changes
8. **Address feedback** — push additional commits to your branch to address review comments

### PR Requirements

- All PRs must pass the CI pipeline (type check + build)
- At least 1 approval from a code owner is required
- All review conversations must be resolved before merging
- PRs are squash-merged to keep a clean commit history

## Coding Standards

### Frontend (React / TypeScript)

- Use **TypeScript** for all new code — no `any` types unless absolutely necessary
- Use **functional components** with hooks
- Use **Tailwind CSS** for styling — avoid inline styles and CSS modules
- Follow existing patterns in the codebase for consistency
- Use named exports over default exports

### File Organization

```
src/components/     → Reusable UI components
src/contexts/       → React contexts
src/hooks/          → Custom hooks
src/lib/            → Utilities and API clients
src/stores/         → Zustand stores
src/upfyn/          → Upfyn-specific modules
```

### Security Requirements

- **Never commit secrets** — no API keys, tokens, or passwords in code
- **Validate inputs** at system boundaries
- **Use parameterized queries** for any database operations
- **Never log sensitive data** (tokens, credentials, etc.)

## Commit Message Guidelines

Use these prefixes for your commit messages:

| Prefix | Usage |
|--------|-------|
| `Feature:` | New feature |
| `Fix:` | Bug fix |
| `Docs:` | Documentation only |
| `Refactor:` | Code restructuring |
| `Improve:` | Performance or UX improvement |
| `CI:` | CI/CD changes |
| `Chore:` | Tooling, deps, config |

**Examples:**
```
Feature: add keyboard shortcuts for agent execution
Fix: resolve session list scroll position reset
Docs: update CONTRIBUTING.md with branch naming conventions
Refactor: extract message parsing into dedicated utility
```

## Issue Guidelines

- **Search existing issues** before creating a new one
- Use the **issue templates** provided — they help us understand and triage faster
- **Be specific** — include reproduction steps, screenshots, and environment details
- **One issue per problem** — don't combine multiple bugs into a single issue
- Add relevant **labels** if you can

## Questions?

If you have questions about contributing, feel free to:

- Open a [Discussion](https://github.com/AnitChaudhry/Upfyn-Code-App/discussions)
- Ask in an existing issue thread

---

*Thank you for helping make Upfyn Code better for the global developer community!*
