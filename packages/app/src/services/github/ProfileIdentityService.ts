import { requestGitHub } from "./GitHubService";

export const PROFILE_BADGES = [
  { field: "isGitHubStar", label: "GitHub Star", icon: "star" },
  { field: "isDeveloperProgramMember", label: "开发者计划成员", icon: "code" },
  { field: "isCampusExpert", label: "校园专家", icon: "campus" },
  { field: "isBountyHunter", label: "安全赏金猎人", icon: "shield" },
  { field: "isEmployee", label: "GitHub 员工", icon: "github" },
  { field: "isSiteAdmin", label: "GitHub 管理员", icon: "shield" },
] as const;
export type ProfileBadge = (typeof PROFILE_BADGES)[number];
export interface ProfileOrganization {
  id: number;
  login: string;
  avatar_url: string;
  description: string | null;
}

/** Official account flags, not inferred or fabricated GitHub achievements. */
export async function profileBadges(
  token: string,
  signal: AbortSignal,
): Promise<ProfileBadge[]> {
  const { data } = await requestGitHub<{
    data?: { viewer?: Record<ProfileBadge["field"], boolean> };
    errors?: unknown[];
  }>("/graphql", token, signal, {
    method: "POST",
    body: JSON.stringify({
      query: `query GitPulseProfileBadges {
      viewer { ${PROFILE_BADGES.map((badge) => badge.field).join(" ")} }
    }`,
    }),
  });
  const viewer = data.data?.viewer;
  if (
    data.errors?.length ||
    !viewer ||
    PROFILE_BADGES.some(({ field }) => typeof viewer[field] !== "boolean")
  )
    throw new Error("暂时无法加载身份徽章");
  return PROFILE_BADGES.filter(({ field }) => viewer[field]);
}

/** Public memberships match the GitHub profile, without requiring read:org. */
export async function profileOrganizations(
  login: string,
  token: string,
  signal: AbortSignal,
): Promise<ProfileOrganization[]> {
  const organizations = new Map<number, ProfileOrganization>();
  for (let page = 1; page <= 100; page++) {
    const result = await requestGitHub<ProfileOrganization[]>(
      `/users/${encodeURIComponent(login)}/orgs?per_page=100&page=${page}`,
      token,
      signal,
    );
    if (
      !Array.isArray(result.data) ||
      result.data.some(
        (org) =>
          !org ||
          typeof org.id !== "number" ||
          typeof org.login !== "string" ||
          !org.login,
      )
    )
      throw new Error("暂时无法加载公开组织");
    for (const org of result.data) organizations.set(org.id, org);
    if (!result.hasNext) return [...organizations.values()];
  }
  throw new Error("暂时无法加载公开组织");
}
