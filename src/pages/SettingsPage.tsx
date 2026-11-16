import { useEffect, useState } from "react";
import {
  DEFAULT_REMINDER_TIME,
  getAutostart,
  REMINDER_ENABLED,
  REMINDER_TIME,
  setAutostart,
  testNotification,
} from "../api/desktop";
import { getSetting, setSetting } from "../api/settings";
import { PageShell } from "../components/PageShell";
import { useToast } from "../components/Toast";
import { copy } from "../copy";
import { useMotion } from "../motion/MotionProvider";
import { useTheme, type ThemePreference } from "../theme/ThemeProvider";

const themeOptions: { value: ThemePreference; label: string }[] = [
  { value: "auto", label: copy.settings.themeAuto },
  { value: "light", label: copy.settings.themeLight },
  { value: "dark", label: copy.settings.themeDark },
];

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <label className="toggle">
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="toggle-track" aria-hidden="true" />
      {label}
    </label>
  );
}

export function SettingsPage() {
  const toast = useToast();
  const { preference, setPreference } = useTheme();
  const motion = useMotion();
  const [enabled, setEnabled] = useState(true);
  const [time, setTime] = useState(DEFAULT_REMINDER_TIME);
  const [autostart, setAutostartState] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getSetting(REMINDER_ENABLED), getSetting(REMINDER_TIME), getAutostart()])
      .then(([savedEnabled, savedTime, auto]) => {
        if (cancelled) return;
        setEnabled(savedEnabled !== "false");
        if (savedTime && TIME_PATTERN.test(savedTime)) setTime(savedTime);
        setAutostartState(auto);
      })
      .catch(toast.fromError);
    return () => {
      cancelled = true;
    };
  }, [toast]);

  const changeEnabled = (next: boolean) => {
    setEnabled(next);
    setSetting(REMINDER_ENABLED, String(next)).catch(toast.fromError);
  };

  const changeTime = (next: string) => {
    setTime(next);
    // o campo fica vazio enquanto a usuária digita; só grava horário completo
    if (TIME_PATTERN.test(next)) setSetting(REMINDER_TIME, next).catch(toast.fromError);
  };

  const changeAutostart = (next: boolean) => {
    setAutostartState(next);
    setAutostart(next).catch((e) => {
      setAutostartState(!next);
      toast.fromError(e);
    });
  };

  const sendTest = () => {
    testNotification()
      .then(() => toast.info(copy.settings.reminderTested))
      .catch(toast.fromError);
  };

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

      <div className="card section">
        <div>
          <h2>{copy.settings.animations}</h2>
          <p className="muted">{copy.settings.animationsNote}</p>
        </div>
        <Toggle
          label={copy.settings.animationsEnabled}
          checked={motion.preferred}
          onChange={motion.setPreferred}
        />
      </div>

      <div className="card section">
        <div>
          <h2>{copy.settings.reminder}</h2>
          <p className="muted">{copy.settings.reminderNote}</p>
        </div>
        <Toggle
          label={copy.settings.reminderEnabled}
          checked={enabled}
          onChange={changeEnabled}
        />
        <label className="field">
          {copy.settings.reminderTime}
          <input
            type="time"
            value={time}
            disabled={!enabled}
            onChange={(e) => changeTime(e.target.value)}
          />
        </label>
        <button type="button" className="btn btn-ghost" onClick={sendTest}>
          {copy.settings.reminderTest}
        </button>
      </div>

      <div className="card section">
        <div>
          <h2>{copy.settings.autostart}</h2>
          <p className="muted">{copy.settings.autostartNote}</p>
        </div>
        <Toggle
          label={copy.settings.autostart}
          checked={autostart}
          onChange={changeAutostart}
        />
        <p className="muted">{copy.settings.trayNote}</p>
      </div>
    </PageShell>
  );
}
