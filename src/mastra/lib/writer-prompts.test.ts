import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { appendRevisionGuidance, authorDraftBlock, buildWriterPrompt } from './writer-prompts';

const authorDraft = [
  '# My article',
  '',
  '```',
  'npm create vite@latest',
  '```',
  '',
  'Try it: https://example.com/demo',
].join('\n');

const base = {
  notes: 'Article type: experiment write-up. Keep the code block verbatim.',
  researchBrief: 'Brief: compares two models.',
};

describe('authorDraftBlock', () => {
  it('returns an empty string when no draft is provided', () => {
    assert.equal(authorDraftBlock(undefined), '');
    assert.equal(authorDraftBlock('   \n'), '');
  });

  it('embeds the draft verbatim and marks it as the source of truth for quotes', () => {
    const block = authorDraftBlock(authorDraft);
    assert.ok(block.includes(authorDraft));
    assert.match(block, /verbatim source of truth/);
  });
});

describe('appendRevisionGuidance', () => {
  it('returns the addition when no prior guidance exists', () => {
    assert.equal(appendRevisionGuidance('', 'Fix the intro'), 'Fix the intro');
    assert.equal(appendRevisionGuidance(undefined, 'Fix the intro'), 'Fix the intro');
  });

  it('appends blocks separated by a horizontal rule', () => {
    assert.equal(
      appendRevisionGuidance('Editor: tighten section two', 'Human: restore the code block'),
      'Editor: tighten section two\n\n---\n\nHuman: restore the code block',
    );
  });

  it('ignores empty additions', () => {
    assert.equal(appendRevisionGuidance('Existing guidance', '   '), 'Existing guidance');
  });
});

describe('buildWriterPrompt', () => {
  it('includes notes, author draft, and research brief on the initial pass', () => {
    const prompt = buildWriterPrompt({ ...base, authorDraft });
    assert.ok(prompt.includes(base.notes));
    assert.ok(prompt.includes(base.researchBrief));
    assert.ok(prompt.includes(authorDraft));
    assert.match(prompt, /Develop and polish the author draft/);
    assert.doesNotMatch(prompt, /Previous draft:/);
  });

  it('keeps the author draft in revision passes with a verbatim-copy instruction', () => {
    const prompt = buildWriterPrompt({
      ...base,
      authorDraft,
      previousDraft: '# My article\n\nA drifted rewrite.',
      guidanceNotes: 'Restore the original prompt block.',
    });
    assert.ok(prompt.includes(authorDraft));
    assert.ok(prompt.includes('A drifted rewrite.'));
    assert.ok(prompt.includes('Restore the original prompt block.'));
    assert.match(prompt, /Previous draft:/);
    assert.match(
      prompt,
      /re-copy code blocks, commands, URLs, and links from it, not from the previous draft or from memory/,
    );
  });

  it('tells the Writer to prioritize human notes when both are present', () => {
    const prompt = buildWriterPrompt({
      ...base,
      previousDraft: 'old draft',
      guidanceNotes: 'Editor: shorten.\n\n---\n\nHuman: keep the anecdote.',
    });
    assert.match(prompt, /prioritize human author notes on any conflict/);
  });

  it('omits author-draft language entirely when no draft was provided', () => {
    const initial = buildWriterPrompt(base);
    const revision = buildWriterPrompt({
      ...base,
      previousDraft: 'old draft',
      guidanceNotes: 'tighten the intro',
    });
    for (const prompt of [initial, revision]) {
      assert.doesNotMatch(prompt, /Author draft/);
      assert.doesNotMatch(prompt, /source of truth/);
    }
  });
});
