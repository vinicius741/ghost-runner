'use strict';
/**
 * Pure helpers for scripts/release.js: version planning and release asset checks.
 * Kept free of I/O so they can be unit tested.
 */

const STABLE = /^v?(\d+)\.(\d+)\.(\d+)$/;

/** Returns [major, minor, patch] for a stable version or tag, otherwise null. */
function parseStable(version) {
  const match = STABLE.exec(String(version ?? '').trim());
  return match ? match.slice(1).map(Number) : null;
}

function compareVersions(a, b) {
  for (let i = 0; i < 3; i += 1) {
    if (a[i] !== b[i]) return a[i] - b[i];
  }
  return 0;
}

/** Highest stable version among tags or versions; ignores prerelease and malformed entries. */
function latestStable(versions) {
  let latest = null;
  for (const version of versions) {
    const parsed = parseStable(version);
    if (parsed && (!latest || compareVersions(parsed, latest) > 0)) latest = parsed;
  }
  return latest ? latest.join('.') : undefined;
}

/**
 * Picks the next version. `bump` is patch, minor, major or an explicit X.Y.Z,
 * which must be higher than every known version.
 */
function planVersion(bump, knownVersions) {
  const previous = latestStable(knownVersions);
  const [major, minor, patch] = parseStable(previous) ?? [0, 0, 0];
  let next;
  if (bump === 'major') next = `${major + 1}.0.0`;
  else if (bump === 'minor') next = `${major}.${minor + 1}.0`;
  else if (bump === 'patch') next = `${major}.${minor}.${patch + 1}`;
  else if (parseStable(bump)) next = parseStable(bump).join('.');
  else throw new Error(`Unknown version "${bump}". Use patch, minor, major or a version such as 1.2.3.`);

  if (previous && compareVersions(parseStable(next), parseStable(previous)) <= 0) {
    throw new Error(`Version ${next} must be higher than the latest release ${previous}.`);
  }
  return { previous, next };
}

/** Files every release needs so each platform can install and update. */
function expectedAssets(version) {
  const base = `Ghost-Runner-${version}`;
  return [
    'latest.yml',
    'latest-linux.yml',
    'latest-mac.yml',
    `${base}-linux-x86_64.AppImage`,
    `${base}-win-x64.exe`,
    `${base}-win-x64.exe.blockmap`,
    `${base}-mac-universal.zip`,
    `${base}-mac-universal.zip.blockmap`,
    `${base}-mac-universal.dmg`,
    `${base}-mac-universal.dmg.blockmap`,
  ];
}

/**
 * Lists problems with a release: missing or empty files, update metadata for
 * another version, or metadata that points at files that were not uploaded.
 * @param {string} version
 * @param {{ name: string, size: number }[]} assets
 * @param {Record<string, string>} metadata latest*.yml file contents by name
 */
function checkReleaseAssets(version, assets, metadata) {
  const problems = [];
  const sizes = new Map(assets.map((asset) => [asset.name, asset.size]));
  for (const name of expectedAssets(version)) {
    if (!sizes.has(name)) problems.push(`Missing ${name}`);
    else if (!(sizes.get(name) > 0)) problems.push(`Empty ${name}`);
  }
  for (const [name, text] of Object.entries(metadata)) {
    const declared = /^version:\s*['"]?([^'"\s]+)/m.exec(text)?.[1];
    if (declared !== version) problems.push(`${name} is for version ${declared ?? 'unknown'}, expected ${version}`);
    for (const [, file] of text.matchAll(/^\s*(?:-\s*)?(?:url|path):\s*['"]?([^'"\s]+)/gm)) {
      if (!sizes.has(file)) problems.push(`${name} refers to ${file}, which is not attached`);
    }
  }
  return [...new Set(problems)];
}

module.exports = { parseStable, latestStable, planVersion, expectedAssets, checkReleaseAssets };
