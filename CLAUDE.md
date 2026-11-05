# Mosslight instructions for Claude Code

@AGENTS.md

Read `AGENTS.md` for the project's delivery and boss rules. The user's direct
instructions take precedence. Never commit or print Apple private keys, tokens,
signing certificates, provisioning profiles, or other credentials.

## Working with another agent

Use a separate branch and, when agents share a computer, a separate Git
worktree. Check `git status` and fetch `origin` before starting. Coordinate the
task and affected files with the user or other agent; work on different areas
where practical. Preserve existing changes, integrate against the latest
`origin/main`, and never force-push or overwrite another agent's work. GitHub is
the shared source of truth: a local checkout does not automatically contain
changes made by an agent in another environment.

## Build and validation

Use Node.js 22.12 or newer. From the repository root:

```sh
npm ci
npm test
npm run build
```

For browser changes, run `npm run test:browser`; if Playwright's Chromium is
not installed, run `npx playwright install chromium` first. For iOS changes,
run `npx cap sync ios` and `npm run ios:check`. A native iOS build requires a
Mac with Xcode; open `ios/App/App.xcodeproj` or use Xcode Cloud. See
`docs/TESTFLIGHT.md` for the existing app and workflow.

GitHub Actions validates branches. A push to `main` triggers the existing
Xcode Cloud archive; coordinate integration so concurrent agents do not create
conflicting releases. Follow the delivery rule in `AGENTS.md`, verify the exact
commit and the internal Beta group's Testing status, and report any access or
processing blocker. Xcode Cloud's managed signing does not require putting an
Apple API key in the repository. Access to App Store Connect for verification
is separate from GitHub access.

## Game conventions

Pip and Poppy share abilities. Keep rewards scarce and earned from marked
head-knocker blocks; the player can store one extra diamond. The player likes
sliding platforms, hidden areas, clear challenges and fair checkpoints. Do not
reintroduce switch puzzles or the removed Mill Keeper windmill encounter.
