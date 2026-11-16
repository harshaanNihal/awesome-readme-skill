// Fails when a fact that keeps this repository installable stops being true:
// plugin manifests, the single nested skill, its front matter, its file references, its LICENSE copy.
// Usage: node tools/check-repo.mjs [repo-root]. Prints one problem per line, exits 1 if there is any.
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.argv[2] ?? '.';
const problems = [];
const bad = (msg) => { problems.push(msg); };
const at = (...parts) => join(root, ...parts);
const filled = (v) => typeof v === 'string' && v.trim() !== '';

function readJson(file) {
  if (!existsSync(at(file))) return bad(`${file}: missing`);
  try {
    return JSON.parse(readFileSync(at(file), 'utf8'));
  } catch (e) {
    bad(`${file}: not valid JSON (${e.message})`);
  }
}

// Reads the front matter of a SKILL.md. Handles only the shape this file uses: one-line top-level
// `key: value` pairs (plain, "double" or 'single' quoted) and one level of nested `  key: value`
// lines under a bare `key:`. Does not handle block scalars (| and >), values that continue on the
// next line, lists, flow maps ({a: b}), anchors, or escapes inside quotes; the validator in CI parses the full YAML.
function frontMatter(src, file) {
  const m = src.match(/^---\n([\s\S]*?)\n---(?:\n|$)/);
  if (!m) return null;
  const out = {};
  let map;
  for (const line of m[1].split('\n')) {
    if (!line.trim() || line.trimStart().startsWith('#')) continue;
    const kv = line.match(/^( *)([\w-]+):[ \t]*(.*?)[ \t]*$/);
    if (!kv) { bad(`${file}: cannot read front matter line "${line}"`); continue; }
    const [, indent, key, raw] = kv;
    const value = raw.replace(/^(["'])(.*)\1$/, '$2');
    if (indent) {
      if (map) map[key] = value;
      else bad(`${file}: front matter line "${line.trim()}" is indented under no key`);
    } else if (raw === '') {
      map = out[key] = {};
    } else {
      map = undefined;
      out[key] = value;
    }
  }
  return out;
}

// 1 to 3: manifests
const plugin = readJson('.claude-plugin/plugin.json');
const market = readJson('.claude-plugin/marketplace.json');
if (plugin) {
  for (const [key, v] of [['name', plugin.name], ['version', plugin.version], ['description', plugin.description], ['author.name', plugin.author?.name]]) {
    if (!filled(v)) bad(`plugin.json: "${key}" is missing or empty`);
  }
  if (plugin.homepage !== undefined) {
    try { new URL(plugin.homepage); } catch { bad(`plugin.json: homepage "${plugin.homepage}" is not a URL`); }
  }
}
if (market) {
  if (!filled(market.name)) bad('marketplace.json: "name" is missing or empty');
  if (!filled(market.owner?.name)) bad('marketplace.json: "owner.name" is missing or empty');
  if (!Array.isArray(market.plugins) || market.plugins.length !== 1) {
    bad('marketplace.json: "plugins" must be an array with exactly one entry');
  } else {
    const entry = market.plugins[0];
    if (plugin && entry?.name !== plugin.name) bad(`marketplace.json: plugin entry name "${entry?.name}" differs from plugin.json name "${plugin.name}"`);
    if (entry?.source !== './') bad(`marketplace.json: plugin entry source must be "./", found ${JSON.stringify(entry?.source)}`);
    if (entry?.version !== undefined) bad('marketplace.json: plugin entry must not have a "version" (it lives in plugin.json only)');
  }
}

// 4 and 5: one nested skill, nothing at the root that hides it
if (existsSync(at('SKILL.md'))) bad('SKILL.md: must not exist at the repository root, it hides the nested skill from the npx skills CLI');
const folders = existsSync(at('skills'))
  ? readdirSync(at('skills'), { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name)
  : [];
if (folders.length !== 1) bad(`skills/: expected exactly one folder, found ${folders.length}${folders.length ? ` (${folders.join(', ')})` : ''}`);
const folder = folders.find((f) => f === plugin?.name) ?? folders[0];
if (folder !== undefined && filled(plugin?.name) && folder !== plugin.name) bad(`skills/${folder}: folder name differs from plugin name "${plugin.name}"`);

if (folder !== undefined) {
  const dir = join('skills', folder);
  const skillFile = join(dir, 'SKILL.md');
  if (!existsSync(at(skillFile))) bad(`${skillFile}: missing`);
  else {
    const src = readFileSync(at(skillFile), 'utf8').replace(/\r\n/g, '\n');
    const fm = frontMatter(src, skillFile);

    // 6: front matter per the Agent Skills standard
    if (!fm) bad(`${skillFile}: must start with a --- front matter block`);
    else {
      const allowed = ['name', 'description', 'license', 'compatibility', 'metadata', 'allowed-tools'];
      for (const key of Object.keys(fm)) {
        if (!allowed.includes(key)) bad(`${skillFile}: front matter key "${key}" is not allowed (allowed: ${allowed.join(', ')})`);
      }
      const { name, description, compatibility } = fm;
      if (name !== folder) bad(`${skillFile}: front matter name "${name}" differs from the folder name "${folder}"`);
      if (typeof name !== 'string' || name.length > 64 || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(name)) {
        bad(`${skillFile}: name must be 1 to 64 characters: lower-case letters, digits and single hyphens, none leading or trailing`);
      }
      const dLen = typeof description === 'string' ? [...description].length : 0;
      if (dLen < 1 || dLen > 1024) bad(`${skillFile}: description must be 1 to 1024 characters, found ${dLen}`);
      if (compatibility !== undefined && (typeof compatibility !== 'string' || [...compatibility].length > 500)) {
        bad(`${skillFile}: compatibility must be at most 500 characters`);
      }
    }

    // 7: length
    const lines = src.trimEnd().split('\n').length;
    if (lines >= 500) bad(`${skillFile}: has ${lines} lines, must be under 500`);

    // 8: every references/ or scripts/ path in backticks exists
    const seen = new Set();
    for (const [, span] of src.matchAll(/`([^`\n]+)`/g)) {
      for (const [mention] of span.matchAll(/(?:references|scripts)\/[\w./-]+/g)) {
        const rel = mention.replace(/[./]+$/, '');
        if (!seen.has(rel) && !existsSync(at(dir, rel))) bad(`${skillFile}: mentions \`${rel}\` but ${join(dir, rel)} does not exist`);
        seen.add(rel);
      }
    }

    // 9: the skill folder ships its own copy of the license
    const copy = join(dir, 'LICENSE');
    if (!existsSync(at('LICENSE'))) bad('LICENSE: missing at the repository root');
    else if (!existsSync(at(copy))) bad(`${copy}: missing`);
    else if (!readFileSync(at(copy)).equals(readFileSync(at('LICENSE')))) bad(`${copy}: differs from the root LICENSE, they must be identical`);
  }
}

// 10: no junk tracked by git
if (existsSync(at('.git'))) {
  const tracked = execFileSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8', maxBuffer: 1 << 28 }).split('\0');
  for (const file of tracked.filter((f) => /(^|\/)(\.DS_Store|node_modules)(\/|$)/.test(f))) bad(`${file}: must not be tracked by git`);
} else {
  console.error('note: not a git repository, skipped the check for tracked .DS_Store and node_modules');
}

for (const problem of problems) console.log(problem);
process.exitCode = problems.length ? 1 : 0;
