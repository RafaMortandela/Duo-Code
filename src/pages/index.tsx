import { useParams } from "react-router-dom";
import { EmptyCard, PageShell } from "../components/PageShell";
import { copy } from "../copy";
import { useTheme, type ThemePreference } from "../theme/ThemeProvider";

export function HomePage() {
  return (
    <PageShell title={copy.home.title} subtitle={copy.home.subtitle}>
      <EmptyCard message={copy.home.empty} />
    </PageShell>
  );
}

export function TrailPage() {
  return (
    <PageShell title={copy.trail.title} subtitle={copy.trail.subtitle}>
      <EmptyCard message={copy.trail.empty} />
    </PageShell>
  );
}

export function ProblemPage() {
  const { slug } = useParams();
  return (
    <PageShell title={copy.problem.title} subtitle={slug}>
      <EmptyCard message={copy.problem.empty} />
    </PageShell>
  );
}

export function ReviewPage() {
  return (
    <PageShell title={copy.review.title} subtitle={copy.review.subtitle}>
      <EmptyCard message={copy.review.empty} />
    </PageShell>
  );
}

export function ProfilePage() {
  return (
    <PageShell title={copy.profile.title} subtitle={copy.profile.subtitle}>
      <EmptyCard message={copy.profile.empty} />
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
