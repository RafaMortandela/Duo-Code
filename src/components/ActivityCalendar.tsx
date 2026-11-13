import { copy } from "../copy";
import { calendarDays, displayDay } from "../lib/dates";

const WEEKS = 53;

function intensity(count: number): 0 | 1 | 2 | 3 {
  if (count <= 0) return 0;
  if (count === 1) return 1;
  if (count <= 3) return 2;
  return 3;
}

/** Calendário de atividade dos últimos 12 meses: uma coluna por semana. */
export function ActivityCalendar({
  today,
  activity,
}: {
  today: string;
  activity: { date: string; count: number }[];
}) {
  const counts = new Map(activity.map((a) => [a.date, a.count]));
  const days = calendarDays(today, WEEKS);
  const activeDays = days.filter((d) => (counts.get(d) ?? 0) > 0).length;
  return (
    <div>
      <div
        className="calendar"
        role="img"
        aria-label={copy.profile.calendarSummary(activeDays)}
      >
        {days.map((day) => {
          const count = counts.get(day) ?? 0;
          return (
            <span
              key={day}
              className="calendar-cell"
              data-level={intensity(count)}
              data-today={day === today}
              title={copy.profile.calendarCell(displayDay(day), count)}
            />
          );
        })}
      </div>
      <p className="muted calendar-summary">{copy.profile.calendarSummary(activeDays)}</p>
    </div>
  );
}
