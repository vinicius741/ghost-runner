const { test } = require('node:test');
const assert = require('node:assert/strict');
const { latestStable, planVersion, expectedAssets, checkReleaseAssets } = require('../../scripts/release-utils');

test('latestStable ignores prereleases and malformed tags', () => {
  assert.equal(latestStable(['v1.1.0', 'v1.10.0', 'v1.9.9', 'v2.0.0-beta.1', 'nightly', '1.2.0']), '1.10.0');
  assert.equal(latestStable([]), undefined);
});

test('planVersion bumps from the latest known version', () => {
  const known = ['v1.1.2', '1.1.1'];
  assert.deepEqual(planVersion('patch', known), { previous: '1.1.2', next: '1.1.3' });
  assert.deepEqual(planVersion('minor', known), { previous: '1.1.2', next: '1.2.0' });
  assert.deepEqual(planVersion('major', known), { previous: '1.1.2', next: '2.0.0' });
  assert.deepEqual(planVersion('v1.4.0', known), { previous: '1.1.2', next: '1.4.0' });
  assert.deepEqual(planVersion('patch', []), { previous: undefined, next: '0.0.1' });
});

test('planVersion rejects versions that would not update installed apps', () => {
  assert.throws(() => planVersion('1.1.2', ['v1.1.2']), /must be higher/);
  assert.throws(() => planVersion('1.0.9', ['v1.1.2']), /must be higher/);
  assert.throws(() => planVersion('1.2.0-beta.1', ['v1.1.2']), /Unknown version/);
  assert.throws(() => planVersion('next', ['v1.1.2']), /Unknown version/);
});

function completeRelease(version) {
  const assets = expectedAssets(version).map((name) => ({ name, size: 10 }));
  const base = `Ghost-Runner-${version}`;
  const metadata = {
    'latest-mac.yml': `version: ${version}\nfiles:\n  - url: ${base}-mac-universal.zip\n  - url: ${base}-mac-universal.dmg\npath: ${base}-mac-universal.zip\n`,
    'latest.yml': `version: ${version}\nfiles:\n  - url: ${base}-win-x64.exe\npath: ${base}-win-x64.exe\n`,
    'latest-linux.yml': `version: '${version}'\nfiles:\n  - url: ${base}-linux-x86_64.AppImage\n`,
  };
  return { assets, metadata };
}

test('checkReleaseAssets accepts a complete release', () => {
  const { assets, metadata } = completeRelease('1.2.0');
  assert.deepEqual(checkReleaseAssets('1.2.0', assets, metadata), []);
});

test('checkReleaseAssets reports a release without macOS update files', () => {
  const { assets, metadata } = completeRelease('1.2.0');
  const withoutMac = assets.filter((asset) => !asset.name.includes('mac'));
  delete metadata['latest-mac.yml'];
  const problems = checkReleaseAssets('1.2.0', withoutMac, metadata);
  assert.ok(problems.includes('Missing latest-mac.yml'));
  assert.ok(problems.includes('Missing Ghost-Runner-1.2.0-mac-universal.zip'));
});

test('checkReleaseAssets reports empty files, stale metadata and dangling references', () => {
  const { assets, metadata } = completeRelease('1.2.0');
  assets.find((asset) => asset.name === 'latest.yml').size = 0;
  metadata['latest-linux.yml'] = 'version: 1.1.0\nfiles:\n  - url: Ghost-Runner-1.1.0-linux-x86_64.AppImage\n';
  const problems = checkReleaseAssets('1.2.0', assets, metadata);
  assert.ok(problems.includes('Empty latest.yml'));
  assert.ok(problems.includes('latest-linux.yml is for version 1.1.0, expected 1.2.0'));
  assert.ok(problems.includes('latest-linux.yml refers to Ghost-Runner-1.1.0-linux-x86_64.AppImage, which is not attached'));
});
