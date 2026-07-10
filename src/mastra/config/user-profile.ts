import { createRequire } from 'node:module';
import { userProfile as exampleUserProfile } from './user-profile.example';

export type UserProfile = {
  name: string;
  role: string;
  mission: string;
  targetAudience: string;
  brandVoice: string;
  goals: readonly string[];
};

const require = createRequire(import.meta.url);

function loadUserProfile(): UserProfile {
  try {
    const local = require('./user-profile.local') as { userProfile: UserProfile };
    return local.userProfile;
  } catch {
    return exampleUserProfile;
  }
}

export const userProfile = loadUserProfile();

export function formatUserProfile(): string {
  return `Name: ${userProfile.name}
Role: ${userProfile.role}
Mission: ${userProfile.mission}
Target audience: ${userProfile.targetAudience}
Brand voice: ${userProfile.brandVoice}
Goals:
${userProfile.goals.map((goal) => `- ${goal}`).join('\n')}`;
}
