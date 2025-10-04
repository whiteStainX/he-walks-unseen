import * as fs from 'fs/promises';
import path from 'path';

/**
 * A cache for storing game data loaded from JSON files.
 * The key is the filename without the extension.
 */
const resourceCache = new Map<string, any>();

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
        resourceCache.set(resourceKey, JSON.parse(content));
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