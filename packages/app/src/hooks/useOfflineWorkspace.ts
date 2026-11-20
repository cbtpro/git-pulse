import { useEffect, useRef, useState } from "react";
import { TokenManager } from "../services/auth/TokenManager";
import {
  cacheDocument,
  documentKey,
  saveDraft,
} from "../services/auth/OfflineWorkspace";
import type { CachedDocument, CommentDraft } from "../types/workspace";
export function useOnlineStatus() {
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  return online;
}
export function useOfflineSnapshot(
  accountId: string | null,
  document: Omit<CachedDocument, "savedAt"> | null,
) {
  const serialized = document ? JSON.stringify(document) : "";
  const [error, setError] = useState("");
  useEffect(() => {
    if (!accountId || !serialized) return;
    let alive = true;
    const timer = window.setTimeout(() => {
      void cacheDocument(accountId, JSON.parse(serialized)).then(
        (saved) => {
          if (alive) setError(saved ? "" : "内容较大，未保存为离线副本。");
        },
        () => {
          if (alive) setError("离线副本保存失败，请检查本地存储。");
        },
      );
    }, 300);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [accountId, serialized]);
  return error;
}
export function useCommentDraft(
  accountId: string | null,
  repository: string,
  kind: "issue" | "pull",
  number: number,
) {
  const key = documentKey(repository, kind, number);
  const [body, setBody] = useState(() =>
    accountId
      ? TokenManager.getWorkspace(accountId).drafts[key]?.body || ""
      : "",
  );
  const [state, setState] = useState<"saved" | "saving" | "error">("saved");
  const value = useRef(body),
    dirty = useRef(false),
    timer = useRef<number>(),
    generation = useRef(0),
    mounted = useRef(true);
  const persist = async () => {
    if (!accountId || !dirty.current) return;
    const serial = generation.current;
    const draft: CommentDraft = {
      key,
      repository,
      kind,
      number,
      body: value.current,
      updatedAt: Date.now(),
    };
    try {
      await saveDraft(accountId, draft);
      if (serial === generation.current) {
        dirty.current = false;
        if (mounted.current) setState("saved");
      }
    } catch (error) {
      if (mounted.current) setState("error");
      throw error;
    }
  };
  const persistRef = useRef(persist);
  persistRef.current = persist;
  useEffect(() => {
    mounted.current = true;
    const flush = () => {
      clearTimeout(timer.current);
      void persistRef.current().catch(() => undefined);
    };
    window.addEventListener("pagehide", flush);
    return () => {
      mounted.current = false;
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, []);
  useEffect(() => {
    const discard = (event: Event) => {
      if ((event as CustomEvent).detail === `${accountId}:${key}`) {
        clearTimeout(timer.current);
        dirty.current = false;
        ++generation.current;
      }
    };
    window.addEventListener("gitpulse:discard-draft", discard);
    return () => window.removeEventListener("gitpulse:discard-draft", discard);
  }, [accountId, key]);
  const change = (next: string) => {
    value.current = next;
    dirty.current = true;
    ++generation.current;
    setBody(next);
    setState("saving");
    clearTimeout(timer.current);
    timer.current = window.setTimeout(
      () => void persistRef.current().catch(() => undefined),
      400,
    );
  };
  const flush = async () => {
    clearTimeout(timer.current);
    await persistRef.current();
  };
  const clear = async () => {
    clearTimeout(timer.current);
    ++generation.current;
    value.current = "";
    dirty.current = false;
    setBody("");
    if (accountId)
      await saveDraft(accountId, {
        key,
        repository,
        kind,
        number,
        body: "",
        updatedAt: Date.now(),
      });
    setState("saved");
  };
  return { body, change, flush, clear, state };
}
