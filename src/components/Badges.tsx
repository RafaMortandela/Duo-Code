import type { Difficulty, ProblemStatus } from "../api/problems";
import { copy } from "../copy";
import { Icon, type IconName } from "./Icon";

/** Dificuldade: cor + rótulo, nunca só cor. */
export function DifficultyBadge({ difficulty }: { difficulty: Difficulty }) {
  return (
    <span className="badge" data-difficulty={difficulty}>
      <span className="badge-dot" aria-hidden="true" />
      {copy.difficulty[difficulty]}
    </span>
  );
}

const statusIcon: Record<ProblemStatus, IconName | null> = {
  new: null,
  attempted: "clock",
  solved: "check",
};

export function StatusBadge({ status }: { status: ProblemStatus }) {
  const icon = statusIcon[status];
  return (
    <span className="badge" data-status={status}>
      {icon && <Icon name={icon} size={14} />}
      {copy.status[status]}
    </span>
  );
}
