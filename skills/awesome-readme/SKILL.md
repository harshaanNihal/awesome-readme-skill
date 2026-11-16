---
name: awesome-readme
description: Write, rewrite or "make awesome" a project README in six checked stages (research, demo images, draft, GitHub-style render check, fact-check against the code, pull request). Use when asked to write or improve a README, or to add a demo GIF, screenshots, badges, Mermaid diagrams or a project layout tree to one, even when the user only says the README is weak or the repo should look better. Also use to audit or fact-check an existing README against the code without changing it (--check), and to refresh a README after the code changed (--update), for example when the user asks if the README is still accurate or says the docs are stale.
license: MIT
compatibility: Needs file access and a shell for every stage. The image stage also needs Node.js 22.2 or later, Chrome or Chromium, and the npm packages puppeteer-core, gifenc, pngjs and omggif installed in a scratch folder. The render check needs Node.js, Chrome or Chromium and puppeteer-core, plus either the GitHub CLI (gh) logged in with network access, or, with --offline, the npm packages marked, github-markdown-css and mermaid and no network.
metadata:
  argument-hint: "[repo-path] [--no-images] [--check | --update] [--offline]"
---

# Awesome README

Goal: a README where a stranger learns what the project is in ten seconds, sees it working before installing, gets a first success in three commands, and can trust every sentence. Trust is the hard part. A first draft written from memory overstates, so the work is built around checking each sentence against the code.

The input is the repository path and any flags the user gave, either in the invocation or in the request.

- A path: the repo to work on. Default: the current repo.
- `--no-images`: skip stage 2. In `--update` it means: do not retake images.
- `--check`: audit only, changes nothing. See "Mode: check only".
- `--update`: refresh a README after the code changed. See "Mode: update".
- `--offline`: render the preview in stage 4 with no GitHub and no network. See stage 4.

`--check` and `--update` do not combine. If the user asks for both, run `--check` and offer the update at the end. `--offline` and `--no-images` go with any mode. A request in words counts as a flag: "is my README still accurate?" is `--check`, and "the code changed, bring the README up to date" is `--update`.

Below, `<skill>` is the absolute path of the folder that holds this file. Substitute it before running anything, because commands run from other folders and a relative path would not find the scripts.

## Before you start

1. Read the current README, the manifest (package file, build file), the scripts or task runner, `CONTRIBUTING`, and any repo instructions file. Note the project's voice and any branch rules (for example PR-only).
2. Find out whether an **offline demo instance** exists: a fixture or demo server, a script that runs on sample data, a seeded container, a storybook, a test harness that serves the UI. No demo instance, or a CLI or library with no UI: skip stage 2, say so in your report, and use real output from a safe, offline command in code blocks instead. Never mock up a screenshot.
3. Check whether sub-agents are available. If yes, run one per stage (table below). If no, run the stages yourself, in order. Stage 5 must still be a separate pass: reopen the files and check each sentence fresh, as if someone else wrote the draft.
4. Make a scratch folder outside the repo (use your session's scratch folder if you have one, or a new temporary folder such as `mktemp -d` gives) for downloads, helper packages and preview output. Nothing from it goes into the repo except the final images.
5. Write for the repo as it will be at merge time. If code is being restructured in parallel, get the target layout from whoever owns that work, write against it, and re-verify every path once the restructure lands.

## Three ways to run it

| Way | Use it when | What it touches |
|---|---|---|
| Full run (no mode flag) | There is no README, or its shape is wrong (no clear first screen, no quick start, no demo), or the user asks for a rewrite | The README, the images, a branch and a pull request |
| `--check` | The user has a README and wants to know what in it is wrong | Nothing in the repo. The result is a report |
| `--update` | The README was right once and the code has moved on | The stale sections, the images whose screen changed, a branch and a pull request |

A full run goes through stages 1 to 6 below. The two modes reuse those stages and say which ones.

Choose a full run over `--update` when the changes touch most sections, or when the shape is the problem. A patch on a wrong shape stays wrong. With no README, `--check` and `--update` have nothing to work on: say so and do a full run.

## Mode: check only (`--check`)

Use it when the user has a README and wants to know what in it is wrong, or whether it can be trusted. The user may not want anything to move yet, so this mode changes nothing: no edit, no commit, no branch, no pull request. Do not fix even a typo. The value is a complete list the user can read before deciding.

1. Do steps 1, 3 and 4 of "Before you start".
2. Run stage 5 on the README as it stands, with `references/fact-check-checklist.md`, in the same fixed areas. Do not edit the README. Where the checklist says to fix, write the corrected wording in the report instead. Mark each claim confirmed, wrong or could not confirm.
3. Run stage 4 on the README as it stands, with output in the scratch folder. Open the slices and list every layout problem. Fix none of them.
4. Keep stage 5's limits: never contact a real third-party service and never use real personal data.
5. Return a report with these parts:
   - Wrong statements: the README line, what it says, the file and line that disproves it, and the corrected wording.
   - Statements you could not confirm, each with what you tried.
   - Layout problems from stage 4, and which render mode you used.
   - Totals: checked, wrong, unconfirmed.
   - Code problems you noticed, listed separately. They are not README errors.
6. End by offering to apply the corrections. If the user accepts, that is a normal run from stage 5 on: apply them, run stage 4 again, then stage 6.

## Mode: update (`--update`)

Use it when the README was right once and the code has moved on: new or renamed commands, changed defaults, a new feature, a changed screen. The aim is a small diff the owner can review. A rewrite would bring unchecked claims back in. Do "Before you start" first. Step 2 there matters for the images.

1. Find what changed since the README was last touched. `git log -1 --format=%H -- <README>` prints the commit that last changed it. Then `git diff --stat <that commit>..HEAD` lists the files changed since. Read the diffs of the files that matter, and look at `git status --short` for uncommitted work. Empty output or no git history: compare the README's statements with the code, as `--check` does. A recent typo fix can hide older drift, so treat the diff as a lead and not as proof.
2. Map the changes to README sections and write the map down before editing: commands and options, configuration and keys, features, the layout tree, counts, diagrams, and images whose screen changed.
3. Edit only the mapped sections. Keep the structure, the voice and everything that is still true. Do not rewrite, reorder or restyle.
4. Retake only the images whose screen changed, with the capture config the repository keeps (search for a JSON file with a `shots` list). Pass the shot names to `capture.mjs` (a shot's name is its file name without the extension, and `gif` is the GIF). Follow stage 2 for the setup, the rules and opening every image. Keep the file names, so the README links still work. No config and no demo instance, or `--no-images`: leave the images alone. Either way, tell the user which images were not retaken and whether the changes probably made them stale.
5. Run stage 4. Run stage 5 over the whole README, not only the edited sections: old claims rot too, and an edit can break a number or an anchor elsewhere. Then run stage 6 as in a full run. In the pull request, say which commit the update started from.

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

1. Find how the repo starts its demo instance. It must be local and offline. Put that command in the config's `server`, and the tool starts a clean instance for every shot. Or start it yourself and leave `server` out.
2. In the scratch folder: `npm init -y && npm i puppeteer-core gifenc pngjs omggif`, then `export README_TOOLS=<that folder>`. Chrome must be installed (`CHROME` overrides the search).
3. Copy `<skill>/scripts/capture.example.json` to the scratch folder and edit it: base URL, the command that starts the demo, selectors, and the steps for each shot. The header of `<skill>/scripts/capture.mjs` lists every setting and step, so read it instead of guessing. Pick a hero shot, three to five feature shots, and one demo GIF of one short flow (6 to 10 seconds, at most about 1200 px wide, last frame held).
4. Run it: `node <skill>/scripts/capture.mjs --config <config> [name ...]`. It refuses a non-loopback base URL, aborts and reports any request to another origin, and warns when the GIF is over 4 MB. Rules that are easy to get wrong:
   - **Where to run it.** Relative paths (`--config`, `outDir`, `--out`, `server.cwd`, `framesDir`) resolve against the folder you run the tool from. They do not resolve against the config file's folder or the repo root. Run it from the folder the config's paths were written for: the repo root for a config you wrote with repo-root paths, the sub-project folder for a config that lives in one. A config in the scratch folder needs an absolute `--config`.
   - **Where images go.** To `docs/images` under that folder, unless the config sets `outDir`. `--out <dir>` overrides it. While testing, pass `--out <scratch>/shots` so nothing lands in the repo early. When the shots are right, run once more without it.
   - **Colour scheme.** `"colorScheme": "light"` or `"dark"` at the top of the config, with an override per shot and for the GIF. The default is light, so the output does not depend on the machine's own mode. The app must follow `prefers-color-scheme`. Do not add a switch to the app only for captures. An app that follows it can give both schemes from one shot list. An app with one theme ships only that theme. Do not fake the other.
   - **Tall pages.** A shot shows only the viewport. For a taller page set `fullPage` or name an `element`. For a scrolling panel or a layout sized to the viewport, give the shot a taller `viewport`. The GIF is always one viewport, so size its viewport to fit.
   - **GIF state.** Recording begins right after the page loads, and the steps run while it records. Anything a step sets, such as a filter or a select, shows as the old state in the first frames. Set it before recording starts: use `colorScheme`, and put what the app reads from the address in the URL `path`.
   - **Selects.** A `select` step chooses an option of a `<select>` by its value.
5. **Open every image** with an image-reading tool and reject blank, half-loaded, spinner, error, cut-off and stray-hover states. If you cannot view images, skip stage 2 and say so in your report. Check the GIF: `node <skill>/scripts/verify-gif.mjs <gif> --frames <new empty folder>` prints size, frame count and play time, and writes one PNG per frame. Open a few frames, the first and the last among them.
6. Every name, address and account shown must be fictional (`example.com`, invented names).
7. Output: the file list with sizes, what each image shows, and an alt text for each. Images go in `docs/images/` unless the repo has a convention. Say that the capture config could stay in the repo so a later `--update` can retake images, and add it only if the user agrees.

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

In either mode you need `puppeteer-core` in the scratch folder (`npm init -y && npm i puppeteer-core`, unless stage 2 already did it) and Chrome. Then run one of these:

```sh
README_TOOLS=<scratch> <skill>/scripts/preview/render.sh <README.md> <repo-root> <scratch>/preview
README_TOOLS=<scratch> <skill>/scripts/preview/render.sh --offline <README.md> <repo-root> <scratch>/preview
```

The first line is the default mode, the closest preview of GitHub. The second is `--offline`, which can go anywhere among the arguments. Both save dark and light screenshots to `<scratch>/preview/shots/`. Both exit 1 and list problems when they find Mermaid parse errors, broken images, code blocks wider than the column, anchors that match no heading and no explicit `<a name>` or `id=` target, or tall images outside `<details>`.

**Default mode.** It needs `gh` logged in, `node` and Chrome. It posts the README text to GitHub's Markdown API through the GitHub CLI (`gh api markdown`) in `markdown` mode, the mode github.com uses for a README file. So hard-wrapped paragraphs flow as one paragraph and headings carry GitHub's own ids. Chrome then loads github-markdown-css from cdnjs and Mermaid from jsdelivr. Nothing else leaves the machine. It is still not an exact copy: callouts and task lists are rebuilt locally, Mermaid is a pinned CDN build (version and theme can differ from GitHub's), relative links and images resolve against the local folder, remote images and badges are placeholders and are not checked, and GitHub's client-side extras such as copy buttons are absent.

**`--offline`.** It needs no `gh` and no network. In the scratch folder, next to `puppeteer-core`, run `npm i marked@18.2.0 github-markdown-css@5.8.1 mermaid@11.4.1`. A missing package makes the script print that install command and exit 2. It renders with a local Markdown library, so it approximates GitHub more loosely: no syntax colours, emoji, mentions, footnotes or heading permalinks, and a computed heading id can miss the trailing hyphen GitHub adds after a heading that ends in an inline badge or comment. All remote images become placeholders and are not checked, and the run prints how many. Every request to any host is blocked and fails the run with the URLs.

**Which one.** Use `--offline` when the user asked for it, when the project is not on GitHub, when `gh` is missing or not logged in, or when the README must not leave the machine before the user decides to publish it. Otherwise use the default. If you used `--offline`, say in your report that the default check was not run, and that syntax colours, emoji and remote images were not seen.

Open every slice in both themes. Fix **layout only**, never facts. Typical fixes: a Mermaid label that needs quotes, a tree line that is too long, a `style` attribute (GitHub strips it; `align`, `width` and `height` survive), a tall image that needs `<details>`, an anchor that does not match its heading. Repeat until clean. Badges and other remote images show as local placeholders, so verify their real URLs in stage 5.

## 5. Fact-check

A different agent from the writer. Place the README at its final path first. Give it `references/fact-check-checklist.md` and the writer's "Claims I could not confirm" list.

It checks every checkable statement against the finished code, in fixed areas: layout tree, commands, options, config and keys, features versus what is wired, privacy claims (what leaves the machine), diagrams node by node, exports and data paths, links and anchors, badge URLs, numbers, images. It fixes the README, never the code, and reports code problems it finds. It never contacts a real third-party service and never uses real personal data. Run stage 4 again after its edits, because corrections change layout. In `--check` mode it edits nothing and reports instead.

Expect many corrections. Earlier runs needed many corrections in drafts the writer believed were accurate.

## 6. Deliver

1. Work on a branch. If the repo is PR-only, never commit to the default branch.
2. Commit the README and the images together, in one commit.
3. Open a pull request (use a pull request description helper if your agent has one). Say in it that the images came from the offline demo with fictional data, and list the fact-check's code problems and any claims still unconfirmed.
4. **Wait for the owner's approval before merging.** Never merge it yourself.

## Hard rules

- `--check` changes nothing in the repo: no edit, commit, branch or pull request.
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
| `references/fact-check-checklist.md` | Stage 5, `--check`, and stage 3 for the writer's self-check |
| `scripts/capture.mjs`, `capture.example.json`, `verify-gif.mjs`, `lib.mjs` | Stage 2 |
| `scripts/preview/render.sh`, `build.mjs`, `shoot.mjs`, `offline.mjs` | Stage 4, and again after stage 5 |

## Final report to the user

Full run and `--update`: list the README path, the images produced or retaken (or why none, and which were not retaken), the stage 4 result and the render mode used, the stage 5 totals (corrected, removed, confirmed), code problems found, claims still unconfirmed, and the PR link with a note that it is waiting for approval. `--update` also lists the sections you changed and the commit the update started from.

`--check`: the report from "Mode: check only", and the offer to apply the corrections.
