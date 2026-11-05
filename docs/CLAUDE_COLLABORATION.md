# Working on Mosslight with Claude Code and Codex

Claude Code on your computer and Codex in the cloud have separate files and
conversation histories. GitHub is how they share committed changes. Both need
access to `jerahnhyman-ui/mosslight`, and each agent needs enough task context
to understand what the other is doing.

## Start Claude on your computer

Install Git, Node.js 22.12 or newer, and [Claude Code](https://code.claude.com/docs/en/setup).
Sign in to Claude Code. Ensure Git can access the GitHub repository using your
own authorized account. If you already have a checkout, use it instead of
cloning again.

In a terminal, run:

```sh
git clone https://github.com/jerahnhyman-ui/mosslight.git
cd mosslight
git fetch origin
git worktree add -b claude/mosslight-work ../mosslight-claude origin/main
cd ../mosslight-claude
npm ci
npm test
npm run build
claude
```

The worktree is a separate folder and branch, so another agent can work in the
original folder without overwriting Claude's files. Pick a new branch and folder
name for each additional task. If the branch or folder already exists, choose
another name; don't delete it unless you know its work is no longer needed.

Claude Code automatically reads the repository's `CLAUDE.md`, which imports
`AGENTS.md`. Give Claude a concrete task and tell it what Codex is working on,
including files or branches if known. To play in a browser, run `npm run dev`
and open the URL it prints.

## Share changes and release

Have each agent commit its work on its own branch and push that branch. Share
the branch or pull request with the other agent through the conversation. Before
integrating, fetch `origin`, inspect the changes, and resolve any overlap with
the current `main`; avoid force-pushing or using the same worktree for parallel
edits. GitHub Actions checks the branch or pull request.

The existing Xcode Cloud workflow builds when a change reaches `main` and uses
Apple managed signing. Coordinate integrations so both agents don't race to
release different commits. For game changes, the delivery rule in `AGENTS.md`
requires checking that the intended build reaches **Testing** in the internal
**Beta** group; archive success alone is not enough. Access to GitHub does not
automatically give Claude access to App Store Connect. If it cannot verify the
release, tell the user the build status and the exact access needed. Never put
the Apple API key, signing material, or tokens in the repository or a prompt.

For local iOS work, use a Mac with Xcode, run `npx cap sync ios` and
`npm run ios:check`, and open `ios/App/App.xcodeproj`. The local preflight is
not a signed archive; see [TESTFLIGHT.md](TESTFLIGHT.md) for the existing
workflow. Do not create a second Apple app or Xcode Cloud workflow for this setup.
