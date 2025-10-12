import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import path from 'path';
import { z } from 'zod';

// This is the modern way to mock ES Modules in Jest.
// It must be called before any imports of the module to be mocked.
jest.unstable_mockModule('fs/promises', () => ({
  readdir: jest.fn(),
  readFile: jest.fn(),
}));

// Now that the mock is set up, we can dynamically import the modules.
const {
  loadResources,
  getResource,
  clearResources,
  registerResourceDescriptor,
  unregisterResourceDescriptor,
} = await import('./resourceManager.js');
// We also import the mocked module to get a handle on the mock functions.
const fs = await import('fs/promises');

// jest.mocked is used to get a typed version of the mock functions.
const mockedFs = {
  readdir: jest.mocked(fs.readdir),
  readFile: jest.mocked(fs.readFile),
};

describe('ResourceManager', () => {
  beforeEach(() => {
    // It's good practice to clear mocks and caches before each test.
    mockedFs.readdir.mockClear();
    mockedFs.readFile.mockClear();
    clearResources();
  });

  afterEach(() => {
    unregisterResourceDescriptor('test');
  });

  it('should load and cache JSON resources from a directory', async () => {
    const mockData = { message: 'Test data' };
    const mockFiles = ['test.json', 'another.txt'];

    mockedFs.readdir.mockResolvedValue(mockFiles as any);
    mockedFs.readFile.mockResolvedValue(JSON.stringify(mockData));

    await loadResources('fake/data/dir');

    expect(mockedFs.readdir).toHaveBeenCalledWith('fake/data/dir');
    expect(mockedFs.readFile).toHaveBeenCalledWith(
      path.join('fake/data/dir', 'test.json'),
      'utf-8'
    );
    expect(mockedFs.readFile).toHaveBeenCalledTimes(1);

    const resource = getResource<{ message: string }>('test');
    expect(resource).toEqual(mockData);
  });

  it('validates resources when a descriptor is registered', async () => {
    mockedFs.readdir.mockResolvedValue(['test.json'] as any);
    mockedFs.readFile.mockResolvedValue(JSON.stringify({ value: 'ok' }));

    registerResourceDescriptor('test', { schema: z.object({ value: z.string() }) });

    await loadResources('fake/data/dir');

    expect(getResource<{ value: string }>('test')).toEqual({ value: 'ok' });
  });

  it('throws when validation fails for a registered descriptor', async () => {
    mockedFs.readdir.mockResolvedValue(['test.json'] as any);
    mockedFs.readFile.mockResolvedValue(JSON.stringify({ value: 42 }));

    registerResourceDescriptor('test', { schema: z.object({ value: z.string() }) });

    await expect(loadResources('fake/data/dir')).rejects.toThrow(
      'Resource "test" failed validation'
    );
  });

  it('should throw an error if the requested resource is not found', () => {
    expect(() => {
      getResource('nonexistent');
    }).toThrow('Resource with key "nonexistent" not found.');
  });
});
