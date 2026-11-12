import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listProblems, type ProblemSummary } from "../api/problems";
import { DifficultyBadge, StatusBadge } from "../components/Badges";
import { EmptyCard, PageShell } from "../components/PageShell";
import { useToast } from "../components/Toast";
import { copy } from "../copy";

// Lista provisória de questões agrupadas por unidade. A trilha de verdade,
// com ordem e desbloqueio, chega na spec 004.

function groupByUnit(problems: ProblemSummary[]): [string, ProblemSummary[]][] {
  const groups = new Map<string, ProblemSummary[]>();
  for (const p of problems) {
    groups.set(p.unit, [...(groups.get(p.unit) ?? []), p]);
  }
  return [...groups.entries()];
}

export function TrailPage() {
  const toast = useToast();
  const [problems, setProblems] = useState<ProblemSummary[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    listProblems()
      .then((list) => {
        if (!cancelled) setProblems(list);
      })
      .catch((e) => {
        toast.fromError(e);
        if (!cancelled) setProblems([]);
      });
    return () => {
      cancelled = true;
    };
  }, [toast]);

  return (
    <PageShell title={copy.trail.title} subtitle={copy.trail.subtitle}>
      {problems === null ? (
        <p className="muted">{copy.trail.loading}</p>
      ) : problems.length === 0 ? (
        <EmptyCard message={copy.trail.empty} />
      ) : (
        groupByUnit(problems).map(([unit, items]) => (
          <section key={unit} className="card unit">
            <h2>{copy.units[unit] ?? unit}</h2>
            <ul className="problem-list">
              {items.map((p) => (
                <li key={p.slug}>
                  <Link to={`/problem/${p.slug}`} className="problem-row">
                    <span className="problem-row-title">{p.title}</span>
                    <DifficultyBadge difficulty={p.difficulty} />
                    <StatusBadge status={p.status} />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </PageShell>
  );
}
