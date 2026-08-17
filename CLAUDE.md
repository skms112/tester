# CLAUDE.md

Guidance for Claude Code and other AI assistants working in this repository.

## ⚠️ Read this first: the repository is empty

As of the last update to this file, `skms112/tester` contains **no source code**.
The complete contents of the default branch are:

```
da        (0 bytes, empty file)
newfile   (0 bytes, empty file)
```

That is the entire tree. There is no README, no package manifest, no build
configuration, no CI workflow, no tests, and no `.gitignore`. The two commits in
history (`fbc72f7 "any"` and `3d15858 "new"`, both April 2022) each add one of
those empty files and nothing else.

**What this means for you:**

- There is no architecture, module layout, or data flow to learn before working.
- There are no build, test, lint, or run commands — none exist yet.
- Do not infer a language, framework, or toolchain from the repository name.
  "tester" is the repo name, not a statement of purpose; nothing in the repo
  indicates what it is meant to become.
- If a task assumes existing code ("fix the bug in the parser", "update the API
  handler"), that code is not here. Say so and ask what should be built, rather
  than guessing at a structure and creating it silently.

The rest of this file documents what *is* established — the git workflow — plus
the conventions to apply when the first real code lands.

## Repository facts

| Item | Value |
| --- | --- |
| Remote | `https://github.com/skms112/tester` |
| Default branch | `main` |
| Working directory | `/home/user/tester` |
| Tracked files | `da`, `newfile` (both empty) |
| Commits on `main` | 2 |

## Git workflow

Sessions in this repository are assigned a feature branch and develop there.

- **Never commit directly to `main`.** Work on the assigned feature branch; if
  none is assigned, create one before making changes.
- Push with upstream tracking:
  ```bash
  git push -u origin <branch-name>
  ```
- On network failure, retry the push up to four times with exponential backoff
  (2s, 4s, 8s, 16s). Do not retry on non-network errors — read the message first.
- Fetch and pull specific branches rather than everything:
  ```bash
  git fetch origin <branch-name>
  git pull  origin <branch-name>
  ```
- **Do not open a pull request unless explicitly asked.** When asked, check for a
  PR template (`.github/pull_request_template.md`,
  `.github/PULL_REQUEST_TEMPLATE.md`, root `PULL_REQUEST_TEMPLATE.md`, or
  `docs/PULL_REQUEST_TEMPLATE.md`) and mirror its headings if one exists. None
  exists today.
- If the PR for your branch has already merged, do not stack new commits on the
  merged history. Restart the branch from the latest `main`
  (`git fetch origin main && git checkout -B <branch-name> origin/main`) and push
  the follow-up work as a new change.

### Commit messages

The two existing commits (`"any"`, `"new"`) are not a standard to follow — they
carry no information. Write descriptive messages in the imperative mood:

```
Add user authentication middleware

Validates session tokens on protected routes and returns 401 on
expiry. Tokens are checked against the session store on every request.
```

Never include a model identifier or version in commit messages, PR titles or
bodies, code comments, or any other artifact pushed to the repository.

## Conventions for new code

Nothing is established yet, so the first substantial change effectively sets the
project's conventions. When adding code:

1. **Ask before choosing the stack.** Language, framework, and package manager
   are the user's call, not a default to assume. Once chosen, everything after
   should match.
2. **Add the supporting files with the first real code**, not later: a package
   manifest, a `.gitignore` appropriate to the language, and a README explaining
   what the project is.
3. **Set up tests alongside the first module**, not as a follow-up. Retrofitting
   a test harness is more expensive than starting with one.
4. **Match the surrounding code** once any exists — naming, comment density, file
   layout, and idiom. Consistency beats personal preference.
5. **Leave the two empty files alone** unless asked. `da` and `newfile` carry no
   content, but they are the repository's entire history; deleting them is a
   decision for the user to make, not housekeeping to do silently.

## Keeping this file accurate

This file describes an empty repository. That will stop being true as soon as
real code is committed, and a CLAUDE.md that describes a codebase inaccurately is
worse than none at all.

**When you add the first meaningful code to this repository, rewrite this file**
rather than appending to it. Replace the "repository is empty" warning with:

- What the project is and does.
- The directory layout and where the important entry points live.
- The actual build, test, lint, and run commands — verified by running them, not
  copied from a template.
- Conventions a newcomer would otherwise get wrong.

Keep the git workflow section; it is the one part that stays true regardless of
what gets built.
