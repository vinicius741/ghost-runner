#!/usr/bin/env node
'use strict';
/**
 * Publishes a desktop release from any machine with the GitHub CLI signed in.
 * Building and signing happen in GitHub Actions, so no signing key is needed here.
 *
 *   pnpm release [patch|minor|major|X.Y.Z] [--ref main] [--dry-run] [--no-wait] [--skip-ci-check]
 *   pnpm release:verify vX.Y.Z
 */
const { execFileSync, spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { parseArgs } = require('node:util');
const { planVersion, checkReleaseAssets } = require('./release-utils');

const pkg = require('../package.json');
const { owner, repo } = pkg.build.publish[0];
const REPO = `${owner}/${repo}`;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function gh(args) {
  return execFileSync('gh', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

const ghJson = (args) => JSON.parse(gh(args) || 'null');

/** Runs gh with its output shown, for long-running watch commands. */
function ghVisible(args) {
  return spawnSync('gh', args, { stdio: 'inherit' }).status === 0;
}

async function verify(tag) {
  const version = tag.replace(/^v/, '');
  const release = ghJson(['release', 'view', tag, '-R', REPO, '--json', 'assets,url,isDraft']);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ghost-runner-release-'));
  try {
    try {
      gh(['release', 'download', tag, '-R', REPO, '--pattern', 'latest*.yml', '--dir', dir, '--clobber']);
    } catch (error) {
      // A release without any update metadata is reported as missing files below.
      if (!/no assets/i.test(String(error.stderr))) throw error;
    }
    const metadata = Object.fromEntries(fs.readdirSync(dir)
      .map((name) => [name, fs.readFileSync(path.join(dir, name), 'utf8')]));
    const problems = checkReleaseAssets(version, release.assets, metadata);
    if (problems.length) {
      throw new Error(`Release ${tag} is incomplete:\n- ${problems.join('\n- ')}`);
    }
    console.log(`Release ${tag} has every installer and update file${release.isDraft ? ' (draft)' : ''}: ${release.url}`);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

/** Waits for CI on the commit, or fails when it has not passed. */
function ensureCiPassed(sha) {
  const runs = ghJson(['run', 'list', '-R', REPO, '--workflow', 'ci.yml', '--commit', sha,
    '--json', 'databaseId,status,conclusion,url', '--limit', '10']);
  if (runs.some((run) => run.conclusion === 'success')) return;
  const active = runs.find((run) => run.status !== 'completed');
  if (active) {
    console.log(`Waiting for CI on ${sha.slice(0, 7)}: ${active.url}`);
    if (ghVisible(['run', 'watch', String(active.databaseId), '-R', REPO, '--exit-status', '--interval', '20'])) return;
    throw new Error(`CI failed for ${sha.slice(0, 7)}: ${active.url}`);
  }
  throw new Error(`CI has not passed for ${sha.slice(0, 7)}${runs[0] ? `: ${runs[0].url}` : ''}. `
    + 'Fix it or pass --skip-ci-check.');
}

async function findReleaseRun(tag, startedAt) {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const runs = ghJson(['run', 'list', '-R', REPO, '--workflow', 'release.yml', '--event', 'workflow_dispatch',
      '--json', 'databaseId,displayTitle,createdAt,url', '--limit', '10']);
    const run = runs.find((candidate) => candidate.displayTitle === `Release ${tag}`
      && Date.parse(candidate.createdAt) >= startedAt - 60_000);
    if (run) return run;
    await sleep(3000);
  }
  throw new Error(`Could not find the release workflow run for ${tag}. Check the Actions tab of ${REPO}.`);
}

async function release(bump, options) {
  gh(['auth', 'status']);
  const sha = gh(['api', `repos/${REPO}/commits/${options.ref}`, '--jq', '.sha']);
  const releases = ghJson(['release', 'list', '-R', REPO, '--limit', '100',
    '--json', 'tagName,isDraft,isPrerelease']);
  const published = releases.filter((item) => !item.isDraft && !item.isPrerelease).map((item) => item.tagName);
  const { previous, next } = planVersion(bump, [...published, pkg.version]);
  const tag = `v${next}`;
  if (published.includes(tag)) throw new Error(`${tag} is already published.`);

  console.log(`Releasing ${tag} (previous ${previous ?? 'none'}) from ${options.ref} at ${sha.slice(0, 7)}.`);
  if (!options['skip-ci-check']) ensureCiPassed(sha);
  if (options['dry-run']) {
    console.log('Dry run: nothing was published.');
    return;
  }

  const startedAt = Date.now();
  gh(['workflow', 'run', 'release.yml', '-R', REPO, '--ref', 'main', '-f', `release_tag=${tag}`, '-f', `ref=${sha}`]);
  const run = await findReleaseRun(tag, startedAt);
  console.log(`Building ${tag}: ${run.url}`);
  if (options['no-wait']) return;

  if (!ghVisible(['run', 'watch', String(run.databaseId), '-R', REPO, '--exit-status', '--interval', '30'])) {
    throw new Error(`The release workflow failed: ${run.url}\n`
      + `${tag} stays an unpublished draft, so installed apps are unaffected. Fix the cause, then run `
      + `"gh run rerun ${run.databaseId} -R ${REPO} --failed" or "pnpm release ${next}".`);
  }
  await verify(tag);
}

async function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      ref: { type: 'string', default: 'main' },
      'dry-run': { type: 'boolean', default: false },
      'no-wait': { type: 'boolean', default: false },
      'skip-ci-check': { type: 'boolean', default: false },
      help: { type: 'boolean', short: 'h', default: false },
    },
  });
  if (values.help) {
    console.log(fs.readFileSync(__filename, 'utf8').split('\n').slice(3, 8)
      .map((line) => line.replace(/^ \*\s?/, '')).join('\n'));
    return;
  }
  if (positionals[0] === 'verify') {
    if (!positionals[1]) throw new Error('Usage: pnpm release:verify vX.Y.Z');
    await verify(positionals[1]);
    return;
  }
  await release(positionals[0] ?? 'patch', values);
}

main().catch((error) => {
  const detail = error.stderr ? String(error.stderr).trim() : '';
  console.error(`release: ${error.message}${detail && !error.message.includes(detail) ? `\n${detail}` : ''}`);
  process.exit(1);
});
