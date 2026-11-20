import { GitHubRequestError, requestGitHub } from "./GitHubService";
import type { RepositoryCardData } from "../../types/github";

export interface PinItem {
  id: string;
  kind: "repository" | "gist";
  title: string;
  url: string;
  description: string | null;
  repository?: RepositoryCardData;
}

interface PinNode {
  __typename: "Repository" | "Gist";
  id: string;
  name: string;
  url: string;
  description: string | null;
  nameWithOwner?: string;
  isPrivate: boolean;
  isArchived: boolean;
  updatedAt: string;
  stargazerCount: number;
  forkCount: number;
  owner: { login: string } | null;
  primaryLanguage: { name: string } | null;
  repositoryTopics?: { nodes: { topic: { name: string } }[] };
  files?: { name: string }[];
}
const fields = `__typename
  ... on Repository {
    id name nameWithOwner url description isPrivate isArchived updatedAt stargazerCount forkCount
    owner { login } primaryLanguage { name } repositoryTopics(first: 3) { nodes { topic { name } } }
  }
  ... on Gist { id name url description owner { login } files(limit: 1) { name } }
`;
function normalize(nodes: (PinNode | null)[]): PinItem[] {
  return nodes
    .filter((node): node is PinNode => Boolean(node?.id))
    .map((node) => {
      const repository =
        node.__typename === "Repository"
          ? {
              id: node.id,
              name: node.name,
              full_name: node.nameWithOwner!,
              html_url: node.url,
              description: node.description,
              private: node.isPrivate,
              archived: node.isArchived,
              updated_at: node.updatedAt,
              stargazers_count: node.stargazerCount,
              forks_count: node.forkCount,
              owner: node.owner || { login: "" },
              language: node.primaryLanguage?.name || null,
              topics:
                node.repositoryTopics?.nodes.map((item) => item.topic.name) ||
                [],
            }
          : undefined;
      return {
        id: node.id,
        kind: repository ? "repository" : "gist",
        title:
          node.nameWithOwner ||
          `${node.owner?.login || "gist"}/${node.files?.[0]?.name || node.name}`,
        url: node.url,
        description: node.description,
        repository,
      };
    });
}
async function graphql<T>(
  query: string,
  variables: object,
  token: string,
  signal: AbortSignal,
): Promise<T> {
  const { data } = await requestGitHub<{ data?: T; errors?: unknown[] }>(
    "/graphql",
    token,
    signal,
    {
      method: "POST",
      body: JSON.stringify({ query, variables }),
    },
  );
  if (data.errors?.length || !data.data)
    throw new GitHubRequestError(
      "无法读取置顶项目，请检查账号权限后重试。",
      403,
    );
  return data.data;
}
export async function pinnedItems(
  token: string,
  signal: AbortSignal,
  ids?: string[],
): Promise<PinItem[]> {
  if (ids) {
    if (!ids.length) return [];
    const data = await graphql<{ nodes: (PinNode | null)[] }>(
      `query GitPulseCustomPins($ids: [ID!]!) { nodes(ids: $ids) { ${fields} } }`,
      { ids },
      token,
      signal,
    );
    const items = normalize(data.nodes);
    // Preserve the user's selection order even if an item was deleted or access was revoked.
    return ids.flatMap((id) => items.filter((item) => item.id === id));
  }
  const data = await graphql<{ viewer: { pinnedItems: { nodes: PinNode[] } } }>(
    `query GitPulsePinnedItems { viewer { pinnedItems(first: 6, types: [REPOSITORY, GIST]) { nodes { ${fields} } } } }`,
    {},
    token,
    signal,
  );
  return normalize(data.viewer.pinnedItems.nodes);
}
export async function pinnableItems(
  token: string,
  signal: AbortSignal,
): Promise<PinItem[]> {
  const items: PinItem[] = [];
  let after: string | null = null;
  const cursors = new Set<string>();
  for (;;) {
    signal.throwIfAborted();
    const data: {
      viewer: {
        pinnableItems: {
          nodes: PinNode[];
          pageInfo: { hasNextPage: boolean; endCursor: string | null };
        };
      };
    } = await graphql(
      `query GitPulsePinnableItems($after: String) { viewer { pinnableItems(first: 100, after: $after, types: [REPOSITORY, GIST]) { nodes { ${fields} } pageInfo { hasNextPage endCursor } } } }`,
      { after },
      token,
      signal,
    );
    const connection = data.viewer.pinnableItems;
    items.push(...normalize(connection.nodes));
    if (!connection.pageInfo.hasNextPage)
      return [...new Map(items.map((item) => [item.id, item])).values()];
    after = connection.pageInfo.endCursor;
    if (!after || cursors.has(after) || cursors.size >= 999)
      throw new Error("置顶候选项未能完整加载，请重试。");
    cursors.add(after);
  }
}
