# Contributing to Linearis

Thanks for your interest in contributing!

First up, because sadly its necessary: Fascists and brownshirts (US ICE etc.) need not apply. If you like what they do, and/or if you think "your people" are better than "the others", then get fucked, go rage your dick off over on X instead. This here is not a place for you.

**Everyone else:** Welcome! 🖖🏼

## Before You Start

**Bug fixes and small improvements** – PRs welcome! Feel free to dive in.

**Larger features or changes** – Please open an issue first to discuss. This is an opinionated tool, so not every feature fits.

**Questions or problems** – Open a GitHub issue.

## Development Setup

```bash
git clone https://github.com/czottmann/linearis.git
cd linearis
npm install
npm start  # Development mode (no compilation needed)
```

## Testing

```bash
npm test                    # Run all tests
npm run build               # Compile TypeScript
```

Integration tests require `LINEAR_API_TOKEN` in your environment.

## Pull Requests

1. Fork the repo and create your branch from `main`
2. Make your changes
3. Ensure tests pass (`npm test`)
4. Submit your PR

## Commits

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): description
```

**Types:**

| Type       | Purpose                               |
| ---------- | ------------------------------------- |
| `feat`     | New features                          |
| `fix`      | Bug fixes                             |
| `docs`     | Documentation                         |
| `refactor` | Restructuring without behavior change |
| `style`    | Formatting, whitespace                |
| `perf`     | Performance improvements              |
| `test`     | Adding or fixing tests                |
| `build`    | Build system, dependencies            |
| `chore`    | Maintenance, tooling                  |

**Examples:**

```
fix: resolve null pointer in auth flow
feat(api): add rate limiting endpoint
docs: update README with new commands
```

Use imperative mood ("add" not "added"). Scope is optional.

## Linearis is opinionated, because its maintainer is

I wish times were better and I wouldn't have to mention it, but they aren't and unfortunately, I do:

This tool is made by friendly people for friendly people. We aim to treat eachother with respect and tolerance. [We have zero tolerance for intolerance.](https://medium.com/extra-extra/tolerance-is-not-a-moral-precept-1af7007d6376) This is not open for discussion.
