/**
 * Describes who the social-media content is being created for and what they're trying to
 * achieve. The strategist and content-creator agents read this to tailor strategy, angle,
 * and voice to a specific person/brand without any code changes - edit the fields below to
 * reconfigure the pipeline for a different user.
 */
export const userProfile = {
  name: 'Alex Rivera',
  role: 'Indie SaaS founder building developer tools',
  mission:
    'Grow a technical audience that trusts my product opinions, drives qualified signups for my SaaS product, and establishes me as a credible voice in the AI tooling space.',
  targetAudience:
    'Software engineers, technical founders, and engineering managers who are active on X/Twitter and LinkedIn and skeptical of hype.',
  brandVoice:
    'Direct, technically credible, a little irreverent. No corporate fluff, no empty hype words. Backs claims with specifics.',
  goals: [
    'Build a personal brand as a credible, opinionated voice in AI-assisted software development',
    'Drive qualified traffic back to the product website from every post',
    'Grow follower count and engagement rate on X/Twitter and LinkedIn specifically',
  ],
} as const;

export function formatUserProfile(): string {
  return `Name: ${userProfile.name}
Role: ${userProfile.role}
Mission: ${userProfile.mission}
Target audience: ${userProfile.targetAudience}
Brand voice: ${userProfile.brandVoice}
Goals:
${userProfile.goals.map((goal) => `- ${goal}`).join('\n')}`;
}
