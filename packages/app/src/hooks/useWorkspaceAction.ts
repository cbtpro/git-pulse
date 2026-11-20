import { useEffect, useRef, useState } from "react";
import { Message } from "@arco-design/web-react";
import { useTranslation } from "../i18n";

export function useWorkspaceAction() {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const run = async (operation: () => Promise<unknown>) => {
    if (pending.current) return false;
    pending.current = true;
    setBusy(true);
    try {
      await operation();
      return true;
    } catch (error) {
      if (mounted.current)
        Message.error(
          t(error instanceof Error ? error.message : "操作失败，请重试"),
        );
      return false;
    } finally {
      pending.current = false;
      if (mounted.current) setBusy(false);
    }
  };
  return { busy, run };
}
