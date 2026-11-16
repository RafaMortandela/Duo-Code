import { Link } from "react-router-dom";
import { DifficultyBadge } from "../components/Badges";
import { Icon } from "../components/Icon";
import { LevelBar } from "../components/LevelBar";
import { Mascot, type MascotPose } from "../components/Mascot";
import { PageShell } from "../components/PageShell";
import { copy } from "../copy";
import { useProgress } from "../progress/ProgressProvider";

export function HomePage() {
  const { progress } = useProgress();
  if (!progress) {
    return (
      <PageShell title={copy.home.title} subtitle={copy.home.subtitle}>
        <p className="muted">{copy.home.loading}</p>
      </PageShell>
    );
  }

  const { streak, level, next_problem: next } = progress;
  const fresh = streak.state === "broken" && streak.best === 0;
  const message = fresh ? copy.home.state.fresh : copy.home.state[streak.state];
  const pose: MascotPose =
    streak.state === "secured" ? "celebrating" : streak.state === "broken" && !fresh ? "sad" : "happy";

  return (
    <PageShell title={copy.home.title} subtitle={copy.home.subtitle}>
      <div className="home-grid">
        <section className="card streak-card" data-state={streak.state}>
          <div className="streak-flame">
            <Icon name="flame" size={44} />
          </div>
          <div>
            <p className="streak-number">
              <strong>{streak.current}</strong>
              {copy.home.streakDays(streak.current)}
            </p>
            <p className="streak-message">{message}</p>
            <p className="muted">{copy.home.best(streak.best)}</p>
          </div>
          <Mascot pose={pose} size={132} />
        </section>

        <section className="card">
          <LevelBar level={level} />
        </section>

        {progress.reviews_due > 0 && (
          <section className="card review-card">
            <div className="review-card-text">
              <Icon name="review" size={28} />
              <strong>{copy.review.count(progress.reviews_due)}</strong>
            </div>
            <Link to="/review" className="btn btn-secondary">
              {copy.review.homeCta}
            </Link>
          </section>
        )}

        <section className="card next-card">
          {next ? (
            <>
              <div>
                <p className="eyebrow">{copy.home.next}</p>
                <h2>{next.title}</h2>
                <div className="badges">
                  <DifficultyBadge difficulty={next.difficulty} />
                  <span className="badge">{copy.units[next.unit] ?? next.unit}</span>
                </div>
              </div>
              <Link to={`/problem/${next.slug}`} className="btn btn-primary">
                <Icon name="play" size={18} />
                {copy.home.nextCta}
              </Link>
            </>
          ) : (
            <>
              <p className="streak-message">{copy.home.allDone}</p>
              <Link to="/review" className="btn btn-secondary">
                {copy.home.goReview}
              </Link>
            </>
          )}
        </section>
      </div>
    </PageShell>
  );
}
