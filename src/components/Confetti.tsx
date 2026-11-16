import { useEffect, useState } from "react";
import { useMotion } from "../motion/MotionProvider";
import { Icon } from "./Icon";

const PIECES = 26;
const DURATION_MS = 2400;
const TONES = ["primary", "lavender", "peach", "pastel"] as const;

/**
 * Chuva de corações e estrelas (spec 007). Dispara de novo cada vez que
 * `burst` muda. Não renderiza nada com o movimento desligado (CA-4).
 */
export function Confetti({ burst }: { burst: number }) {
  const { enabled } = useMotion();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (burst === 0 || !enabled) return;
    setVisible(true);
    const timer = window.setTimeout(() => setVisible(false), DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [burst, enabled]);

  if (!visible || !enabled) return null;
  return (
    <div className="confetti" aria-hidden="true" data-testid="confetti">
      {Array.from({ length: PIECES }, (_, i) => (
        <span
          key={`${burst}-${i}`}
          className="confetti-piece"
          data-tone={TONES[i % TONES.length]}
          style={{
            left: `${(i * 37 + 11) % 100}%`,
            animationDelay: `${(i % 9) * 70}ms`,
            animationDuration: `${1500 + ((i * 53) % 700)}ms`,
          }}
        >
          <Icon name={i % 2 === 0 ? "heart" : "star"} size={14 + (i % 3) * 5} />
        </span>
      ))}
    </div>
  );
}
