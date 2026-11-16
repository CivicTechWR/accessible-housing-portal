const { createJsWithTsPreset } = require("ts-jest");

const tsJestTransformCfg = createJsWithTsPreset().transform;

/** @type {import("jest").Config} **/
module.exports = {
  testEnvironment: "jsdom",
  testPathIgnorePatterns: ["/node_modules/", "/test/integration/", "/e2e/"],
  setupFilesAfterEnv: ["<rootDir>/test/jest-setup.ts"],
  transform: {
    ...tsJestTransformCfg,
  },
  // nuqs ships only ES modules, so ts-jest compiles it along with the app code.
  transformIgnorePatterns: ["/node_modules/(?!nuqs/)"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
    "^server-only$": "<rootDir>/test/mocks/server-only.ts",
  },
};
