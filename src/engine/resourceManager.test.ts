import { loadResources, getResource } from './resourceManager.js';
import fs from 'fs/promises';
import path from 'path';

// Mock the fs/promises module to avoid actual file system access in tests
jest.mock('fs/promises');
const mockedFs = fs as jest.Mocked<typeof fs>;

describe('ResourceManager', () => {
  // Clear any mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should load and cache JSON resources from a directory', async () => {
    // Arrange: Set up the mock file system
    const mockData = { message: 'Test data' };
    const mockFiles = ['test.json', 'another.txt'];

    mockedFs.readdir.mockResolvedValue(mockFiles as any);
    mockedFs.readFile.mockResolvedValue(JSON.stringify(mockData));

    // Act: Call the function to load resources
    await loadResources('fake/data/dir');

    // Assert: Check that readdir and readFile were called correctly
    expect(mockedFs.readdir).toHaveBeenCalledWith('fake/data/dir');
    expect(mockedFs.readFile).toHaveBeenCalledWith(path.join('fake/data/dir', 'test.json'), 'utf-8');
    // It should only read the .json file
    expect(mockedFs.readFile).toHaveBeenCalledTimes(1);

    // Assert: Check that the resource is cached correctly
    const resource = getResource<{ message: string }>('test');
    expect(resource).toEqual(mockData);
  });

  it('should throw an error if the requested resource is not found', () => {
    // Arrange: Ensure the cache is empty or doesn't have the key
    // (loadResources is not called in this test)

    // Act & Assert: Expect getResource to throw an error for a non-existent key
    expect(() => {
      getResource('nonexistent');
    }).toThrow('Resource with key "nonexistent" not found.');
  });
});