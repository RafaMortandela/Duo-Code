// Mascote do Duo Code (spec 007): uma gatinha com laço e notebook, em quatro
// poses. É decorativa: nenhuma informação depende dela, por isso `aria-hidden`.
// Todas as cores vêm dos tokens do tema.

import { copy } from "../copy";

export type MascotPose = "happy" | "celebrating" | "sleepy" | "sad";

const INK = "var(--text)";
const FUR = "var(--surface)";
const BLUSH = "var(--pastel)";
const BOW = "var(--primary)";

function Eyes({ pose }: { pose: MascotPose }) {
  switch (pose) {
    case "celebrating":
      // olhos fechados de alegria: ^ ^
      return (
        <g fill="none" stroke={INK} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
          <path d="M57 62l7-7 7 7" />
          <path d="M89 62l7-7 7 7" />
        </g>
      );
    case "sleepy":
      // olhos fechados relaxados
      return (
        <g fill="none" stroke={INK} strokeWidth={3} strokeLinecap="round">
          <path d="M57 60q7 6 14 0" />
          <path d="M89 60q7 6 14 0" />
        </g>
      );
    case "sad":
      return (
        <>
          <g fill={INK}>
            <ellipse cx="64" cy="61" rx="4" ry="5" />
            <ellipse cx="96" cy="61" rx="4" ry="5" />
          </g>
          <g fill="none" stroke={INK} strokeWidth={2.5} strokeLinecap="round">
            <path d="M56 52l12 4" />
            <path d="M104 52l-12 4" />
          </g>
          {/* lágrima */}
          <path d="M104 68q-4 7 0 10 4-3 0-10Z" fill="var(--lavender)" />
        </>
      );
    default:
      return (
        <>
          <g fill={INK}>
            <ellipse cx="64" cy="60" rx="4.5" ry="6" />
            <ellipse cx="96" cy="60" rx="4.5" ry="6" />
          </g>
          <g fill={FUR}>
            <circle cx="65.500" cy="57.500" r="1.600" />
            <circle cx="97.500" cy="57.500" r="1.600" />
          </g>
        </>
      );
  }
}

function Mouth({ pose }: { pose: MascotPose }) {
  const common = { fill: "none", stroke: INK, strokeWidth: 2.5, strokeLinecap: "round" as const };
  switch (pose) {
    case "celebrating":
      return <path d="M72 72q8 10 16 0Z" fill={BOW} stroke={INK} strokeWidth={2.5} strokeLinejoin="round" />;
    case "sad":
      return <path d="M73 77q7-6 14 0" {...common} />;
    case "sleepy":
      return <circle cx="80" cy="75" r="2.500" fill={INK} />;
    default:
      return <path d="M73 72q3.500 4 7 0 3.500 4 7 0" {...common} />;
  }
}

function Extras({ pose }: { pose: MascotPose }) {
  if (pose === "celebrating") {
    // patinhas para cima e brilhos
    return (
      <>
        <g fill={FUR} stroke={INK} strokeWidth={3} strokeLinejoin="round">
          <ellipse cx="34" cy="74" rx="8" ry="10" transform="rotate(-25 34 74)" />
          <ellipse cx="126" cy="74" rx="8" ry="10" transform="rotate(25 126 74)" />
        </g>
        <g fill="none" stroke="var(--lavender)" strokeWidth={3} strokeLinecap="round">
          <path d="M22 34v10M17 39h10" />
          <path d="M140 26v10M135 31h10" />
        </g>
        <path d="M132 50l2.500 5 5 .8-3.700 3.600.9 5-4.700-2.400-4.700 2.400.9-5-3.700-3.600 5-.8Z" fill="var(--peach)" />
      </>
    );
  }
  if (pose === "sleepy") {
    return (
      <g fill="none" stroke="var(--lavender)" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
        <path d="M122 30h9l-9 10h9" />
        <path d="M137 14h6l-6 7h6" />
      </g>
    );
  }
  return null;
}

export function Mascot({ pose, size = 120 }: { pose: MascotPose; size?: number }) {
  return (
    <svg
      className="mascot"
      data-pose={pose}
      width={size}
      height={(size * 140) / 160}
      viewBox="0 0 160 140"
      aria-hidden="true"
    >
      {/* orelhas */}
      <g fill={FUR} stroke={INK} strokeWidth={3} strokeLinejoin="round">
        <path d="M48 44 44 16l26 14Z" />
        <path d="M112 44l4-28-26 14Z" />
      </g>
      <g fill={BLUSH}>
        <path d="M51 36l-1.500-12 11 6Z" />
        <path d="M109 36l1.500-12-11 6Z" />
      </g>

      {/* cabeça */}
      <ellipse cx="80" cy="62" rx="42" ry="35" fill={FUR} stroke={INK} strokeWidth={3} />
      <g fill={BLUSH}>
        <ellipse cx="52" cy="72" rx="7" ry="4.500" />
        <ellipse cx="108" cy="72" rx="7" ry="4.500" />
      </g>
      <Eyes pose={pose} />
      <path d="M77.500 67h5l-2.500 3Z" fill={BOW} />
      <Mouth pose={pose} />

      {/* laço na orelha */}
      <g fill={BOW} stroke={INK} strokeWidth={2.5} strokeLinejoin="round">
        <path d="M112 26 96 16v20Z" />
        <path d="M112 26l16-10v20Z" />
        <circle cx="112" cy="26" r="4.500" />
      </g>

      <Extras pose={pose} />

      {/* notebook */}
      <g stroke={INK} strokeWidth={3} strokeLinejoin="round">
        <rect x="42" y="92" width="76" height="40" rx="8" fill={BLUSH} />
        <path d="M32 132h96" strokeLinecap="round" fill="none" />
      </g>
      <text
        x="80"
        y="118"
        textAnchor="middle"
        fontFamily="var(--font-code)"
        fontWeight={700}
        fontSize={17}
        fill="var(--on-accent)"
      >
        {copy.app.mark}
      </text>
    </svg>
  );
}
