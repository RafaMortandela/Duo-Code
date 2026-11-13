import type { LevelInfo } from "../api/progress";
import { copy } from "../copy";
import { Icon } from "./Icon";

export function LevelBar({ level }: { level: LevelInfo }) {
  const span = level.next_level_at - level.level_start;
  const have = level.xp_total - level.level_start;
  const percent = span > 0 ? Math.round((have / span) * 100) : 0;
  return (
    <div className="level">
      <div className="level-head">
        <span className="level-badge">
          <Icon name="crown" size={18} />
          {copy.level.label(level.level)}
        </span>
        <span className="muted">{copy.level.progress(have, span)}</span>
      </div>
      <div
        className="bar"
        role="progressbar"
        aria-label={copy.level.barLabel}
        aria-valuemin={0}
        aria-valuemax={span}
        aria-valuenow={have}
      >
        <div className="bar-fill" style={{ width: `${percent}%` }} />
      </div>
      <p className="muted level-next">
        {copy.level.toNext(level.next_level_at - level.xp_total, level.level + 1)}
      </p>
    </div>
  );
}
