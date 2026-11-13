import { ActivityCalendar } from "../components/ActivityCalendar";
import { DifficultyBadge } from "../components/Badges";
import { Icon, type IconName } from "../components/Icon";
import { LevelBar } from "../components/LevelBar";
import { PageShell } from "../components/PageShell";
import { copy } from "../copy";
import { displayDay } from "../lib/dates";
import { useProgress } from "../progress/ProgressProvider";

function Stat({ icon, label, value }: { icon: IconName; label: string; value: string }) {
  return (
    <div className="stat">
      <Icon name={icon} size={22} />
      <div>
        <p className="stat-value">{value}</p>
        <p className="muted">{label}</p>
      </div>
    </div>
  );
}

export function ProfilePage() {
  const { progress } = useProgress();
  if (!progress) {
    return (
      <PageShell title={copy.profile.title} subtitle={copy.profile.subtitle}>
        <p className="muted">{copy.home.loading}</p>
      </PageShell>
    );
  }

  const { streak, level, solved, achievements } = progress;
  const unlocked = achievements.filter((a) => a.unlocked_on !== null).length;
  return (
    <PageShell title={copy.profile.title} subtitle={copy.profile.subtitle}>
      <section className="card">
        <LevelBar level={level} />
      </section>

      <section className="card stats">
        <Stat icon="star" label={copy.profile.xpTotal} value={String(level.xp_total)} />
        <Stat icon="flame" label={copy.profile.streakCurrent} value={String(streak.current)} />
        <Stat icon="crown" label={copy.profile.streakBest} value={String(streak.best)} />
        <Stat
          icon="check"
          label={copy.profile.solved}
          value={copy.profile.solvedOf(solved.total, progress.problems_total)}
        />
      </section>

      <section className="card section">
        <h2>{copy.profile.solved}</h2>
        <ul className="solved-list">
          {(["easy", "medium", "hard"] as const).map((difficulty) => (
            <li key={difficulty}>
              <DifficultyBadge difficulty={difficulty} />
              <strong>{solved[difficulty]}</strong>
            </li>
          ))}
        </ul>
      </section>

      <section className="card section">
        <h2>{copy.profile.calendar}</h2>
        <ActivityCalendar today={progress.today} activity={progress.activity} />
      </section>

      <section className="card section">
        <h2>
          {copy.profile.achievements}
          <span className="muted count">
            {copy.profile.achievementsCount(unlocked, achievements.length)}
          </span>
        </h2>
        <ul className="achievements">
          {achievements.map((a) => {
            const text = copy.achievements[a.id];
            const done = a.unlocked_on !== null;
            return (
              <li key={a.id} className="achievement" data-unlocked={done}>
                <span className="achievement-icon">
                  <Icon name={done ? "medal" : "lock"} size={26} />
                </span>
                <div>
                  <p className="achievement-title">{text?.title ?? a.id}</p>
                  <p className="muted">{text?.description}</p>
                  <p className="achievement-date">
                    {a.unlocked_on
                      ? copy.profile.unlockedOn(displayDay(a.unlocked_on))
                      : copy.profile.locked}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </PageShell>
  );
}
