import { useCallback, useEffect, useRef, useState } from "react";
import {
  observeResourceReads,
  type ResourceReadSet,
} from "../services/github/ResourceInvalidation";

/** Initial/query loads replace data; same-resource invalidations refresh in place. */
export function useGitHubResource<T>(
  loader: (signal: AbortSignal) => Promise<T>,
) {
  const [state, setState] = useState<{
    data: T | null;
    loading: boolean;
    error: Error | null;
    refreshing: boolean;
    refreshError: Error | null;
  }>({
    data: null,
    loading: true,
    error: null,
    refreshing: false,
    refreshError: null,
  });
  const [revision, setRevision] = useState(0);
  const previousLoader = useRef<typeof loader>();
  const dependencies = useRef<ResourceReadSet>([]);
  const reload = useCallback(() => setRevision((value) => value + 1), []);
  useEffect(() => {
    const controller = new AbortController();
    const sameResource = previousLoader.current === loader;
    previousLoader.current = loader;
    setState((previous) =>
      sameResource && previous.data !== null
        ? { ...previous, refreshing: true, refreshError: null }
        : {
            data: null,
            loading: true,
            error: null,
            refreshing: false,
            refreshError: null,
          },
    );
    if (!sameResource) dependencies.current = [];
    const unsubscribe = observeResourceReads(
      controller.signal,
      reload,
      dependencies.current,
    );
    Promise.resolve()
      .then(() => {
        controller.signal.throwIfAborted();
        return loader(controller.signal);
      })
      .then(
        (data) => {
          if (!controller.signal.aborted)
            setState({
              data,
              loading: false,
              error: null,
              refreshing: false,
              refreshError: null,
            });
        },
        (reason) => {
          if (controller.signal.aborted) return;
          const error =
            reason instanceof Error ? reason : new Error("加载失败，请重试");
          setState((previous) =>
            sameResource && previous.data !== null
              ? { ...previous, refreshing: false, refreshError: error }
              : {
                  data: null,
                  loading: false,
                  error,
                  refreshing: false,
                  refreshError: null,
                },
          );
        },
      );
    return () => {
      unsubscribe();
      controller.abort();
    };
  }, [loader, revision, reload]);
  return { ...state, reload };
}
