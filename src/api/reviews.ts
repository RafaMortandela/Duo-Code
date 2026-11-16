import { call } from "./client";
import type { ProblemSummary } from "./problems";

export type Rating = "hard" | "ok" | "easy";

export type ReviewSchedule = {
  stage: number;
  /** Próximo vencimento, `YYYY-MM-DD`. */
  due_date: string;
  /** Falta avaliar a revisão (difícil / ok / fácil). */
  awaiting_rating: boolean;
};

export type ReviewItem = {
  problem: ProblemSummary;
  due_date: string;
  days_overdue: number;
  stage: number;
};

export type ReviewQueue = {
  /** Vencidas, da mais atrasada para a menos atrasada. */
  due: ReviewItem[];
  next_due: string | null;
};

export function getReviewQueue(): Promise<ReviewQueue> {
  return call("get_review_queue");
}

/** Substitui o agendamento provisório ("ok") pela avaliação escolhida. */
export function rateReview(slug: string, rating: Rating): Promise<ReviewSchedule> {
  return call("rate_review", { slug, rating });
}

/** "Não consegui": volta ao começo, sem XP. */
export function failReview(slug: string): Promise<ReviewSchedule> {
  return call("fail_review", { slug });
}
