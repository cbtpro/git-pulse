import { GitHubRequestError, requestGitHub } from "./GitHubService";

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
export interface ProfileOrganizations {
  organizations: ProfileOrganization[];
  access: "authorized" | "public-only";
}
interface OrganizationMembership {
  state: "active" | "pending";
  organization: ProfileOrganization;
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

/** Include non-public memberships when the account has granted organization access. */
export async function profileOrganizations(
  login: string,
  token: string,
  signal: AbortSignal,
): Promise<ProfileOrganizations> {
  try {
    return {
      organizations: await organizationPages(
        "/user/memberships/orgs?state=active",
        token,
        signal,
        true,
      ),
      access: "authorized",
    };
  } catch (error) {
    // Older OAuth grants lack read:org. Retain public results while making the
    // restricted scope explicit; never conceal invalid credentials/rate limits.
    if (
      !(error instanceof GitHubRequestError) ||
      error.status !== 403 ||
      error.rateLimited
    )
      throw error;
    return {
      organizations: await organizationPages(
        `/users/${encodeURIComponent(login)}/orgs?`,
        token,
        signal,
        false,
      ),
      access: "public-only",
    };
  }
}

async function organizationPages(
  path: string,
  token: string,
  signal: AbortSignal,
  memberships: boolean,
): Promise<ProfileOrganization[]> {
  const organizations = new Map<number, ProfileOrganization>();
  for (let page = 1; page <= 100; page++) {
    const result = await requestGitHub<
      (ProfileOrganization | OrganizationMembership)[]
    >(
      `${path}${path.endsWith("?") ? "" : "&"}per_page=100&page=${page}`,
      token,
      signal,
    );
    if (!Array.isArray(result.data)) throw new Error("暂时无法加载组织");
    for (const entry of result.data) {
      if (memberships) {
        const state = (entry as OrganizationMembership)?.state;
        if (state === "pending") continue;
        if (state !== "active") throw new Error("暂时无法加载组织");
      }
      const org = memberships
        ? (entry as OrganizationMembership).organization
        : (entry as ProfileOrganization);
      if (
        !org ||
        typeof org.id !== "number" ||
        typeof org.login !== "string" ||
        !org.login
      )
        throw new Error("暂时无法加载组织");
      organizations.set(org.id, org);
    }
    if (!result.hasNext) return [...organizations.values()];
  }
  throw new Error("暂时无法加载组织");
}
