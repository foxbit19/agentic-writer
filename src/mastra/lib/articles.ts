import { existsSync, readdirSync, readFileSync, renameSync, writeFileSync, mkdirSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, readdir, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { ARTICLES_DIR } from './paths';
import { parseMarkdownArticle, stripDraftRevisionFromMarkdown } from './markdown';

export type ArticleStatus = 'in_progress' | 'awaiting_review' | 'approved';

export interface ArticleManifest {
  id: string;
  runId: string;
  title: string;
  status: ArticleStatus;
  currentDraft: number;
  approvedDraft: number | null;
  createdAt: string;
  updatedAt: string;
  savedAt?: string;
}

export interface SavedArticle {
  id: string;
  title: string;
  markdown: string;
  savedAt: string;
}

const SLUG_MAX_LENGTH = 50;
const APPROVED_FILENAME = 'approved.md';
const LEGACY_APPROVED_FILENAME = 'approved.mdx';
const MANIFEST_FILENAME = 'article.json';

export function slugify(title: string): string {
  const slug = title
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, SLUG_MAX_LENGTH);

  return slug || 'article';
}

export function formatDraftNumber(draftNumber: number): string {
  return String(draftNumber).padStart(3, '0');
}

function articleDir(articleId: string): string {
  return path.join(ARTICLES_DIR, articleId);
}

function manifestPath(articleId: string): string {
  return path.join(articleDir(articleId), MANIFEST_FILENAME);
}

function draftsDir(articleId: string): string {
  return path.join(articleDir(articleId), 'drafts');
}

function approvedPath(articleId: string): string {
  return path.join(articleDir(articleId), APPROVED_FILENAME);
}

function legacyApprovedPath(articleId: string): string {
  return path.join(articleDir(articleId), LEGACY_APPROVED_FILENAME);
}

async function readManifest(articleId: string): Promise<ArticleManifest> {
  const raw = await readFile(manifestPath(articleId), 'utf8');
  return JSON.parse(raw) as ArticleManifest;
}

async function writeManifest(articleId: string, manifest: ArticleManifest): Promise<void> {
  await writeFile(manifestPath(articleId), JSON.stringify(manifest, null, 2), 'utf8');
}

async function touchManifest(
  articleId: string,
  patch: Partial<ArticleManifest>,
): Promise<ArticleManifest> {
  const manifest = await readManifest(articleId);
  const updated: ArticleManifest = {
    ...manifest,
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  await writeManifest(articleId, updated);
  return updated;
}

function createShortId(): string {
  return randomUUID().slice(0, 8);
}

function migrateWorkspaceMdxToMdSync(articleId: string): void {
  const dir = articleDir(articleId);
  const legacyApproved = legacyApprovedPath(articleId);
  const approved = approvedPath(articleId);

  if (existsSync(legacyApproved) && !existsSync(approved)) {
    renameSync(legacyApproved, approved);
  }

  const drafts = path.join(dir, 'drafts');
  if (!existsSync(drafts)) return;

  for (const entry of readdirSync(drafts)) {
    if (!entry.endsWith('.mdx')) continue;
    const from = path.join(drafts, entry);
    const to = path.join(drafts, entry.replace(/\.mdx$/, '.md'));
    if (!existsSync(to)) {
      renameSync(from, to);
    }
  }
}

export async function initArticleWorkspace(
  runId: string,
  notes: string,
): Promise<{ articleId: string }> {
  const shortId = createShortId();
  const articleId = `untitled_${shortId}`;

  await mkdir(draftsDir(articleId), { recursive: true });
  await writeFile(path.join(articleDir(articleId), 'notes.md'), notes, 'utf8');

  const now = new Date().toISOString();
  const manifest: ArticleManifest = {
    id: articleId,
    runId,
    title: 'Untitled article',
    status: 'in_progress',
    currentDraft: 0,
    approvedDraft: null,
    createdAt: now,
    updatedAt: now,
  };
  await writeManifest(articleId, manifest);

  return { articleId };
}

export async function saveResearchBrief(articleId: string, researchBrief: string): Promise<void> {
  await writeFile(path.join(articleDir(articleId), 'research-brief.md'), researchBrief, 'utf8');
  await touchManifest(articleId, {});
}

async function renameArticleFolder(currentId: string, nextId: string): Promise<string> {
  if (currentId === nextId) return currentId;

  const from = articleDir(currentId);
  const to = articleDir(nextId);
  if (existsSync(to)) {
    throw new Error(`Cannot rename article folder: ${nextId} already exists`);
  }

  await rename(from, to);
  const manifest = await readManifest(nextId);
  manifest.id = nextId;
  await writeManifest(nextId, manifest);
  return nextId;
}

export async function renameArticleFromTitle(
  articleId: string,
  title: string,
  shortId: string,
): Promise<string> {
  if (!articleId.startsWith('untitled_')) return articleId;

  const nextId = `${slugify(title)}_${shortId}`;
  return renameArticleFolder(articleId, nextId);
}

export async function saveDraft(
  articleId: string,
  draftNumber: number,
  markdown: string,
): Promise<string> {
  const { title } = parseMarkdownArticle(markdown);
  const manifest = await readManifest(articleId);
  const shortId = articleId.split('_').at(-1) ?? createShortId();

  let resolvedId = articleId;
  if (articleId.startsWith('untitled_')) {
    resolvedId = await renameArticleFromTitle(articleId, title, shortId);
  }

  await mkdir(draftsDir(resolvedId), { recursive: true });
  const draftFile = `${formatDraftNumber(draftNumber)}.md`;
  await writeFile(path.join(draftsDir(resolvedId), draftFile), markdown, 'utf8');
  await touchManifest(resolvedId, {
    title,
    currentDraft: draftNumber,
    status: 'in_progress',
  });

  return resolvedId;
}

export async function saveEditorReview(
  articleId: string,
  draftNumber: number,
  review: string,
): Promise<void> {
  const reviewFile = `${formatDraftNumber(draftNumber)}.editor-review.md`;
  await writeFile(path.join(draftsDir(articleId), reviewFile), review, 'utf8');
  await touchManifest(articleId, {});
}

export async function saveHumanNotes(
  articleId: string,
  draftNumber: number,
  notes: string,
): Promise<void> {
  if (!notes.trim()) return;

  const notesFile = `${formatDraftNumber(draftNumber)}.human-notes.md`;
  await writeFile(path.join(draftsDir(articleId), notesFile), notes, 'utf8');
  await touchManifest(articleId, { status: 'in_progress' });
}

export async function setArticleStatus(
  articleId: string,
  status: ArticleStatus,
): Promise<void> {
  await touchManifest(articleId, { status });
}

export async function finalizeArticle(
  articleId: string,
  markdown: string,
  approvedDraft: number,
): Promise<SavedArticle> {
  const approvedMarkdown = stripDraftRevisionFromMarkdown(markdown);
  const { title } = parseMarkdownArticle(approvedMarkdown);
  const savedAt = new Date().toISOString();

  await writeFile(approvedPath(articleId), approvedMarkdown, 'utf8');
  const manifest = await touchManifest(articleId, {
    title,
    status: 'approved',
    approvedDraft,
    savedAt,
  });

  return {
    id: manifest.id,
    title: manifest.title,
    markdown: approvedMarkdown,
    savedAt,
  };
}

function isArticleWorkspaceDir(entry: string): boolean {
  return existsSync(path.join(ARTICLES_DIR, entry, MANIFEST_FILENAME));
}

function hasApprovedArticle(entry: string): boolean {
  return (
    existsSync(path.join(ARTICLES_DIR, entry, APPROVED_FILENAME)) ||
    existsSync(path.join(ARTICLES_DIR, entry, LEGACY_APPROVED_FILENAME))
  );
}

async function readApprovedMarkdown(articleId: string): Promise<string> {
  migrateWorkspaceMdxToMdSync(articleId);

  const approved = approvedPath(articleId);
  if (existsSync(approved)) {
    return readFile(approved, 'utf8');
  }

  const legacy = legacyApprovedPath(articleId);
  if (existsSync(legacy)) {
    return readFile(legacy, 'utf8');
  }

  throw new Error(`Article "${articleId}" has no approved.md`);
}

function migrateLegacyFlatArticleSync(filename: string): string | null {
  if (!filename.endsWith('.mdx')) return null;

  const legacyId = filename.replace(/\.mdx$/, '');
  const legacyMdxPath = path.join(ARTICLES_DIR, filename);
  const legacyMetaPath = path.join(ARTICLES_DIR, `${legacyId}.json`);

  if (!existsSync(legacyMdxPath)) return null;

  const markdown = readFileSync(legacyMdxPath, 'utf8');
  const { title } = parseMarkdownArticle(markdown);

  let savedAt = new Date().toISOString();
  if (existsSync(legacyMetaPath)) {
    const legacyMeta = JSON.parse(readFileSync(legacyMetaPath, 'utf8')) as {
      savedAt?: string;
    };
    if (legacyMeta.savedAt) savedAt = legacyMeta.savedAt;
  }

  const suffix = legacyId.includes('-') ? legacyId.split('-').at(-1) : createShortId();
  const articleId = `${slugify(title)}_${suffix}`;

  if (existsSync(articleDir(articleId))) return articleId;

  mkdirSync(draftsDir(articleId), { recursive: true });
  writeFileSync(approvedPath(articleId), markdown, 'utf8');

  const now = new Date().toISOString();
  const manifest: ArticleManifest = {
    id: articleId,
    runId: 'legacy-import',
    title,
    status: 'approved',
    currentDraft: 1,
    approvedDraft: 1,
    createdAt: savedAt,
    updatedAt: now,
    savedAt,
  };
  writeFileSync(manifestPath(articleId), JSON.stringify(manifest, null, 2), 'utf8');
  writeFileSync(path.join(draftsDir(articleId), '001.md'), markdown, 'utf8');

  return articleId;
}

function migrateLegacyArticlesSync(): void {
  if (!existsSync(ARTICLES_DIR)) return;

  for (const entry of readdirSync(ARTICLES_DIR)) {
    if (entry.includes('.')) {
      migrateLegacyFlatArticleSync(entry);
    } else if (isArticleWorkspaceDir(entry)) {
      migrateWorkspaceMdxToMdSync(entry);
    }
  }
}

export async function migrateLegacyArticlesIfNeeded(): Promise<void> {
  migrateLegacyArticlesSync();
}

export interface ArticleDraft {
  draftNumber: number;
  markdown: string;
  editorReview: string | null;
  humanNotes: string | null;
}

export async function getArticleManifest(articleId: string): Promise<ArticleManifest> {
  await migrateLegacyArticlesIfNeeded();
  if (!isArticleWorkspaceDir(articleId)) {
    throw new Error(`Article "${articleId}" not found`);
  }
  return readManifest(articleId);
}

export async function listAllArticles(
  status?: ArticleStatus,
): Promise<ArticleManifest[]> {
  await migrateLegacyArticlesIfNeeded();

  let entries: string[];
  try {
    entries = await readdir(ARTICLES_DIR);
  } catch {
    return [];
  }

  const articles = await Promise.all(
    entries
      .filter((entry) => isArticleWorkspaceDir(entry))
      .map(async (entry) => readManifest(entry)),
  );

  const filtered = status ? articles.filter((a) => a.status === status) : articles;
  return filtered.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function listArticleDrafts(articleId: string): Promise<ArticleDraft[]> {
  await migrateLegacyArticlesIfNeeded();
  if (!isArticleWorkspaceDir(articleId)) {
    throw new Error(`Article "${articleId}" not found`);
  }

  const dir = draftsDir(articleId);
  if (!existsSync(dir)) return [];

  const entries = await readdir(dir);
  const draftNumbers = [
    ...new Set(
      entries
        .map((entry) => {
          const match = /^(\d{3})\.md$/.exec(entry);
          return match ? Number(match[1]) : null;
        })
        .filter((n): n is number => n !== null),
    ),
  ].sort((a, b) => a - b);

  return Promise.all(
    draftNumbers.map(async (draftNumber) => {
      const prefix = formatDraftNumber(draftNumber);
      const markdown = await readFile(path.join(dir, `${prefix}.md`), 'utf8');

      let editorReview: string | null = null;
      const reviewPath = path.join(dir, `${prefix}.editor-review.md`);
      if (existsSync(reviewPath)) {
        editorReview = await readFile(reviewPath, 'utf8');
      }

      let humanNotes: string | null = null;
      const notesPath = path.join(dir, `${prefix}.human-notes.md`);
      if (existsSync(notesPath)) {
        humanNotes = await readFile(notesPath, 'utf8');
      }

      return { draftNumber, markdown, editorReview, humanNotes };
    }),
  );
}

export async function getArticleDetail(articleId: string): Promise<{
  manifest: ArticleManifest;
  approvedMarkdown: string | null;
}> {
  const manifest = await getArticleManifest(articleId);
  let approvedMarkdown: string | null = null;
  try {
    approvedMarkdown = await readApprovedMarkdown(articleId);
  } catch {
    approvedMarkdown = null;
  }
  return { manifest, approvedMarkdown };
}

export async function listSavedArticles(): Promise<Array<{ id: string; title: string }>> {
  await migrateLegacyArticlesIfNeeded();

  let entries: string[];
  try {
    entries = await readdir(ARTICLES_DIR);
  } catch {
    return [];
  }

  const articles = await Promise.all(
    entries
      .filter((entry) => isArticleWorkspaceDir(entry) && hasApprovedArticle(entry))
      .map(async (entry) => {
        const manifest = await readManifest(entry);
        return { id: manifest.id, title: manifest.title };
      }),
  );

  return articles.sort((a, b) => a.title.localeCompare(b.title));
}

export function listSavedArticleIds(): string[] {
  migrateLegacyArticlesSync();

  if (!existsSync(ARTICLES_DIR)) return [];

  return readdirSync(ARTICLES_DIR)
    .filter((entry) => isArticleWorkspaceDir(entry) && hasApprovedArticle(entry))
    .sort();
}

export async function readSavedArticle(articleId: string): Promise<SavedArticle> {
  await migrateLegacyArticlesIfNeeded();

  const markdown = await readApprovedMarkdown(articleId);
  const manifest = await readManifest(articleId);

  return {
    id: manifest.id,
    title: manifest.title,
    markdown,
    savedAt: manifest.savedAt ?? manifest.updatedAt,
  };
}

// Kept for callers that still expect a single-shot save helper.
export async function saveArticle(markdown: string): Promise<SavedArticle> {
  const { title } = parseMarkdownArticle(markdown);
  const shortId = createShortId();
  const articleId = `${slugify(title)}_${shortId}`;
  const runId = `manual-${shortId}`;

  await mkdir(draftsDir(articleId), { recursive: true });
  const now = new Date().toISOString();
  const manifest: ArticleManifest = {
    id: articleId,
    runId,
    title,
    status: 'approved',
    currentDraft: 1,
    approvedDraft: 1,
    createdAt: now,
    updatedAt: now,
    savedAt: now,
  };
  await writeManifest(articleId, manifest);
  await writeFile(path.join(draftsDir(articleId), '001.md'), markdown, 'utf8');

  return finalizeArticle(articleId, markdown, 1);
}
