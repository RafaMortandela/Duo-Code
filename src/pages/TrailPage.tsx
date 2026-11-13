import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { getTrail, type TrailUnit } from "../api/trail";
import { DifficultyBadge, StatusBadge } from "../components/Badges";
import { Icon, type IconName } from "../components/Icon";
import { EmptyCard, PageShell } from "../components/PageShell";
import { useToast } from "../components/Toast";
import { copy } from "../copy";

/** Ícones que `units.json` pode pedir; o que não estiver aqui vira estrela. */
const unitIcons: Record<string, IconName> = {
  hash: "hash",
  stack: "stack",
  link: "link",
};

/** Estado de navegação usado quando uma questão bloqueada redireciona para cá. */
export type TrailLocationState = { lockedSlug?: string } | null;

function UnitNode({
  unit,
  open,
  onToggle,
}: {
  unit: TrailUnit;
  open: boolean;
  onToggle: () => void;
}) {
  const locked = unit.state === "locked";
  const panelId = `unit-panel-${unit.id}`;
  const icon: IconName = locked ? "lock" : (unitIcons[unit.icon] ?? "star");
  return (
    <li className="path-node" data-state={unit.state} data-current={unit.current}>
      <button
        type="button"
        className="node-button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={onToggle}
      >
        <span className="node-bubble">
          <Icon name={icon} size={30} />
          {unit.state === "completed" && (
            <span className="node-check">
              <Icon name="check" size={14} />
            </span>
          )}
        </span>
        <span className="node-text">
          <strong>{unit.title}</strong>
          <span className="node-meta">
            {copy.trail.state[unit.state]}
            <span aria-hidden="true">{copy.trail.separator}</span>
            {copy.trail.progress(unit.solved, unit.total)}
          </span>
        </span>
      </button>

      {open && (
        <div className="node-panel card" id={panelId}>
          {unit.description && <p className="muted">{unit.description}</p>}
          {locked && unit.blocked_by ? (
            <p className="node-blocked" role="status">
              <Icon name="lock" size={18} />
              {copy.trail.blocked(unit.blocked_by.remaining, unit.blocked_by.unit_title)}
            </p>
          ) : (
            <ul className="problem-list">
              {unit.problems.map((p) => (
                <li key={p.slug}>
                  <Link to={`/problem/${p.slug}`} className="problem-row">
                    <span className="problem-row-title">{p.title}</span>
                    <DifficultyBadge difficulty={p.difficulty} />
                    <StatusBadge status={p.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </li>
  );
}

export function TrailPage() {
  const toast = useToast();
  const lockedSlug = (useLocation().state as TrailLocationState)?.lockedSlug;
  const [units, setUnits] = useState<TrailUnit[] | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getTrail()
      .then((list) => {
        if (cancelled) return;
        setUnits(list);
        // Abre a unidade de onde a usuária foi barrada; senão, a unidade atual.
        const target =
          list.find((u) => lockedSlug && u.problems.some((p) => p.slug === lockedSlug)) ??
          list.find((u) => u.current);
        setOpenId(target?.id ?? null);
      })
      .catch((e) => {
        toast.fromError(e);
        if (!cancelled) setUnits([]);
      });
    return () => {
      cancelled = true;
    };
  }, [toast, lockedSlug]);

  return (
    <PageShell title={copy.trail.title} subtitle={copy.trail.subtitle}>
      {units === null ? (
        <p className="muted">{copy.trail.loading}</p>
      ) : units.length === 0 ? (
        <EmptyCard message={copy.trail.empty} />
      ) : (
        <ol className="path">
          {units.map((unit) => (
            <UnitNode
              key={unit.id}
              unit={unit}
              open={openId === unit.id}
              onToggle={() => setOpenId(openId === unit.id ? null : unit.id)}
            />
          ))}
        </ol>
      )}
    </PageShell>
  );
}
