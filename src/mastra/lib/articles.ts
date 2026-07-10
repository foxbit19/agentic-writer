import { existsSync, readdirSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { ARTICLES_DIR } from './paths';
import { parseMdxArticle } from './mdx';

export interface SavedArticle {
  id: string;
  title: string;
  mdx: string;
  savedAt: string;
}

function slugify(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);

  return slug || 'article';
}

export async function saveArticle(mdx: string): Promise<SavedArticle> {
  const { title } = parseMdxArticle(mdx);
  const id = `${slugify(title)}-${randomUUID().slice(0, 8)}`;
  const savedAt = new Date().toISOString();

  await mkdir(ARTICLES_DIR, { recursive: true });
  await writeFile(path.join(ARTICLES_DIR, `${id}.mdx`), mdx, 'utf8');
  await writeFile(
    path.join(ARTICLES_DIR, `${id}.json`),
    JSON.stringify({ id, title, savedAt }, null, 2),
    'utf8',
  );

  return { id, title, mdx, savedAt };
}

export async function listSavedArticles(): Promise<Array<{ id: string; title: string }>> {
  let entries: string[];
  try {
    entries = await readdir(ARTICLES_DIR);
  } catch {
    return [];
  }

  const articles = await Promise.all(
    entries
      .filter((entry) => entry.endsWith('.json'))
      .map(async (entry) => {
        const raw = await readFile(path.join(ARTICLES_DIR, entry), 'utf8');
        const meta = JSON.parse(raw) as { id: string; title: string };
        return { id: meta.id, title: meta.title };
      }),
  );

  return articles.sort((a, b) => a.title.localeCompare(b.title));
}

export function listSavedArticleIds(): string[] {
  if (!existsSync(ARTICLES_DIR)) return [];
  return readdirSync(ARTICLES_DIR)
    .filter((entry) => entry.endsWith('.mdx'))
    .map((entry) => entry.replace(/\.mdx$/, ''))
    .sort();
}

export async function readSavedArticle(articleId: string): Promise<SavedArticle> {
  const mdxPath = path.join(ARTICLES_DIR, `${articleId}.mdx`);
  const metaPath = path.join(ARTICLES_DIR, `${articleId}.json`);

  const [mdx, metaRaw] = await Promise.all([
    readFile(mdxPath, 'utf8'),
    readFile(metaPath, 'utf8').catch(() => null),
  ]);

  if (metaRaw) {
    const meta = JSON.parse(metaRaw) as { id: string; title: string; savedAt: string };
    return { id: meta.id, title: meta.title, mdx, savedAt: meta.savedAt };
  }

  const { title } = parseMdxArticle(mdx);
  return { id: articleId, title, mdx, savedAt: '' };
}
