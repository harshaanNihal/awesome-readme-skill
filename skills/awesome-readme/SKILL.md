---
name: awesome-readme
description: Write, rewrite or "make awesome" a project README in six checked stages (research, demo images, draft, GitHub-accurate render check, fact-check against the code, pull request). Use when asked to write or improve a README, or to add a demo GIF, screenshots, badges, Mermaid diagrams or a project layout tree to one, even when the user only says the README is weak or the repo should look better.
license: MIT
compatibility: Needs file access and a shell for every stage. The image stage also needs Node.js 22.2 or later, Chrome or Chromium, and the npm packages puppeteer-core, gifenc, pngjs and omggif installed in a scratch folder; the render check needs the GitHub CLI (gh) logged in and network access.
metadata:
  argument-hint: "[repo-path] [--no-images]"
---

# Awesome README

Goal: a README where a stranger learns what the project is in ten seconds, sees it working before installing, gets a first success in three commands, and can trust every sentence. Trust is the hard part. A first draft written from memory overstates, so the work is built around checking each sentence against the code.

The input is the repository path and any flags the user gave, either in the invocation or in the request.

- A path: the repo to work on. Default: the current repo.
- `--no-images`: skip stage 2.

Below, `<skill>` is the absolute path of the folder that holds this file; substitute it before running anything, because the scripts run from the repository root.

## Before you start

1. Read the current README, the manifest (package file, build file), the scripts or task runner, `CONTRIBUTING`, and any repo instructions file. Note the project's voice and any branch rules (for example PR-only).
2. Find out whether an **offline demo instance** exists: a fixture or demo server, a script that runs on sample data, a seeded container, a storybook, a test harness that serves the UI. No demo instance, or a CLI or library with no UI: skip stage 2, say so in your report, and use real output from a safe, offline command in code blocks instead. Never mock up a screenshot.
3. Check whether sub-agents are available. If yes, run one per stage (table below). If no, run the stages yourself, in order. Stage 5 must still be a separate pass: reopen the files and check each sentence fresh, as if someone else wrote the draft.
4. Make a scratch folder outside the repo (use your session's scratch folder if you have one, or a new temporary folder such as `mktemp -d` gives) for downloads, helper packages and preview output. Nothing from it goes into the repo except the final images.
5. Write for the repo as it will be at merge time. If code is being restructured in parallel, get the target layout from whoever owns that work, write against it, and re-verify every path once the restructure lands.

## Stages and models

| # | Stage | Model | Why |
|---|---|---|---|
| 1 | Research | small, fast model | Mechanical: download, extract, list |
| 2 | Images | mid-tier model | Drives a browser and judges screenshots |
| 3 | Draft | mid, stronger if the code is large | Judgment: what to claim and how to say it |
| 4 | Render check | mid | Reads screenshots, fixes layout only |
| 5 | Fact-check | mid or stronger, never the writer | Judgment: finds what the writer got wrong |
| 6 | Deliver | you, the orchestrator | Commit, PR, wait for approval |

Hand each sub-agent the paths it needs, its stage text from this file, and the exact output you expect back.

## 1. Research

`references/readme-patterns.md` is the default research. Read it and stop there. Refresh it (section D in that file lists the READMEs) only if the user asks, or the project is a different kind of thing from the sample (library, CLI, web app, data set). Output: the shape you will use and the techniques you will copy, each with the snippet.

## 2. Images (skip if there is no demo instance)

1. Start the demo instance as the repo documents it. It must be local and offline.
2. In the scratch folder: `npm init -y && npm i puppeteer-core gifenc pngjs omggif`, then `export README_TOOLS=<that folder>`. Chrome must be installed (`CHROME` overrides the search).
3. Copy `<skill>/scripts/capture.example.json` to the scratch folder and edit it: base URL, the command that starts the demo, selectors, and the steps for each shot. The header of `<skill>/scripts/capture.mjs` documents every setting and step. Pick a hero shot, three to five feature shots, and one demo GIF of one short flow (6 to 10 seconds, at most about 1200 px wide, last frame held).
4. Run it from the repo root: `node <skill>/scripts/capture.mjs --config <config> [name ...]`. It refuses a non-loopback base URL, aborts and reports any request to another origin, and warns when the GIF is over 4 MB.
5. **Open every image** with an image-reading tool and reject blank, half-loaded, spinner, error, cut-off and stray-hover states. If you cannot view images, skip stage 2 and say so in your report. Check the GIF with `node <skill>/scripts/verify-gif.mjs <gif> [framesDir]` and open a few frames.
6. Every name, address and account shown must be fictional (`example.com`, invented names). If the app has only a dark theme, ship only dark. Do not fake a light one.
7. Output: the file list with sizes, what each image shows, and an alt text for each. Images go in `docs/images/` unless the repo has a convention.

## 3. Draft

Read `references/readme-skeleton.md` and follow its shape:

- Centered hero: logo (the project's own, or none), title, one-line tagline, at most four static badges, a jump-link row.
- Demo GIF directly under the hero.
- "Use it when / not when".
- Quick start of three commands or fewer, with the one prerequisite line above it.
- "How it works" with Mermaid diagrams taken from the real code path. Open the code and follow the calls. Do not draw what you imagine.
- Screenshots, tall ones collapsed in `<details>` with a `width`.
- Reference material (options, config, data locations, long lists) collapsed or in short tables.
- Project layout tree, one file per line, each line under about 100 characters.
- Development, credits, license.

Write against the code, not from memory: open the file that decides each statement. Match the project's voice. The default is plain and sober, with no emoji, no marketing adjectives, and each term explained on first use. Treat every sentence as a claim you will have to defend.

Badges state stable, true facts (runtime version, language, "no build step"). No counts that go stale, nothing that names the repo owner, no vanity counters. Verify each URL.

The writer ends its report with a list titled **Claims I could not confirm**. That list goes to the orchestrator and the fact-checker, not into the README. An honest list is worth more than a smooth README.

If a README already exists, read it first and keep what is still true. Its claims get checked too. Old READMEs often hold overstated claims too.

## 4. Render check

```sh
README_TOOLS=<scratch> <skill>/scripts/preview/render.sh <README.md> <repo-root> <scratch>/preview
```

It needs `gh` logged in, `node` and Chrome, and network access only for `gh api markdown` and two CDNs. It renders the README with GitHub's own renderer (`gh api markdown`), wraps it in github-markdown-css, renders Mermaid, and saves dark and light screenshots to `<scratch>/preview/shots/`. It exits 1 and lists problems when it finds Mermaid parse errors, broken images, code blocks wider than the column, anchors that match no heading, or tall images outside `<details>`.

Open every slice in both themes. Fix **layout only**, never facts. Typical fixes: a Mermaid label that needs quotes, a tree line that is too long, a `style` attribute (GitHub strips it; `align`, `width` and `height` survive), a tall image that needs `<details>`, an anchor that does not match its heading. Repeat until clean. Badges show as local placeholders in the preview, so verify their real URLs in stage 5.

## 5. Fact-check

A different agent from the writer. Place the README at its final path first. Give it `references/fact-check-checklist.md` and the writer's "Claims I could not confirm" list.

It checks every checkable statement against the finished code, in fixed areas: layout tree, commands, options, config and keys, features versus what is wired, privacy claims (what leaves the machine), diagrams node by node, exports and data paths, links and anchors, badge URLs, numbers, images. It fixes the README, never the code, and reports code problems it finds. It never contacts a real third-party service and never uses real personal data. Run stage 4 again after its edits, because corrections change layout.

Expect many corrections. Earlier runs needed many corrections in drafts the writer believed were accurate.

## 6. Deliver

1. Work on a branch. If the repo is PR-only, never commit to the default branch.
2. Commit the README and the images together, in one commit.
3. Open a pull request (use a pull request description helper if your agent has one). Say in it that the images came from the offline demo with fictional data, and list the fact-check's code problems and any claims still unconfirmed.
4. **Wait for the owner's approval before merging.** Never merge it yourself.

## Hard rules

- Never contact a real third-party service to make a screenshot or to check a claim. Demo instance and the code only.
- Never put real personal data in an image or in the README.
- Helper npm packages live in the scratch folder, never in the repo. Do not change code, config or tests in the repo.
- A GIF stays under 4 MB. Roughly: a 9 second, 1200 px wide GIF from `gifenc` came out near 700 KB.
- The Mermaid build on cdnjs was blocked by the browser (ORB) in the local preview. The preview scripts use the jsdelivr build.
- Callouts (`> [!NOTE]`, `> [!WARNING]`, `> [!TIP]`) render. Use two to four.
- Tall screenshots go inside `<details>` with a `width` attribute.
- Do not count things that change. Say "about" with a pointer to the command that prints the real number, or leave the number out.

## Bundled files

| File | Read or run it when |
|---|---|
| `references/readme-patterns.md` | Stage 1, and when choosing how to present a section |
| `references/readme-skeleton.md` | Stage 3: shape and working markup |
| `references/fact-check-checklist.md` | Stage 5, and stage 3 for the writer's self-check |
| `scripts/capture.mjs`, `capture.example.json`, `verify-gif.mjs`, `lib.mjs` | Stage 2 |
| `scripts/preview/render.sh`, `build.mjs`, `shoot.mjs` | Stage 4, and again after stage 5 |

## Final report to the user

List: the README path, the images produced (or why none), the stage 4 result, the stage 5 totals (corrected, removed, confirmed), code problems found, claims still unconfirmed, and the PR link with a note that it is waiting for approval.
