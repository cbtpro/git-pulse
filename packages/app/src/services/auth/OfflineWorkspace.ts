import { TokenManager } from "./TokenManager";
import type { CachedDocument, CommentDraft } from "../../types/workspace";
export function documentKey(
  repository: string,
  kind: CachedDocument["kind"],
  id: string | number,
) {
  return `${repository.toLowerCase()}/${kind}/${id}`;
}
export function trimDocuments(documents: Record<string, CachedDocument>) {
  const entries = Object.values(documents).sort(
    (a, b) => b.savedAt - a.savedAt,
  );
  const result: Record<string, CachedDocument> = {};
  let total = 2;
  for (const doc of entries.slice(0, 60)) {
    const size =
      new TextEncoder().encode(JSON.stringify(doc) + JSON.stringify(doc.key))
        .length + 2;
    if (size > 300_000 || total + size > 2_000_000) continue;
    total += size;
    result[doc.key] = doc;
  }
  return result;
}
export async function cacheDocument(
  accountId: string,
  document: Omit<CachedDocument, "savedAt">,
) {
  if (new TextEncoder().encode(JSON.stringify(document)).length > 300_000)
    return false;
  await TokenManager.updateWorkspace(accountId, (current) =>
    current.offlineEnabled === false
      ? current
      : {
          ...current,
          documents: trimDocuments({
            ...current.documents,
            [document.key]: { ...document, savedAt: Date.now() },
          }),
        },
  );
  return true;
}
export function saveDraft(accountId: string, draft: CommentDraft) {
  return TokenManager.updateWorkspace(accountId, (current) => {
    const drafts = { ...current.drafts };
    if (draft.body.trim()) drafts[draft.key] = draft;
    else delete drafts[draft.key];
    if (Object.keys(drafts).length > 100)
      throw new Error("草稿已达上限，请先清理部分草稿。");
    return { ...current, drafts };
  });
}
