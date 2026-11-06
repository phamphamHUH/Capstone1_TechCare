import { useCallback, useEffect, useState } from "react";
import BillingDialog from "./BillingDialog";

export function useUnsavedChanges(dirty: boolean, blocked = false) {
  const [leave, setLeave] = useState<(() => void) | null>(null);
  const requestLeave = useCallback((action: () => void) => {
    if (blocked) return;
    if (dirty) setLeave(() => action);
    else action();
  }, [dirty, blocked]);

  useEffect(() => {
    if (!dirty && !blocked) return;
    const beforeUnload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    const beforeNavigate = (event: Event) => {
      const detail = (event as CustomEvent<{ proceed: () => void }>).detail;
      if (typeof detail?.proceed !== "function") return;
      event.preventDefault();
      requestLeave(detail.proceed);
    };
    window.addEventListener("beforeunload", beforeUnload);
    window.addEventListener("frontdesk:before-navigate", beforeNavigate);
    return () => { window.removeEventListener("beforeunload", beforeUnload); window.removeEventListener("frontdesk:before-navigate", beforeNavigate); };
  }, [dirty, blocked, requestLeave]);

  const discardDialog = leave ? <BillingDialog kind="discard-changes" onCancel={() => setLeave(null)} onConfirm={() => { setLeave(null); leave(); }} /> : null;
  return { requestLeave, discardDialog };
}
