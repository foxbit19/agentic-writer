import { existsSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { z } from 'zod';
import { platformSchema } from '../config/platforms';
import { ARTICLES_DIR } from './paths';

export type SocialPost = {
  platform: z.infer<typeof platformSchema>;
  text: string;
  hashtags?: string[];
};

export interface PlatformStrategy {
  platform: z.infer<typeof platformSchema>;
  angle: string;
  callToAction: string;
  timingGuidance: string;
}

export interface SavedSocialCampaign {
  campaignId: string;
  campaignDir: string;
  posts: SocialPost[];
  imageUrl: string | null;
}

export interface SaveSocialCampaignInput {
  articleId: string;
  campaignId: string;
  campaignDir: string;
  runId: string;
  platforms: z.infer<typeof platformSchema>[];
  strategySummary: string;
  platformStrategies: PlatformStrategy[];
  imageBrief: string;
  posts: SocialPost[];
  imageUrl: string | null;
  imageAltText: string | null;
}

const APPROVED_FILENAME = 'approved.md';
const LEGACY_APPROVED_FILENAME = 'approved.mdx';
export const HERO_IMAGE_FILENAME = 'hero-image.png';

function articleDir(articleId: string): string {
  return path.join(ARTICLES_DIR, articleId);
}

export function createCampaignId(runId: string): string {
  const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\.\d{3}Z$/, '');
  const shortRunId = runId.slice(0, 8) || randomUUID().slice(0, 8);
  return `${timestamp}_${shortRunId}`;
}

export function getCampaignDir(articleId: string, campaignId: string): string {
  return path.join(articleDir(articleId), 'social', campaignId);
}

function assertArticleApproved(articleId: string): void {
  const approvedPath = path.join(articleDir(articleId), APPROVED_FILENAME);
  const legacyApprovedPath = path.join(articleDir(articleId), LEGACY_APPROVED_FILENAME);
  if (!existsSync(approvedPath) && !existsSync(legacyApprovedPath)) {
    throw new Error(
      `Article "${articleId}" has no approved.md — run the article workflow first.`,
    );
  }
}

export async function initSocialCampaignWorkspace(
  articleId: string,
  runId: string,
): Promise<{ campaignId: string; campaignDir: string }> {
  assertArticleApproved(articleId);

  const campaignId = createCampaignId(runId);
  const campaignDir = getCampaignDir(articleId, campaignId);
  await mkdir(path.join(campaignDir, 'posts'), { recursive: true });

  return { campaignId, campaignDir };
}

function formatStrategyMarkdown(
  strategySummary: string,
  platformStrategies: PlatformStrategy[],
): string {
  const platformSections = platformStrategies
    .map(
      (strategy) => `### ${strategy.platform}

- **Angle:** ${strategy.angle}
- **Call to action:** ${strategy.callToAction}
- **Timing:** ${strategy.timingGuidance}`,
    )
    .join('\n\n');

  return `${strategySummary}

## Per-platform strategy

${platformSections}
`;
}

function formatPostMarkdown(post: SocialPost): string {
  const hashtags = post.hashtags?.length
    ? `hashtags:\n${post.hashtags.map((tag) => `  - ${tag}`).join('\n')}\n`
    : '';

  return `---
platform: ${post.platform}
${hashtags}---

${post.text}
`;
}

export interface CampaignSummary {
  campaignId: string;
  articleId: string;
  platforms: string[];
  savedAt: string | null;
  imageUrl: string | null;
  campaignDir: string;
}

export interface CampaignPostFile {
  platform: string;
  markdown: string;
}

export interface CampaignDetail {
  campaignId: string;
  articleId: string;
  campaignDir: string;
  platforms: string[];
  savedAt: string | null;
  strategy: string | null;
  imageBrief: string | null;
  posts: CampaignPostFile[];
  heroImage: {
    filename: string;
    url: string | null;
    altText: string | null;
    path: string | null;
  };
}

export async function listCampaigns(articleId: string): Promise<CampaignSummary[]> {
  const socialDir = path.join(articleDir(articleId), 'social');
  if (!existsSync(socialDir)) return [];

  const entries = await readdir(socialDir);
  const campaigns: CampaignSummary[] = [];

  for (const entry of entries) {
    const campaignJsonPath = path.join(socialDir, entry, 'campaign.json');
    if (!existsSync(campaignJsonPath)) continue;

    const raw = JSON.parse(await readFile(campaignJsonPath, 'utf8')) as {
      campaignId?: string;
      articleId?: string;
      platforms?: string[];
      savedAt?: string;
      imageUrl?: string | null;
    };

    campaigns.push({
      campaignId: raw.campaignId ?? entry,
      articleId: raw.articleId ?? articleId,
      platforms: raw.platforms ?? [],
      savedAt: raw.savedAt ?? null,
      imageUrl: raw.imageUrl ?? null,
      campaignDir: getCampaignDir(articleId, entry),
    });
  }

  return campaigns.sort((a, b) => (b.savedAt ?? '').localeCompare(a.savedAt ?? ''));
}

export async function readCampaign(
  articleId: string,
  campaignId: string,
): Promise<CampaignDetail> {
  const campaignDir = getCampaignDir(articleId, campaignId);
  const campaignJsonPath = path.join(campaignDir, 'campaign.json');
  if (!existsSync(campaignJsonPath)) {
    throw new Error(`Campaign "${campaignId}" not found for article "${articleId}"`);
  }

  const campaignJson = JSON.parse(await readFile(campaignJsonPath, 'utf8')) as {
    campaignId?: string;
    articleId?: string;
    platforms?: string[];
    savedAt?: string;
    imageUrl?: string | null;
  };

  let strategy: string | null = null;
  const strategyPath = path.join(campaignDir, 'strategy.md');
  if (existsSync(strategyPath)) {
    strategy = await readFile(strategyPath, 'utf8');
  }

  let imageBrief: string | null = null;
  const imageBriefPath = path.join(campaignDir, 'image-brief.md');
  if (existsSync(imageBriefPath)) {
    imageBrief = await readFile(imageBriefPath, 'utf8');
  }

  const posts: CampaignPostFile[] = [];
  const postsDir = path.join(campaignDir, 'posts');
  if (existsSync(postsDir)) {
    const postFiles = await readdir(postsDir);
    for (const file of postFiles.filter((f) => f.endsWith('.md')).sort()) {
      posts.push({
        platform: file.replace(/\.md$/, ''),
        markdown: await readFile(path.join(postsDir, file), 'utf8'),
      });
    }
  }

  let heroMeta: { filename?: string; url?: string | null; altText?: string | null } = {};
  const heroJsonPath = path.join(campaignDir, 'hero-image.json');
  if (existsSync(heroJsonPath)) {
    heroMeta = JSON.parse(await readFile(heroJsonPath, 'utf8')) as typeof heroMeta;
  }

  const heroPath = path.join(campaignDir, HERO_IMAGE_FILENAME);
  const heroExists = existsSync(heroPath);

  return {
    campaignId: campaignJson.campaignId ?? campaignId,
    articleId: campaignJson.articleId ?? articleId,
    campaignDir,
    platforms: campaignJson.platforms ?? [],
    savedAt: campaignJson.savedAt ?? null,
    strategy,
    imageBrief,
    posts,
    heroImage: {
      filename: heroMeta.filename ?? HERO_IMAGE_FILENAME,
      url: heroMeta.url ?? campaignJson.imageUrl ?? null,
      altText: heroMeta.altText ?? null,
      path: heroExists ? heroPath : null,
    },
  };
}

export async function saveSocialCampaign(
  input: SaveSocialCampaignInput,
): Promise<SavedSocialCampaign> {
  assertArticleApproved(input.articleId);

  const { campaignId, campaignDir } = input;
  const postsDir = path.join(campaignDir, 'posts');

  await mkdir(postsDir, { recursive: true });

  await Promise.all([
    writeFile(
      path.join(campaignDir, 'campaign.json'),
      JSON.stringify(
        {
          campaignId,
          articleId: input.articleId,
          runId: input.runId,
          platforms: input.platforms,
          savedAt: new Date().toISOString(),
          imageUrl: input.imageUrl,
        },
        null,
        2,
      ),
      'utf8',
    ),
    writeFile(
      path.join(campaignDir, 'strategy.md'),
      formatStrategyMarkdown(input.strategySummary, input.platformStrategies),
      'utf8',
    ),
    writeFile(path.join(campaignDir, 'image-brief.md'), input.imageBrief, 'utf8'),
    writeFile(
      path.join(campaignDir, 'hero-image.json'),
      JSON.stringify(
        {
          filename: HERO_IMAGE_FILENAME,
          url: input.imageUrl,
          altText: input.imageAltText,
        },
        null,
        2,
      ),
      'utf8',
    ),
    ...input.posts.map((post) =>
      writeFile(path.join(postsDir, `${post.platform}.md`), formatPostMarkdown(post), 'utf8'),
    ),
  ]);

  return {
    campaignId,
    campaignDir,
    posts: input.posts,
    imageUrl: input.imageUrl,
  };
}
