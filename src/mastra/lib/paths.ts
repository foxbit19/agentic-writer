import path from 'node:path';
import { fileURLToPath } from 'node:url';

const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));
const MASTRA_DIR = path.resolve(MODULE_DIR, '..');

// Source lives under src/mastra/lib; Mastra bundles under .mastra/output.
const isBundled = path.basename(MASTRA_DIR) === '.mastra';

export const PROJECT_ROOT = isBundled
  ? path.resolve(MASTRA_DIR, '..')
  : path.resolve(MASTRA_DIR, '../..');

export const DATA_DIR = path.join(PROJECT_ROOT, 'data');
export const ARTICLES_DIR = path.join(DATA_DIR, 'articles');
export const GENERATED_IMAGES_DIR = isBundled
  ? path.join(PROJECT_ROOT, 'src/mastra/public/generated-images')
  : path.join(MASTRA_DIR, 'public/generated-images');
