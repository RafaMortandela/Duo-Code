import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { getProgress, type Progress } from "../api/progress";
import { useToast } from "../components/Toast";

type ProgressApi = {
  /** `null` enquanto carrega. */
  progress: Progress | null;
  /** Relê o progresso do backend (depois de um envio, por exemplo). */
  refresh: () => Promise<void>;
};

const ProgressContext = createContext<ProgressApi | null>(null);

export function ProgressProvider({ children }: { children: ReactNode }) {
  const toast = useToast();
  const [progress, setProgress] = useState<Progress | null>(null);

  const refresh = useCallback(async () => {
    try {
      setProgress(await getProgress());
    } catch (e) {
      toast.fromError(e);
    }
  }, [toast]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const api = useMemo(() => ({ progress, refresh }), [progress, refresh]);
  return <ProgressContext.Provider value={api}>{children}</ProgressContext.Provider>;
}

export function useProgress(): ProgressApi {
  const ctx = useContext(ProgressContext);
  if (!ctx) throw new Error("useProgress must be used inside ProgressProvider");
  return ctx;
}
