import path from 'path';
import { fileURLToPath } from 'url';
import { clearResources, loadResources } from '../src/engine/resourceManager.js';
import { loadWorldData } from '../src/engine/worldManager.js';

async function main(): Promise<void> {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const dataDir = path.resolve(__dirname, '../data');

  try {
    await loadResources(dataDir);
    loadWorldData();
    console.log('All narrative data validated successfully.');
  } catch (error) {
    console.error('Data validation failed.', error);
    process.exitCode = 1;
  } finally {
    clearResources();
  }
}

void main();
