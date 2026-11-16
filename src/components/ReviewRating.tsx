import { useState } from "react";
import { Link } from "react-router-dom";
import { rateReview, type Rating, type ReviewSchedule } from "../api/reviews";
import { copy } from "../copy";
import { displayDay } from "../lib/dates";
import { useToast } from "./Toast";

const ratings: Rating[] = ["hard", "ok", "easy"];

/**
 * Avaliação obrigatória depois de uma revisão aceita (005 RF-4): os três
 * botões são o único caminho adiante no painel. Se a usuária sair sem
 * escolher, vale o agendamento provisório "ok" que o backend já gravou.
 */
export function ReviewRating({
  slug,
  schedule,
  onRated,
}: {
  slug: string;
  schedule: ReviewSchedule;
  onRated: (next: ReviewSchedule) => void;
}) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  if (!schedule.awaiting_rating) {
    return (
      <div className="rating" role="status">
        <p className="reward-note">{copy.review.nextDate(displayDay(schedule.due_date))}</p>
        <Link to="/review" className="btn btn-secondary">
          {copy.review.back}
        </Link>
      </div>
    );
  }

  const choose = async (rating: Rating) => {
    setBusy(true);
    try {
      onRated(await rateReview(slug, rating));
    } catch (e) {
      toast.fromError(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rating" role="group" aria-labelledby="rating-title">
      <p className="reward-note" id="rating-title">
        {copy.review.rateTitle}
      </p>
      <p className="muted">{copy.review.rateNote}</p>
      <div className="rating-options">
        {ratings.map((rating) => (
          <button
            key={rating}
            type="button"
            className="btn btn-secondary rating-option"
            disabled={busy}
            onClick={() => choose(rating)}
          >
            <strong>{copy.review.rating[rating]}</strong>
            <span>{copy.review.ratingHint[rating]}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
