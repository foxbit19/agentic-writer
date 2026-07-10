import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { PROJECT_ROOT } from '../lib/paths';

export type UserProfile = {
  name: string;
  role: string;
  mission: string;
  targetAudience: string;
  brandVoice: string;
  goals: readonly string[];
};

const CONFIG_DIR = join(PROJECT_ROOT, 'src/mastra/config');
const LOCAL_PROFILE_PATH = join(CONFIG_DIR, 'user-profile.local.json');
const EXAMPLE_PROFILE_PATH = join(CONFIG_DIR, 'user-profile.example.json');

function readProfile(path: string): UserProfile {
  return JSON.parse(readFileSync(path, 'utf8')) as UserProfile;
}

function loadUserProfile(): UserProfile {
  if (existsSync(LOCAL_PROFILE_PATH)) {
    return readProfile(LOCAL_PROFILE_PATH);
  }

  return readProfile(EXAMPLE_PROFILE_PATH);
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
