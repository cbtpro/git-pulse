import { requestGitHub } from "./GitHubService";
import { repoApiPath } from "./RepositoryService";
import type { DeviceOS } from "../../utils/PlatformDetector";
export interface ReleaseAsset {
  id: number;
  name: string;
  size: number;
  download_count: number;
  browser_download_url: string;
  content_type: string;
}
export interface Release {
  id: number;
  tag_name: string;
  name: string | null;
  body: string | null;
  draft: boolean;
  prerelease: boolean;
  published_at: string | null;
  html_url: string;
  assets: ReleaseAsset[];
}
export const releases = {
  list(
    owner: string,
    name: string,
    page: number,
    token: string | null,
    signal: AbortSignal,
    perPage = 10,
  ) {
    return requestGitHub<Release[]>(
      `${repoApiPath(owner, name)}/releases?per_page=${perPage}&page=${page}`,
      token,
      signal,
    );
  },
};
export function assetMatchesOS(name: string, os: DeviceOS) {
  const patterns: Record<DeviceOS, RegExp> = {
    macos: /\.(dmg|pkg)$|(?:darwin|macos|osx)[-_.]/i,
    windows: /\.(exe|msi|msix)$|(?:windows|win32|win64)[-_.]/i,
    linux: /\.(appimage|deb|rpm)$|linux[-_.]/i,
    android: /\.apk$|android[-_.]/i,
    ios: /\.ipa$|ios[-_.]/i,
    unknown: /$a/,
  };
  return patterns[os].test(name);
}
export async function releaseFeed(
  repositories: string[],
  token: string | null,
  signal: AbortSignal,
) {
  if (!token) throw new Error("来源账号已移除，请重新添加账号。");
  const items: { repository: string; release: Release }[] = [],
    errors: { repository: string; message: string }[] = [];
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(3, repositories.length) }, async () => {
      while (next < repositories.length) {
        signal.throwIfAborted();
        const repository = repositories[next++];
        const [owner, name] = repository.split("/");
        try {
          const result = await releases.list(owner, name, 1, token, signal, 5);
          for (const release of result.data)
            if (!release.draft) items.push({ repository, release });
        } catch (error) {
          signal.throwIfAborted();
          errors.push({
            repository,
            message:
              error instanceof Error ? error.message : "加载失败，请重试",
          });
        }
      }
    }),
  );
  items.sort(
    (a, b) =>
      (Date.parse(b.release.published_at || "") || 0) -
      (Date.parse(a.release.published_at || "") || 0),
  );
  return { items, errors };
}
