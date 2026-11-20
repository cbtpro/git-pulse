export interface UserProfile {
  id: number;
  login: string;
  name: string | null;
  avatar_url: string;
  bio: string | null;
  location: string | null;
  email: string | null;
  twitter_username: string | null;
  public_repos: number;
  public_gists: number;
  followers: number;
  following: number;
  created_at: string;
  updated_at: string;
}

export type AuthResult =
  | { success: true; token: string; profile: UserProfile }
  | { success: false; error: string; invalidCredentials?: boolean };

/** Stored only inside the encrypted account vault, never in UI state. */
export interface PendingAuthorization {
  id: string;
  clientId: string;
  deviceCode: string;
  userCode: string;
  expiresAt: number;
  interval: number;
  nextPollAt: number;
  accessToken?: string;
}
