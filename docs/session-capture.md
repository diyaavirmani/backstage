# Codex session capture

Keep the genuine Codex session recording separate from `docs/build-log.md`. Do not construct a transcript from notes or summaries, and do not read or export unrelated Codex sessions.

## Locate this project session

The current [official Codex CLI documentation](https://learn.chatgpt.com/docs/codex/cli) describes `codex resume` as a way to reopen a chat from the current repository or search local chats. It does not promise a stable on-disk path or JSONL format. The current local rollout location is an implementation detail:

```text
~/.codex/sessions/YYYY/MM/DD/rollout-<timestamp>-<session-id>.jsonl
```

If `CODEX_HOME` is set, use `$CODEX_HOME/sessions/` instead of `~/.codex/sessions/`. The JSONL format and directory naming can change; use the CLI’s resume/search flow if the path differs.

Identify a recording using the session ID supplied to the active Codex process, then confirm its native session metadata records this repository as the working directory. Use metadata only to identify candidate recordings; do not select a transcript just because it is newest. The stored JSONL is an implementation detail, so preserve its record format and validate every record after redaction.

## Submission workflow for a later milestone

1. Copy only the metadata-verified project recording to a private working directory outside the repository. Keep the native original private.
2. Make a redacted copy that preserves authentic user/assistant turns and tool activity. Remove API and Sanity credentials, private Context endpoints, cookies, contact details, names or account identifiers that are not needed, and unrelated local paths. Do not reconstruct missing turns from notes or build logs.
3. Validate that the redacted copy parses as the original JSONL record format and review the redacted file itself before upload. Search it for credential patterns, private URLs, emails, phone numbers, cookies, and local home paths; inspect relevant sections for any remaining personal information.
4. In DEV, open **Agent Sessions**, upload the reviewed redacted transcript, and wait for it to process. Open the uploaded session and review the parsed turns and tool activity. Remove or re-upload if any sensitive information remains.
5. Curate the public-facing session to the relevant Backstage development, Sanity retrieval, citation-validation, and deployment work. Set its visibility to **Public**, confirm the public session page is accessible, copy DEV's supported embed, and place that embed under **Agent Session** in `docs/submission.md`.
6. Keep the raw native recording and the private redacted working copy outside Git. The repository ignores raw `*.jsonl` session exports. Do not upload the raw recording or include it in the repository.

## Prepared recording for this submission

The active session ID matched the ID supplied to the current Codex process. Its native `session_meta` record identified this project working directory before export. It is the only recording found in the local Codex session directory whose metadata matches this repository. A private redacted JSONL copy has been prepared outside the repository; it has not been uploaded. Useful user-prompt sections to curate are the Milestone 6 deployment work (record ordinal 10402 onward), Milestone 6B Docker/deployment continuation (ordinals 11579–14294), and this submission preparation (ordinal 14295 onward). Keep surrounding authentic assistant responses and tool activity when curating; do not create a transcript from these labels.

Nothing has been uploaded for this milestone.
