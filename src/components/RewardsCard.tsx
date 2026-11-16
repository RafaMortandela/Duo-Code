import type { Rewards } from "../api/progress";
import { copy } from "../copy";
import { Icon } from "./Icon";

/** Resumo de recompensas de uma submissão aceita (spec 003 RF-6). */
function UnitsUnlocked({ titles }: { titles: string[] }) {
  return (
    <>
      {titles.map((title) => (
        <p key={title} className="reward-highlight" data-kind="unit">
          <Icon name="trail" size={22} />
          <span>
            <span className="reward-eyebrow">{copy.rewards.unitUnlocked}</span>
            <strong>{title}</strong>
          </span>
        </p>
      ))}
    </>
  );
}

export function RewardsCard({ rewards }: { rewards: Rewards }) {
  if (rewards.reason === "already_solved" || rewards.reason === "gave_up") {
    return (
      <div className="rewards" aria-label={copy.rewards.title}>
        <p className="muted">{copy.rewards[rewards.reason]}</p>
        <UnitsUnlocked titles={rewards.units_unlocked} />
      </div>
    );
  }
  const leveledUp = rewards.level.level > rewards.level_before;
  const streakUp = rewards.streak.current > rewards.streak_before;
  return (
    <div className="rewards" aria-label={copy.rewards.title}>
      <div className="reward-chips">
        {rewards.reason === "review" && (
          <span className="chip" data-kind="review">
            <Icon name="review" size={18} />
            {copy.rewards.reviewed}
          </span>
        )}
        <span className="chip" data-kind="xp">
          <Icon name="star" size={18} />
          {copy.rewards.xp(rewards.xp_gained)}
        </span>
        <span className="chip" data-kind="streak">
          <Icon name="flame" size={18} />
          {copy.rewards.streak(rewards.streak.current)}
        </span>
      </div>
      {streakUp && <p className="reward-note">{copy.rewards.streakUp}</p>}
      {leveledUp && (
        <p className="reward-highlight" data-kind="level">
          <Icon name="crown" size={22} />
          {copy.rewards.levelUp(rewards.level.level)}
        </p>
      )}
      {rewards.achievements.map((id) => (
        <p key={id} className="reward-highlight" data-kind="achievement">
          <Icon name="medal" size={22} />
          <span>
            <span className="reward-eyebrow">{copy.rewards.achievement}</span>
            <strong>{copy.achievements[id]?.title ?? id}</strong>
          </span>
        </p>
      ))}
      <UnitsUnlocked titles={rewards.units_unlocked} />
    </div>
  );
}
