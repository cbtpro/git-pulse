import { useEffect, useState } from "react";

/** 调用方提供稳定的 loader；切换筛选、账号或页面时取消过时的请求。 */
export function useGitHubResource<T>(
  loader: (signal: AbortSignal) => Promise<T>,
) {
  const [state, setState] = useState<{
    data: T | null;
    loading: boolean;
    error: Error | null;
  }>({ data: null, loading: true, error: null });
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setState({ data: null, loading: true, error: null });
    Promise.resolve()
      .then(() => {
        controller.signal.throwIfAborted();
        return loader(controller.signal);
      })
      .then(
        (data) => {
          if (!controller.signal.aborted)
            setState({ data, loading: false, error: null });
        },
        (error) => {
          if (!controller.signal.aborted)
            setState({
              data: null,
              loading: false,
              error:
                error instanceof Error ? error : new Error("加载失败，请重试"),
            });
        },
      );
    return () => controller.abort();
  }, [loader, revision]);
  return { ...state, reload: () => setRevision((value) => value + 1) };
}
