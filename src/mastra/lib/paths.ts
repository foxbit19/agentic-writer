import path from 'node:path';
import { fileURLToPath } from 'node:url';

const MASTRA_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const PROJECT_ROOT = path.resolve(MASTRA_DIR, '../..');

export const DATA_DIR = path.join(PROJECT_ROOT, 'data');
export const ARTICLES_DIR = path.join(DATA_DIR, 'articles');
export const GENERATED_IMAGES_DIR = path.join(MASTRA_DIR, 'public/generated-images');
