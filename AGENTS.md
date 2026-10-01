<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Backstage implementation workflow

- Complete the requested milestone before moving to another.
- Run checks appropriate to the change and fix failures.
- Record actual changes, decisions, checks, and remaining limitations in `docs/build-log.md`.
- Review the diff and staged files for unintended changes and secrets.
- Stage explicit project files.
- Make a meaningful commit describing the completed change.
- Push to the configured GitHub branch and verify the remote branch contains that commit.
- Never invent successful checks, fabricate commits, backdate history, force-push, or discard unrelated work.
- If authentication or another external dependency blocks progress, finish independent work and report the precise blocker.
