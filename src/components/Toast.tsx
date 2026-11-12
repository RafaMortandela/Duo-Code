import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { toApiError } from "../api/client";
import { Icon } from "./Icon";

type ToastKind = "info" | "error";
type ToastItem = { id: number; kind: ToastKind; message: string };

type ToastApi = {
  info: (message: string) => void;
  error: (message: string) => void;
  /** Mostra qualquer falha de comando no formato único de erro. */
  fromError: (e: unknown) => void;
};

const ToastContext = createContext<ToastApi | null>(null);
const DISMISS_MS = 4500;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const push = useCallback((kind: ToastKind, message: string) => {
    const id = nextId.current++;
    setItems((list) => [...list, { id, kind, message }]);
    window.setTimeout(
      () => setItems((list) => list.filter((t) => t.id !== id)),
      DISMISS_MS,
    );
  }, []);

  const api = useMemo<ToastApi>(
    () => ({
      info: (m) => push("info", m),
      error: (m) => push("error", m),
      fromError: (e) => push("error", toApiError(e).message),
    }),
    [push],
  );

  // Rede de segurança: falha de comando que ninguém tratou também vira toast.
  useEffect(() => {
    const onRejection = (ev: PromiseRejectionEvent) => api.fromError(ev.reason);
    window.addEventListener("unhandledrejection", onRejection);
    return () => window.removeEventListener("unhandledrejection", onRejection);
  }, [api]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="toasts" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className="toast" data-kind={t.kind} role="status">
            <Icon name={t.kind === "error" ? "alert" : "heart"} size={20} />
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx;
}
