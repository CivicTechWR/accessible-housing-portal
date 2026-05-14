const fs = require("node:fs");

const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));
const packageLock = JSON.parse(fs.readFileSync("package-lock.json", "utf8"));
const packages = packageLock.packages || {};
const rootPackage = packages[""] || {};
const exactVersionPattern = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;

const failures = [];

function dependencyEntries(section) {
  return Object.entries(packageJson[section] || {});
}

function checkOverridePins(overrides, path = "overrides") {
  for (const [name, value] of Object.entries(overrides || {})) {
    const overridePath = `${path}.${name}`;

    if (typeof value === "string") {
      if (!exactVersionPattern.test(value)) {
        failures.push(`${overridePath} is not exact-pinned: ${value}`);
      }

      continue;
    }

    checkOverridePins(value, overridePath);
  }
}

checkOverridePins(packageJson.overrides);

for (const section of ["dependencies", "devDependencies"]) {
  const rootSection = rootPackage[section] || {};

  for (const [name, spec] of dependencyEntries(section)) {
    if (!exactVersionPattern.test(spec)) {
      failures.push(`${section}.${name} is not exact-pinned: ${spec}`);
    }

    if (rootSection[name] !== spec) {
      failures.push(
        `package-lock root ${section}.${name} is ${rootSection[name] || "<missing>"}, expected ${spec}`,
      );
    }

    const lockEntry = packages[`node_modules/${name}`];

    if (!lockEntry) {
      failures.push(`${section}.${name} is missing from package-lock.json`);
      continue;
    }

    if (lockEntry.version !== spec) {
      failures.push(
        `${section}.${name} lockfile version is ${lockEntry.version}, expected ${spec}`,
      );
    }
  }
}

for (const [path, entry] of Object.entries(packages)) {
  if (!path.startsWith("node_modules/") || entry.link) {
    continue;
  }

  if (!entry.version) {
    failures.push(`${path} is missing a locked version`);
  }

  if (!entry.resolved) {
    failures.push(`${path} is missing a resolved tarball URL`);
  }

  if (!entry.integrity) {
    failures.push(`${path} is missing an integrity hash`);
  }
}

if (failures.length > 0) {
  console.error("Lockfile supply-chain checks failed:");

  for (const failure of failures) {
    console.error(`- ${failure}`);
  }

  process.exit(1);
}

console.log("Lockfile supply-chain checks passed.");
