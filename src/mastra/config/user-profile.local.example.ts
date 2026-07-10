import type { UserProfile } from './user-profile';

/**
 * Local author profile template — copy this file to `user-profile.local.ts` and customize.
 * `user-profile.local.ts` is gitignored and overrides `user-profile.example.ts`.
 */
export const userProfile = {
  name: 'Your Name',
  role: 'Your role or title',
  mission: 'What you are trying to achieve with your content.',
  targetAudience: 'Who you write for and where they hang out online.',
  brandVoice: 'How you want to sound — tone, constraints, pet peeves.',
  goals: ['Goal one', 'Goal two'],
} satisfies UserProfile;
