import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { getSetting, setSetting } from "../api/settings";
import { useToast } from "../components/Toast";

const SETTING_KEY = "animations";
const REDUCED_QUERY = "(prefers-reduced-motion: reduce)";

type MotionApi = {
  /** A opção "Animações" de Ajustes. */
  preferred: boolean;
  /** Há movimento de fato: a opção está ligada e o sistema não pede redução. */
  enabled: boolean;
  setPreferred: (on: boolean) => void;
};

const MotionContext = createContext<MotionApi | null>(null);

/**
 * Decide se a interface se mexe (spec 007): respeita `prefers-reduced-motion`
 * e a opção de Ajustes. Com movimento desligado, `<html data-motion="off">`
 * faz o CSS zerar animações, e componentes como o confete nem renderizam.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  const toast = useToast();
  const [preferred, setPref] = useState(true);
  const [systemReduced, setSystemReduced] = useState(
    () => window.matchMedia(REDUCED_QUERY).matches,
  );

  useEffect(() => {
    let cancelled = false;
    getSetting(SETTING_KEY)
      .then((v) => {
        if (!cancelled) setPref(v !== "off");
      })
      .catch(toast.fromError);
    return () => {
      cancelled = true;
    };
  }, [toast]);

  useEffect(() => {
    const mq = window.matchMedia(REDUCED_QUERY);
    const onChange = (e: MediaQueryListEvent) => setSystemReduced(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const enabled = preferred && !systemReduced;

  useLayoutEffect(() => {
    document.documentElement.dataset.motion = enabled ? "on" : "off";
  }, [enabled]);

  const setPreferred = useCallback(
    (on: boolean) => {
      setPref(on);
      setSetting(SETTING_KEY, on ? "on" : "off").catch(toast.fromError);
    },
    [toast],
  );

  const api = useMemo(
    () => ({ preferred, enabled, setPreferred }),
    [preferred, enabled, setPreferred],
  );
  return <MotionContext.Provider value={api}>{children}</MotionContext.Provider>;
}

export function useMotion(): MotionApi {
  const ctx = useContext(MotionContext);
  if (!ctx) throw new Error("useMotion must be used inside MotionProvider");
  return ctx;
}
