/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  // Use the official ts-jest preset for ES Modules
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  // By default, Jest ignores node_modules. We need to tell it to *not* ignore rot-js
  // because it's published as an ES module and needs to be transformed.
  transformIgnorePatterns: [
    '/node_modules/(?!rot-js)',
  ],
};