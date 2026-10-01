# Codex session capture

Keep the genuine Codex session recording separate from `docs/build-log.md`. Do not construct a transcript from notes or summaries, and do not read or export unrelated Codex sessions.

## Locate this project session

The current [Codex CLI documentation](https://learn.chatgpt.com/docs/codex/cli) describes resuming saved chats and returning to a chat from the current repository. It does not promise a stable on-disk path or JSONL format. The current default local CLI rollout location is an implementation detail:

```text
~/.codex/sessions/YYYY/MM/DD/rollout-<timestamp>-<session-id>.jsonl
```

If `CODEX_HOME` is set, use `$CODEX_HOME/sessions/` instead of `~/.codex/sessions/`. The JSONL format and directory naming can change; use the CLI’s resume/search flow if the path differs.

For this milestone, identify the recording by the session ID supplied to the active Codex process and confirm that its session metadata records this project working directory (`/Users/diyavirmani/backstage`). Use metadata only to identify the matching recording. Do not select a transcript just because it is the newest file. Do not export it during milestone 1.

## Submission workflow for a later milestone

1. Copy only the verified project session recording to a private working location outside the repository.
2. Prepare a redacted copy. Remove credentials, private user data, unrelated local paths, and other sensitive content while preserving the authentic conversation and tool activity.
3. Upload the redacted transcript to **DEV Agent Sessions**.
4. Curate the uploaded session, make it public, and embed it in the submission.
5. Keep the original raw recording private and out of Git. The repository ignores raw `*.jsonl` session exports.

Nothing has been uploaded for this milestone.
