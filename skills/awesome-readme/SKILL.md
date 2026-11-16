---
name: awesome-readme
description: Write, rewrite or "make awesome" a project README in six checked stages (research, demo images, draft, GitHub-style render check, fact-check against the code, pull request). Use when asked to write or improve a README, or to add a demo GIF, screenshots, badges, Mermaid diagrams or a project layout tree to one, even when the user only says the README is weak or the repo should look better. Also use to audit or fact-check an existing README against the code without changing it (--check), and to refresh a README after the code changed (--update), for example when the user asks if the README is still accurate or says the docs are stale.
license: MIT
compatibility: Needs file access and a shell for every stage. The image stage also needs Node.js 22.2 or later, Chrome or Chromium, and the npm packages puppeteer-core, gifenc, pngjs and omggif installed in a scratch folder. The render check needs Node.js (tested on 22; its scripts use top-level await), Chrome or Chromium and puppeteer-core, plus either the GitHub CLI (gh) logged in with network access, or, with --offline, the npm packages marked, github-markdown-css and mermaid and no network.
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
- `--offline`: use no network in stages 4 and 5: render the preview locally and skip the URL fetches. See stage 4 and "What leaves the machine".

`--check` and `--update` do not combine. If the user asks for both, run `--check` and offer the update at the end. `--offline` and `--no-images` go with any mode. A request in words counts as a flag: "is my README still accurate?" is `--check`, and "the code changed, bring the README up to date" is `--update`. Words about keeping things local, such as "nothing may leave my machine" or "no network", mean `--offline`. Then stage 4 renders locally, stage 5 skips every URL fetch (link and badge GETs too, although they carry no README text) and lists those URLs as unchecked, and the research is not refreshed.

Below, `<skill>` is the absolute path of the folder that holds this file. Substitute it before running anything, because commands run from other folders and a relative path would not find the scripts.

## Before you start

1. Read the current README, the manifest (package file, build file), the scripts or task runner, `CONTRIBUTING`, and any repo instructions file. Note the project's voice and any branch rules (for example PR-only).
2. Find out whether an **offline demo instance** exists: a fixture or demo server, a script that runs on sample data, a seeded container, a storybook, a test harness that serves the UI. No demo instance, or a project with no screen (a CLI, a library, an agent skill): skip stage 2, say so in your report, and show real output of the project's own tools on a bundled example, captioned as that. See "A project with no screen" in `references/readme-skeleton.md`. Never mock up a screenshot or an output.
3. Check whether sub-agents are available. If yes, run one per stage (table below). If no, run the stages yourself, in order. Stage 5 must still be a separate pass: reopen the files, build the statement list by reading the stage 4 preview of the README top to bottom (not from your own diff or notes), and check each sentence fresh, as if someone else wrote the draft.
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

1. Do steps 1, 3 and 4 of "Before you start". There is no draft in this mode: list the README's claims first, then open the code for each claim.
2. Run stage 5 on the README as it stands, with `references/fact-check-checklist.md`, in the same fixed areas. Do not edit the README. Where the checklist says to fix, write the corrected wording in the report instead. Mark each claim confirmed, wrong or could not confirm. Confirmed claims are counted in the totals, not listed. A retake of images (area 12) always uses `--out <scratch folder>`, so committed images are never overwritten. Area 12 says what to do when the config's port is busy.
3. Run stage 4 on the README as it stands, with output in the scratch folder. Open every PNG and list every layout problem. Fix none of them.
4. Keep the network rule (Hard rules) and never use real personal data.
5. Return a report with these parts:
   - Wrong statements: the README line, what it says, the file and line that disproves it, and the corrected wording.
   - Statements you could not confirm, each with what you tried.
   - Layout problems from stage 4, which render mode you used, and the run's "NOT checked" line about remote images. For an `--offline` run also say that the default check was not run and that syntax colours, emoji and remote images were not seen.
   - Totals: checked, wrong, unconfirmed, counted by the rule in step 1 of "How to check" in the checklist. Of the confirmed claims, say how many you confirmed by running something and how many by reading only.
   - Code problems you noticed, listed separately. They are not README errors.
6. End by offering to apply the corrections. If the user accepts, that is a normal run from stage 5 on: apply them, run stage 4 again, then stage 6.

## Mode: update (`--update`)

Use it when the README was right once and the code has moved on: new or renamed commands, changed defaults, a new feature, a changed screen. The aim is a small diff the owner can review. A rewrite would bring unchecked claims back in. Do "Before you start" first. Step 2 there matters for the images.

1. Find what changed since the README was last touched. `git log -1 --format=%H -- <README>` prints the commit that last changed it. Then `git diff --stat <that commit>..HEAD` lists the files changed since. Read the diffs of the files that matter, and look at `git status --short` for uncommitted work. Empty output or no git history: compare the README's statements with the code, as `--check` does. A recent typo fix can hide older drift, so treat the diff as a lead and not as proof.
2. Map the changes to README sections and write the map down before editing: commands and options, configuration and keys, features, the layout tree, counts, diagrams, and images whose screen changed. Then search the repository for the old values (the old port, old file names, old counts). List the other files that still carry them in your report and edit none of them without asking.
3. Edit only the mapped sections. Keep the structure, the voice and everything that is still true. Do not rewrite, reorder or restyle. Leave alt texts, captions and numbers that describe an image until step 4, and edit them after you have opened the retaken image.
4. Retake only the images whose screen changed, with the capture config the repository keeps (search for a JSON file with a `shots` list). Pass the shot names to `capture.mjs` without `.png` (`gif` is the GIF). Follow stage 2 for the setup, the rules and opening every image. Keep the file names, so the README links still work. If a shot no longer fits (new data cuts a card off, say), you may change the kept config in the same pull request (a taller `viewport`, an `element`, `fullPage`) and say so in it. If the owner said not to touch config, retake with a one-off command-line override such as `--height N` and note that in the pull request. `--height` applies to every shot named in that run, and a height that a shot or the GIF sets in its own `viewport` wins over it. No config and no demo instance, or `--no-images`: leave the images alone. Either way, tell the user which images were not retaken and whether the changes probably made them stale.
5. Run stage 4. Run stage 5 over the whole README, not only the edited sections: old claims rot too, and an edit can break a number or an anchor elsewhere. Then run stage 6 as in a full run. In the pull request, say which commit the update started from. `--update` has no writer's "Claims I could not confirm" list: give the stage 5 agent the list of lines you edited instead.

## Stages and models

| # | Stage | Model | Why |
|---|---|---|---|
| 1 | Research | small, fast model | Mechanical: read the reference, list what to copy |
| 2 | Images | mid-tier model | Drives a browser and judges screenshots |
| 3 | Draft | mid, stronger if the code is large | Judgment: what to claim and how to say it |
| 4 | Render check | mid | Reads screenshots, fixes layout only |
| 5 | Fact-check | mid or stronger, never the writer | Judgment: finds what the writer got wrong |
| 6 | Deliver | you, the orchestrator | Commit, PR, wait for approval |

Hand each sub-agent the paths it needs, its stage text from this file, and the exact output you expect back. Between stages:

- Stage 1 is a read by default. One agent may do stages 1 and 3 together and then needs no hand-off between them.
- Stage 4 starts only after every image the README references exists, and after any page it links has been written. A missing image fails the run.
- Tell the stage 4 agent whether the owner has agreed to send the draft to GitHub's Markdown API (the default mode). If you do not know, it asks the user before it uses that mode.
- The stage 5 agent reruns the stage 4 script itself after its edits and may fix only the layout problems its own edits caused. You read the result.

## What leaves the machine

Use this to answer what a run sends and where. Each row was checked against the scripts.

| Stage | What leaves the machine | To where | How to avoid it |
|---|---|---|---|
| 1 | Nothing. A refresh of the research (when asked, or when the project is a different kind of thing from the sample) downloads public READMEs | raw.githubusercontent.com | Use `references/readme-patterns.md` as it is |
| 2 | Nothing from the project. The helper packages are downloaded when you install them. Only if the run allows remote origins (`--allow-remote` or `allowOrigins`): Chrome's own startup requests, which carry nothing from the project | npm registry; browser vendor hosts (Google's, for Chrome) in that case only | `--no-images`, or keep the capture run loopback-only: then Chrome starts with a host resolver rule that fails every host name except loopback, so nothing but the demo instance is reached, Chrome's own requests included. The tool also aborts and lists page requests to other origins |
| 3 | Nothing | none | not needed |
| 4, default | The whole README text. Two downloads that carry no README text: the stylesheet and the Mermaid script. Chrome's own startup requests, which carry nothing from the README | GitHub's Markdown API through `gh`; cdnjs.cloudflare.com; cdn.jsdelivr.net; browser vendor hosts (Google's, for Chrome) | `--offline` |
| 4, `--offline` | Nothing. The helper packages are downloaded once when you install them | npm registry | Install them before the run |
| 5 | A plain GET or HEAD, without credentials, of each URL the README links or embeds (docs links, badge images) | the hosts in those URLs | `--offline` skips them and lists them as unchecked |
| 6 | The branch, the README, the images and the pull request text | the project's remote and GitHub | Stop before stage 6. The owner decides |

## 1. Research

`references/readme-patterns.md` is the default research. Read it and stop there. Refresh it (section D in that file lists the READMEs) only if the user asks, or the project is a different kind of thing from the sample (library, CLI, web app, data set, agent skill or plugin). For a skill or plugin, read section E of that file too. Output: the project kind, the shape you will use and the techniques you will copy, each with the snippet. It goes to the stage 3 writer, or stays in your own notes when you write the draft yourself.

## 2. Images (skip if there is no demo instance)

A project with no screen has no demo instance. Replace this stage by running the project's own tools on its bundled example and keeping their real output for the README: text to paste, or images the tool saves itself. Open each image as in step 5, and keep the data fictional as in step 6. Otherwise:

1. Find how the repo starts its demo instance. It must be local and offline. Put that command in the config's `server`, and the tool starts a clean instance for every shot. Or start it yourself and leave `server` out.
2. In the scratch folder: `npm init -y && npm i puppeteer-core gifenc pngjs omggif`, then `export README_TOOLS=<that folder>`. Chrome must be installed (`CHROME` overrides the search).
3. Copy `<skill>/scripts/capture.example.json` to the scratch folder and edit it: base URL, the command that starts the demo, selectors, and the steps for each shot. The header of `<skill>/scripts/capture.mjs` lists every setting and step, so read it instead of guessing. Pick a hero shot, three to five feature shots, and one demo GIF of one short flow (6 to 10 seconds, at most about 1200 px wide, last frame held). Neither tool enforces that length or width. `verify-gif.mjs` prints both: quote its play time, because the capture tool's own figure differs slightly.
4. Run it: `node <skill>/scripts/capture.mjs --config <config> [name ...]`. It refuses a non-loopback base URL, aborts and reports any request to another origin, starts Chrome in a loopback-only run so that no host name but loopback resolves, and warns when the GIF is over 4 MB. Rules that are easy to get wrong:
   - **Where to run it.** Relative paths (`--config`, `outDir`, `--out`, `server.cwd`, `framesDir`) resolve against the folder you run the tool from. They do not resolve against the config file's folder or the repo root. Run it from the folder the config's paths were written for: the repo root for a config you wrote with repo-root paths, the sub-project folder for a config that lives in one. A config in the scratch folder needs an absolute `--config`.
   - **Where images go.** To `docs/images` under that folder, unless the config sets `outDir`. `--out <dir>` overrides it. While testing, pass `--out <scratch>/shots` so nothing lands in the repo early. When the shots are right, run once more without it.
   - **Colour scheme.** `"colorScheme": "light"` or `"dark"` at the top of the config, with an override per shot and for the GIF. The default is light, so the output does not depend on the machine's own mode. The app must follow `prefers-color-scheme`. Do not add a switch to the app only for captures. An app that follows it can give both schemes from one shot list. An app with one theme ships only that theme. Do not fake the other.
   - **Tall pages.** A shot shows only the viewport. For a taller page set `fullPage` or name an `element`. `"element": "body"` takes the whole page and stops where the content ends, while `fullPage` adds blank space under a page shorter than the viewport. For a scrolling panel or a layout sized to the viewport, give the shot a taller `viewport`. The GIF is always one viewport, so size its viewport to fit.
   - **GIF state.** Recording begins right after the page loads, and the steps run while it records. Anything a step sets, such as a filter or a select, shows as the old state in the first frames. Set it before recording starts: use `colorScheme`, and put what the app reads from the address in the URL `path`. To hold the opening frame, make the first step `{"wait": 1000}`.
   - **Selects.** A `select` step chooses an option of a `<select>` by its value.
   - **Names.** On the command line give a shot's name without `.png`. In the config either spelling works.
   - **Another port.** If the config's port is busy, copy the config to the scratch folder and change the port in `baseUrl` and `server.args` there (run from the same folder, with an absolute `--config`), or pass `--base-url <url> --server "<command> <args>"` for one run. The two go together when the command takes the port.
5. **Open every image** with an image-reading tool and reject blank, half-loaded, spinner, error, cut-off and stray-hover states. A focus ring or caret that the app itself draws is not a stray state; a hover left by the pointer is. If you cannot view images, skip stage 2 and say so in your report. Check the GIF: `node <skill>/scripts/verify-gif.mjs <gif> --frames <new empty folder>` prints size, frame count and play time, and writes one PNG per frame. Open a few frames, the first and the last among them.
6. Every name, address and account shown must be fictional (`example.com`, invented names).
7. Output: the file list with sizes, what each image shows, and an alt text for each: one or two sentences that name the screen, the state shown and the numbers visible, without "screenshot of". Images go in `docs/images/` unless the repo has a convention. Say that the capture config could stay in the repo so a later `--update` can retake images, and add it only if the user agrees.

## 3. Draft

Read `references/readme-skeleton.md` and follow its shape. Size it to the project: a small app gets a short README, and a section with nothing true to say is deleted. The skeleton also covers a project inside a larger repository and a project with no screen. Read `references/fact-check-checklist.md` too, as your self-check before you hand over.

- Centered hero: logo (the project's own, or none), title, one-line tagline, at most four static badges, a jump-link row. One optional line may say what the README itself is, for example sample output.
- Demo GIF directly under the hero. A project with no screen shows real tool output there instead.
- "Use it when / not when".
- Quick start of three commands or fewer, with the one prerequisite line above it.
- "How it works" with Mermaid diagrams taken from the real code path. Open the code and follow the calls. Do not draw what you imagine. For an instruction file, draw the steps it orders.
- Screenshots, tall ones collapsed in `<details>` with a `width`.
- Reference material (options, config, data locations, long lists) collapsed or in short tables.
- Project layout tree, one file per line.
- Development, credits, license.

Keep every code line, the tree included, under about 95 characters, and split a long shell line with a trailing backslash. The preview column holds about 97 characters, and a longer line scrolls sideways.

Write against the code, not from memory: open the file that decides each statement. Match the project's voice. The default is plain and sober, with no emoji, no marketing adjectives, and each term explained on first use. Treat every sentence as a claim you will have to defend.

Badges state stable, true facts (runtime version, language, "no build step"). No counts that go stale, nothing that names the repo owner, no vanity counters. Build each badge URL from the documented format in the skeleton's markup notes, and list it as not yet fetched: stage 5 fetches it. When requirements differ by part (an app on one Node version, a tool on another), badge the one the quick start needs and state the others in the text where they apply.

The writer ends its report with a list titled **Claims I could not confirm**, in two parts: *not checked at all*, and *confirmed by reading only* (nothing was run). That list goes to the orchestrator and the fact-checker, not into the README. An honest list is worth more than a smooth README.

If a README already exists, read it first and keep what is still true. Its claims get checked too. Old READMEs often hold overstated claims too.

## 4. Render check

Run it when every image and page the README references exists. In either mode you need `puppeteer-core` in the scratch folder (`npm init -y && npm i puppeteer-core`, unless stage 2 already did it) and Chrome. Then run one of these:

```sh
README_TOOLS=<scratch> <skill>/scripts/preview/render.sh <README.md> <repo-root> <scratch>/preview
README_TOOLS=<scratch> <skill>/scripts/preview/render.sh --offline <README.md> <repo-root> <scratch>/preview-offline
```

`<repo-root>` is the repository's top folder, also for a README in a sub-folder. It matters only for a link or image that starts with `/`, which GitHub resolves against the repository root. Relative paths resolve against the README's own folder. Use a new output folder for each run, for example when you compare the modes: a second run into the same folder overwrites the first.

The first line is the default mode, the closest preview of GitHub. The second is `--offline`, which can go anywhere among the arguments. Both save dark and light screenshots to `<out>/shots/`. Both exit 1 and list problems when they find Mermaid parse errors, broken images, code blocks wider than the column, anchors that match no heading and no explicit `<a name>` or `id=` target, or tall images outside `<details>`. A tall image renders more than 900 px high at the width shown.

**Default mode.** It needs `gh` logged in, `node` and Chrome. It posts the README text to GitHub's Markdown API through the GitHub CLI (`gh api markdown`) in `markdown` mode, the mode github.com uses for a README file. So hard-wrapped paragraphs flow as one paragraph and headings carry GitHub's own ids. Chrome then loads github-markdown-css from cdnjs and Mermaid from jsdelivr, and those two requests carry no README text. The page may load nothing else: any other request is blocked and fails the run. Chrome's background networking and component updates are switched off, but Chrome still makes a few startup requests of its own that the script cannot block, and they carry nothing from the README. Outside the run, the helper packages come from the npm registry when you install them, and stage 6 pushes to the project's remote. The preview is still not an exact copy: callouts and task lists are rebuilt locally, Mermaid is a pinned CDN build (version and theme can differ from GitHub's), relative links and images resolve against the local folder, remote images and badges are placeholders and are not checked (the run prints how many), and GitHub's client-side extras such as copy buttons are absent.

**`--offline`.** It needs no `gh` and no network. In the scratch folder, next to `puppeteer-core`, run `npm i marked@18.2.0 github-markdown-css@5.8.1 mermaid@11.4.1`. A missing package makes the script print that install command and exit 2. It renders with a local Markdown library, so it approximates GitHub more loosely: no syntax colours, emoji, mentions, footnotes or heading permalinks, and a computed heading id can miss the trailing hyphen GitHub adds after a heading that ends in an inline badge or comment. All remote images become placeholders and are not checked, and the run prints how many. Every request to any host is blocked and fails the run with the URLs, and Chrome's own startup requests fail at name resolution.

**Which one.** Sending the draft to GitHub's Markdown API needs the owner's agreement, so the orchestrator says whether it has it. Use `--offline` when the user asked for it, when the project is not on GitHub, when `gh` is missing or not logged in, or when the README must not leave the machine before the user decides to publish it. Otherwise use the default. If you used `--offline`, say in your report that the default check was not run, and that syntax colours, emoji and remote images were not seen.

Open every PNG in `<out>/shots/`, in both themes. Per theme it holds `first` (the first screen), `slice-NN` (the whole page in 900 px slices, and a nearly empty last slice is normal), `mermaid-N` (each diagram) and `details-N` (each `<details>`, opened). `first` and `slice-01` show the same screen and are the same image unless a GIF on it shows a different frame, so open one of the pair. `report.json` holds the checks. A GIF shows as one arbitrary still frame there: judge the GIF in stage 2. Fix **layout only**, never facts. Typical fixes: a Mermaid label that needs quotes, a code or tree line wider than the column (the run prints the width and each offending line: shorten it, or split a shell line with a trailing backslash), a `style` attribute (GitHub strips it; `align`, `width` and `height` survive), a tall image that needs `<details>`, an anchor that does not match its heading. Hard-wrapped lines are not a problem, because they flow; wide code lines are. Repeat until clean. Badges and other remote images show as local placeholders, so stage 5 checks their real URLs.

## 5. Fact-check

A different agent from the writer. Place the README at its final path first. Give it `references/fact-check-checklist.md` and the writer's "Claims I could not confirm" list.

It checks every checkable statement against the finished code, in fixed areas: layout tree, commands, options, config and keys, features versus what is wired, privacy claims (what leaves the machine), diagrams node by node, exports and data paths, links and anchors, badge URLs, numbers, images, install and "tested" claims. It fixes the README, never the code, and reports code problems it finds. It follows the network rule in Hard rules and never uses real personal data. With `--offline` it skips the URL fetches and lists those URLs as unchecked. It stops anything it started (a demo server, a test run) and checks that the port is free. After its edits it reruns the stage 4 script itself, because corrections change layout, and fixes only the layout problems its own edits caused. In `--check` mode it edits nothing and reports instead.

Expect many corrections. Earlier runs needed many corrections in drafts the writer believed were accurate.

## 6. Deliver

1. Work on a branch. If the repo is PR-only, never commit to the default branch.
2. Commit the README and the images together, in one commit. Stage files by explicit path, never everything at once: the tree can hold unrelated drafts, and some status tools shorten untracked paths.
3. Open a pull request (use a pull request description helper if your agent has one). Say in it that the images came from the offline demo with fictional data, and list the fact-check's code problems and any claims still unconfirmed.
4. **Wait for the owner's approval before merging.** Never merge it yourself.

## Hard rules

- `--check` changes nothing in the repo: no edit, commit, branch or pull request.
- **Network.** Allowed: a plain GET or HEAD, without credentials, of a URL the README itself links or embeds (a documentation link, a badge image), because a reader's browser fetches it anyway. A URL that appears only inside a code block is not fetched. Forbidden: calling a service the project integrates with in order to show or verify a feature, and sending project data anywhere that "What leaves the machine" does not list. Screenshots come from the demo instance only. A `--offline` run makes none of the allowed requests: it skips them and lists those URLs as unchecked.
- Never put real personal data in an image or in the README.
- Helper npm packages live in the scratch folder, never in the repo. Do not change code, config or tests in the repo. The one exception is the kept capture config in `--update` (see step 4 of that mode).
- A GIF stays under 4 MB. Roughly: a 9 second, 1200 px wide GIF from `gifenc` came out near 700 KB.
- The Mermaid build on cdnjs was blocked by the browser (ORB) in the local preview. The preview scripts use the jsdelivr build.
- Callouts (`> [!NOTE]`, `> [!WARNING]`, `> [!TIP]`) render. Use two to four.
- Tall screenshots go inside `<details>` with a `width` attribute. Tall means more than 900 px high at the width shown.
- Do not count things that change. Say "about" with a pointer to the command that prints the real number, or leave the number out. A fixed count that comes from a fixture ("eight sample notes") is fine when the checker can recount it from the code.

## Bundled files

| File | Read or run it when |
|---|---|
| `references/readme-patterns.md` | Stage 1, and when choosing how to present a section. Section E is for a skill or plugin |
| `references/readme-skeleton.md` | Stage 3: shape, working markup, and notes for small projects, sub-folders and projects with no screen |
| `references/fact-check-checklist.md` | Stage 5, `--check`, and stage 3 for the writer's self-check |
| `scripts/capture.mjs`, `capture.example.json`, `verify-gif.mjs`, `lib.mjs` | Stage 2 |
| `scripts/preview/render.sh`, `build.mjs`, `shoot.mjs`, `offline.mjs` | Stage 4, and again after stage 5 |

## Final report to the user

Full run and `--update`: list the README path, the images produced or retaken (or why none, and which were not retaken), the stage 4 result and the render mode used with the run's "NOT checked" line about remote images, the stage 5 totals (checked, corrected, removed, confirmed, and of the confirmed how many by running and how many by reading only), the URLs fetched or, with `--offline`, left unchecked, code problems found, claims still unconfirmed, and the PR link with a note that it is waiting for approval. `--update` also lists the sections you changed and the commit the update started from, and reports the lines you corrected in the edit step apart from the corrections the stage 5 pass found.

`--check`: the report from "Mode: check only", and the offer to apply the corrections.
