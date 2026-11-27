import { appendFile, readFile, writeFile } from 'node:fs/promises';

function stableVersion(value) {
  const parts = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.exec(value);
  if (!parts) throw new Error(`Expected a stable version, received ${value}`);
  return parts.slice(1).map(Number);
}

const {
  GITHUB_OUTPUT: output,
  GITHUB_REPOSITORY: repository,
  GITHUB_RUN_NUMBER: runNumber,
  GITHUB_SHA: commit,
  NPM_LATEST: registryMetadata,
  PACKAGE_NAME: expectedName,
} = process.env;
const manifest = JSON.parse(await readFile('package.json', 'utf8'));
const latest = JSON.parse(registryMetadata);
const [major, minor, basePatch] = stableVersion(manifest.version);
const [latestMajor, latestMinor, latestPatch] = stableVersion(latest.version);
const patch = basePatch + Number(runNumber);
if (!Number.isSafeInteger(patch) || patch <= basePatch || !/^[a-f0-9]{40}$/.test(commit)) {
  throw new Error('Expected a GitHub Actions run number and commit SHA');
}
if (manifest.name !== expectedName) {
  throw new Error(`Package name changed from ${expectedName} to ${manifest.name}`);
}

// The run number is stable across retries. An older run must never replace latest.
const version = `${major}.${minor}.${patch}`;
const order = major - latestMajor || minor - latestMinor || patch - latestPatch;
if (latest.gitHead === commit || order < 0) {
  console.log(`Skipping ${version}. npm already serves ${latest.version}.`);
} else if (order === 0) {
  throw new Error(`npm version ${version} belongs to a different commit`);
} else {
  const readme = await readFile('README.md', 'utf8');
  const screenshotBase = `https://raw.githubusercontent.com/${repository}/${commit}/docs/screenshots/`;
  await writeFile('README.md', readme.replaceAll('](docs/screenshots/', `](${screenshotBase}`));
  await writeFile('package.json', JSON.stringify({ ...manifest, version, gitHead: commit }, null, 2) + '\n');
  await appendFile(output, `version=${version}\n`);
}
