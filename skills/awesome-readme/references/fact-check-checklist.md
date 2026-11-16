# Fact-check checklist

Use this in stage 5, and in `--check` mode (audit only, see the end of this file). The checker must be a different agent from the writer, or, with no sub-agents, a separate pass done after the draft with the draft's assumptions set aside. Place the README at its final path in the repo first, so relative links and paths resolve. The writer reads this file too, as a self-check before handing over.

The rule: every sentence is a claim until you have checked it against the finished code. Earlier runs needed many corrections in drafts the writer believed were accurate, and old READMEs held overstated claims that only showed up when each sentence was checked one by one. Expect the same.

Fix the README, never the code. If checking exposes a code problem (a feature that is documented in the code's own help text but not wired, a dead option, a leak), do not fix it. Put it in the report.

In `--check` mode do not edit the README either. Where this file says to fix, write the corrected wording in the report.

## How to check

1. Read the README top to bottom and list every checkable statement. A statement is checkable when code, config, a command or a URL can confirm or refute it. Count one statement as one checkable clause: a sentence with two facts is two statements. Use the same unit in every total.
2. For each one, open the file that decides it and read the code. Do not trust names, comments or the old README. Do not infer behavior from a function name.
3. Run what is safe to run: `--help`, the offline test suite, a fixture or demo instance. Never run anything that calls a service the project integrates with, and never use real personal data. Stop what you started (a demo server, a test run) and check that its port is free. A background process id can belong to a wrapper, so find the listener by port (for example `lsof -nP -iTCP:<port> -sTCP:LISTEN`) and stop that.
4. Mark each claim: confirmed, corrected, removed, or could not confirm. Rewrite corrected claims in plain, narrower words. Remove what you cannot confirm. The exception: when confirming it depends on a check the rules forbid, or on a file not yet written, keep it and list it as still open.
5. Recount after the edit. A fix can break an earlier sentence, a number or an anchor.

## Words that need evidence

Check hard any sentence with: all, every, always, never, only, none, no (as in "has no X"), automatically, by default, at most, at least, exactly, supports, secure, private, local, offline, fast, safe, free, and any number. Absence claims ("it does not do X") need a search of the whole code path, not one file.

A plural subject with no keyword is also a universal: "Responses carry header X", "The page says ...". Such sentences were wrong only on the error path or the empty state. Test the error response, the empty state, the first case and the last.

## Fixed areas

### 1. Layout tree
- Every path in the tree exists. Every existing top-level and source file that matters is in the tree, or the README says what it leaves out.
- The one-line comment beside each file matches what the file does. Open the file.
- Files that a build or install step creates are not shown as if they were in the repo.
- No line is longer than about 95 characters (the preview column holds about 97). One file per line.

### 2. Commands
- Every command in a code block exists in the package scripts, Makefile, CLI help or docs, spelled the same.
- The comment beside a command says what it really does (what it downloads, where it writes, which port).
- Required versions (language, runtime, tools) match the manifest, version file and CI matrix.
- The quick start works from a fresh clone, in order, with nothing unstated in between. Method: copy the tracked files (`git ls-files`) of the project to a new temporary folder and run the steps there. Untracked files do not come along, which is the point.
- No code line is wider than about 95 characters. Split a long shell line with a trailing backslash.
- Ports, hosts and URLs in the text match the code's defaults and its fixture or demo instance.

### 3. Options and flags
- Each flag in a table exists, with the same spelling, and does what the table says.
- Defaults match the code (numbers, units, which value applies when the flag is absent).
- Dependencies between flags are real ("requires X").
- Output symbols, exit codes and formats named in the text match the printing code.

### 4. Config and keys
- Each environment variable is read somewhere, under that exact name.
- The file the README names for config (for example an env file) exists as described, and the load order and precedence claims match the code.
- Which keys are required, optional or unused matches behavior with the key missing.
- Secret handling claims (redaction, never stored, never logged) are traced to the code that does it and to every place the value could be written.

### 5. Feature lists versus what is wired
- Each listed feature is reachable from a real entry point: registered, imported, routed, not just present as a file.
- Each listed source, integration or module is in the list the code iterates over.
- Features that exist in code but are off by default are described as off by default.
- Nothing the code does not do is implied. Look for "supports" sentences that stretch.
- Counts of features, sources, rules or tests are computed, or stated in words that cannot go stale ("about", or a pointer to the command that prints the number). A fixed count that comes from a fixture is fine when you recount it from the code.

### 6. Privacy and data-flow claims
- For every claim about what leaves the machine, find the code that sends it. Check the destination, the method, and exactly which data is in the request (a value, a hash, a prefix of a hash, a part of an address).
- Check what is stored locally, where, and in what form (a response body versus a hash of it).
- Check what runs only when the user opts in, and that the README says so.
- "Nothing is sent" and "only" claims: search for every network client, not just the main one.
- Identify any telemetry, update checks and font or CDN loads in the app's pages.
- A table of what the tool sends where is checked row by row against the code. Add a row for any request it leaves out.

### 7. Diagrams, node by node
- Every node names a thing that exists (file, module, service, state).
- Every arrow is a real call, data flow or transition in the code. Follow it in the source.
- No step is missing that the code takes, and none is added that it does not.
- Direction is right. Labels on arrows are true.
- Diagram text matches the prose beside it.

### 8. Exports, data paths and formats
- Each path or folder named for output, cache or user data exists in the code, with the same spelling.
- Each export or file format is produced by the code, with the field names or behavior described.
- Anything the README says is git-ignored is in the ignore file.
- URL routes and API paths named in the text match the router.

### 9. Links and anchors
- Every `#anchor` matches a heading (or an explicit `<a name>` or `id=` target), by GitHub's rule: lower case, punctuation dropped, spaces to hyphens, repeated headings numbered. The preview script (`scripts/preview/`) lists dead anchors.
- Every relative link and image path points to a file that exists. A link to a file that another agent is still writing: check again right before you report, and say in the report whether it existed then.
- Every external link is a real URL for the thing it names. Check it with a plain GET or HEAD, without credentials, of a URL the README itself links or embeds: a reader's browser fetches it anyway. Never call a service the project integrates with to see whether a feature works, and send no project data. In `--offline` runs skip these requests and list the URLs as unchecked.
- Credits and licenses: each named project, its license and its link are right, and match what the project's own license file says. If you cannot confirm a license, say so in the report.

### 10. Badges
- Each badge URL returns 200 with an image (a plain GET, as in area 9) and shows what its alt text says. In `--offline` runs list the badge URLs as unchecked.
- Each badge states a stable, true fact (a runtime version, a language, "no build step", a fixed binding). No counts that go stale, nothing that names the repo owner, no vanity counters.
- Badge alt text is meaningful, not "badge".

### 11. Numbers
- Every number is recomputed from the code or from a command's output: limits, timeouts, concurrency, ports, sizes, counts, versions, rates.
- Units are right (seconds versus milliseconds, bytes versus kilobytes).
- A number that is a default says it is a default.
- A fixed count that comes from a fixture ("eight sample notes") is fine when you recount it from the code.

### 12. Images
- Each image shows the current UI. Method: if the repository keeps a capture config, retake the images into a scratch folder with `--out` and compare them with the committed ones by eye, never overwriting those. A retake can differ in a few anti-aliased pixels, so compare what is on screen, not bytes. With no config, say that the images were not compared. Each alt text describes what the image shows.
- Run the capture tool as it is, loopback-only. Then it starts Chrome with a host resolver rule that fails every host name except loopback, so the run reaches nothing but the demo instance, Chrome's own requests included. Do not add `--allow-remote` or `allowOrigins` for a check: with either, the rule is off and Chrome's own startup requests are possible.
- No image shows real personal data, a real account, or a real token.
- Captions match the image.

### 13. Install and "tested" claims
- Each route in an install table or list has a Tested value. "Yes", "tested", "works with" and "verified" need a logged run: the command, the date or version, and the result. Open the log. No log: change the word to "documented, not run", or remove the claim.
- Each command in an install route is spelled as in the tool's own docs or help.
- Steps addressed to an agent each name one action and a check that proves it.

## Report format

Return a table the owner can scan, then the leftovers.

| README line | Area | README said | Code says | Action |
|---|---|---|---|---|
| 42 | Commands | "starts on port A" | default port is B (file, line) | corrected |

Then:
- **Totals: checked, corrected, removed, confirmed.** One statement is one checkable clause. The number corrected is a useful signal of how much the draft overreached.
- **Code problems found** (not fixed): one line each, with file and what is wrong.
- **Not checked by rule:** the URLs you did not fetch (`--offline`), and any image you could not compare.
- **Claims I could not confirm**: the writer's list, in its two parts (not checked at all; confirmed by reading only), each now resolved (confirmed, corrected, removed) or still open with the reason.

## Report format in `--check` mode

The README stays as it is. Mark each claim confirmed, wrong or could not confirm. Return:

| README line | README said | Code says (file, line) | Corrected wording |
|---|---|---|---|
| 42 | "starts on port A" | default port is B (`src/server.js`, line 12) | "starts on port B" |

Then:
- **Totals:** checked, wrong, unconfirmed. One statement is one checkable clause.
- **Could not confirm:** each statement, with what you tried and why it stayed open.
- **Layout problems** from the render check, unfixed.
- **Code problems noticed** (not fixed, not README errors): one line each, with file and what is wrong.
