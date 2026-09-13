const { createDefaultPreset } = require("ts-jest");

const tsJestTransformCfg = createDefaultPreset().transform;

/** @type {import("jest").Config} **/
module.exports = {
  testEnvironment: "jsdom",
  testPathIgnorePatterns: ["/node_modules/", "/test/integration/"],
  transform: {
    ...tsJestTransformCfg,
  },
  moduleNameMapper: {
    // This maps the "@" alias to the project root for Jest
    "^@/(.*)$": "<rootDir>/$1",
    "^server-only$": "<rootDir>/test/mocks/server-only.ts",
  },
};
