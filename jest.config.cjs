/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  // No preset, we'll configure manually
  testEnvironment: 'node',
  // Tells Jest to use ES Modules
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  // The module name mapper is still needed to resolve .js extensions in imports
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  // The transform configuration for ts-jest
  transform: {
    '^.+\\.(t|j)sx?$': [
      'ts-jest',
      {
        useESM: true,
        // tsconfig might be needed if you have a specific one for tests
        // tsconfig: 'tsconfig.test.json'
      },
    ],
  },
  // By default, Jest ignores node_modules. We need to tell it to *not* ignore rot-js
  // because it's published as an ES module and needs to be transformed.
  transformIgnorePatterns: [
    '/node_modules/(?!rot-js)',
  ],
};