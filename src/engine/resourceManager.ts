import * as fs from 'fs/promises';
import path from 'path';
import { DEFAULT_RESOURCE_DESCRIPTORS, type ResourceDescriptor } from './resourceDescriptors.js';

/**
 * A cache for storing game data loaded from JSON files.
 * The key is the filename without the extension.
 */
const resourceCache = new Map<string, any>();

const resourceDescriptors = new Map<string, ResourceDescriptor<any>>(
  Object.entries(DEFAULT_RESOURCE_DESCRIPTORS)
);

function describeZodIssue(pathSegments: (string | number)[], message: string): string {
  const pathLabel = pathSegments.length > 0 ? pathSegments.join('.') : '(root)';
  return `${pathLabel}: ${message}`;
}

function validateResource(key: string, data: unknown): unknown {
  const descriptor = resourceDescriptors.get(key);

  if (!descriptor) {
    return data;
  }

  const result = descriptor.schema.safeParse(data);

  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => describeZodIssue(issue.path, issue.message))
      .join('; ');
    throw new Error(`Resource "${key}" failed validation: ${issues}`);
  }

  return descriptor.transform ? descriptor.transform(result.data) : result.data;
}

/**
 * Registers or overrides a resource descriptor used during validation.
 * Primarily intended for tests and tooling.
 */
export function registerResourceDescriptor<T>(
  key: string,
  descriptor: ResourceDescriptor<T>
): void {
  resourceDescriptors.set(key, descriptor as ResourceDescriptor<any>);
}

/**
 * Removes a previously registered resource descriptor.
 * Primarily intended for tests.
 */
export function unregisterResourceDescriptor(key: string): void {
  resourceDescriptors.delete(key);
}

/**
 * Loads all .json files from the specified data directory,
 * parses them, and stores them in the resource cache.
 * @param dataDir The path to the directory containing data files.
 */
export async function loadResources(dataDir: string): Promise<void> {
  try {
    const files = await fs.readdir(dataDir);
    for (const file of files) {
      if (path.extname(file) === '.json') {
        const filePath = path.join(dataDir, file);
        const content = await fs.readFile(filePath, 'utf-8');
        const resourceKey = path.basename(file, '.json');
        const parsed = JSON.parse(content);
        const validated = validateResource(resourceKey, parsed);
        resourceCache.set(resourceKey, validated);
      }
    }
  } catch (error) {
    console.error('Failed to load resources:', error);
    throw error; // Re-throw to allow for handling by the caller
  }
}

/**
 * Retrieves a resource from the cache.
 * @param key The key of the resource (the original filename without extension).
 * @returns The cached resource data.
 */
export function getResource<T>(key: string): T {
  if (!resourceCache.has(key)) {
    throw new Error(`Resource with key "${key}" not found.`);
  }
  return resourceCache.get(key) as T;
}

/**
 * Checks whether a resource exists in the cache without throwing.
 * @param key The key of the resource (the original filename without extension).
 * @returns True if the resource has been loaded into the cache.
 */
export function hasResource(key: string): boolean {
  return resourceCache.has(key);
}

/**
 * Manually sets a resource in the cache. Intended for use in test environments.
 * @param key The key of the resource.
 * @param value The resource data.
 */
export function setResource(key: string, value: any): void {
  resourceCache.set(key, value);
}

/**
 * Clears the resource cache. Intended for use in test environments.
 */
export function clearResources(): void {
  resourceCache.clear();
}
