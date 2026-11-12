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

export type ThemePreference = "auto" | "light" | "dark";
export type ResolvedTheme = "light" | "dark";

const SETTING_KEY = "theme";
const DARK_QUERY = "(prefers-color-scheme: dark)";

type ThemeApi = {
  preference: ThemePreference;
  resolved: ResolvedTheme;
  setPreference: (p: ThemePreference) => void;
};

const ThemeContext = createContext<ThemeApi | null>(null);

function isPreference(v: unknown): v is ThemePreference {
  return v === "auto" || v === "light" || v === "dark";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const toast = useToast();
  const [preference, setPref] = useState<ThemePreference>("auto");
  const [systemDark, setSystemDark] = useState(
    () => window.matchMedia(DARK_QUERY).matches,
  );

  // Carrega a preferência salva.
  useEffect(() => {
    let cancelled = false;
    getSetting(SETTING_KEY)
      .then((v) => {
        if (!cancelled && isPreference(v)) setPref(v);
      })
      .catch(toast.fromError);
    return () => {
      cancelled = true;
    };
  }, [toast]);

  // Acompanha a mudança de tema do sistema enquanto o app está aberto.
  useEffect(() => {
    const mq = window.matchMedia(DARK_QUERY);
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const resolved: ResolvedTheme =
    preference === "auto" ? (systemDark ? "dark" : "light") : preference;

  // Layout effect: o atributo precisa estar no <html> antes de os efeitos dos
  // filhos rodarem (o editor lê os tokens do tema para montar suas cores).
  useLayoutEffect(() => {
    document.documentElement.dataset.theme = resolved;
  }, [resolved]);

  const setPreference = useCallback(
    (p: ThemePreference) => {
      setPref(p);
      setSetting(SETTING_KEY, p).catch(toast.fromError);
    },
    [toast],
  );

  const api = useMemo(
    () => ({ preference, resolved, setPreference }),
    [preference, resolved, setPreference],
  );

  return <ThemeContext.Provider value={api}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeApi {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
}
