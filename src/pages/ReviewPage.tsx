import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getReviewQueue, type ReviewQueue } from "../api/reviews";
import { DifficultyBadge } from "../components/Badges";
import { Icon } from "../components/Icon";
import { EmptyCard, PageShell } from "../components/PageShell";
import { useToast } from "../components/Toast";
import { copy } from "../copy";
import { displayDay } from "../lib/dates";

export function ReviewPage() {
  const toast = useToast();
  const [queue, setQueue] = useState<ReviewQueue | null>(null);

  useEffect(() => {
    let cancelled = false;
    getReviewQueue()
      .then((q) => {
        if (!cancelled) setQueue(q);
      })
      .catch((e) => {
        toast.fromError(e);
        if (!cancelled) setQueue({ due: [], next_due: null });
      });
    return () => {
      cancelled = true;
    };
  }, [toast]);

  return (
    <PageShell title={copy.review.title} subtitle={copy.review.subtitle}>
      {queue === null ? (
        <p className="muted">{copy.review.loading}</p>
      ) : queue.due.length === 0 ? (
        <>
          <EmptyCard message={copy.review.empty} />
          <p className="muted">
            {queue.next_due
              ? copy.review.emptyNext(displayDay(queue.next_due))
              : copy.review.emptyNever}
          </p>
        </>
      ) : (
        <section className="card section">
          <h2>{copy.review.count(queue.due.length)}</h2>
          <ul className="problem-list">
            {queue.due.map((item) => (
              <li key={item.problem.slug} className="review-row">
                <span className="problem-row-title">{item.problem.title}</span>
                <DifficultyBadge difficulty={item.problem.difficulty} />
                <span className="badge" data-overdue={item.days_overdue > 0}>
                  <Icon name="clock" size={14} />
                  {item.days_overdue > 0
                    ? copy.review.overdue(item.days_overdue)
                    : copy.review.dueToday}
                </span>
                <Link to={`/problem/${item.problem.slug}?review=1`} className="btn btn-primary">
                  {copy.review.start}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </PageShell>
  );
}
