import * as fs from 'fs/promises';
import path from 'path';

/**
 * A cache for storing game data loaded from JSON files.
 * The key is the filename without the extension.
 */
const resourceCache = new Map<string, any>();

/**
 * Loads all .json and .txt files from the specified data directories,
 * parses them, and stores them in the resource cache.
 * @param dataDirs The paths to the directories containing data files.
 */
export async function loadResources(dataDirs: string[]): Promise<void> {
  try {
    for (const dataDir of dataDirs) {
      const files = await fs.readdir(dataDir);
      for (const file of files) {
        const filePath = path.join(dataDir, file);
        const fileExt = path.extname(file);

        if (fileExt === '.json') {
          const content = await fs.readFile(filePath, 'utf-8');
          const resourceKey = path.basename(file, '.json');
          resourceCache.set(resourceKey, JSON.parse(content));
        } else if (fileExt === '.txt') {
          const content = await fs.readFile(filePath, 'utf-8');
          const resourceKey = path.basename(file, '.txt');
          resourceCache.set(resourceKey, content);
        }
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