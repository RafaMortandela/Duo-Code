import { EmptyCard, PageShell } from "../components/PageShell";
import { copy } from "../copy";
import { useTheme, type ThemePreference } from "../theme/ThemeProvider";

export function ReviewPage() {
  return (
    <PageShell title={copy.review.title} subtitle={copy.review.subtitle}>
      <EmptyCard message={copy.review.empty} />
    </PageShell>
  );
}

const themeOptions: { value: ThemePreference; label: string }[] = [
  { value: "auto", label: copy.settings.themeAuto },
  { value: "light", label: copy.settings.themeLight },
  { value: "dark", label: copy.settings.themeDark },
];

export function SettingsPage() {
  const { preference, setPreference } = useTheme();
  return (
    <PageShell title={copy.settings.title} subtitle={copy.settings.subtitle}>
      <div className="card">
        <p className="field-label" id="theme-label">
          {copy.settings.theme}
        </p>
        <div className="segmented" role="group" aria-labelledby="theme-label">
          {themeOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              aria-pressed={preference === opt.value}
              onClick={() => setPreference(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </PageShell>
  );
}

export { ProblemPage } from "./ProblemPage";
export { TrailPage } from "./TrailPage";
export { HomePage } from "./HomePage";
export { ProfilePage } from "./ProfilePage";
