import type { ReactNode } from "react";

// Ícones do Duo Code (spec 007): traço arredondado de 2 px e, quando o desenho
// tem área fechada, uma camada de preenchimento suave na mesma cor. Tudo herda
// `currentColor`, então a cor vem sempre do contexto (tokens).

export type IconName =
  | "home"
  | "trail"
  | "review"
  | "profile"
  | "settings"
  | "heart"
  | "alert"
  | "check"
  | "cross"
  | "clock"
  | "minus"
  | "play"
  | "send"
  | "bulb"
  | "reset"
  | "eye"
  | "back"
  | "flame"
  | "star"
  | "crown"
  | "medal"
  | "lock"
  | "bow"
  | "hash"
  | "pointers"
  | "window"
  | "stack"
  | "search"
  | "link"
  | "tree"
  | "heap"
  | "graph"
  | "table";

type Drawing = {
  /** Áreas preenchidas em tom suave. */
  soft?: ReactNode;
  /** Traços. */
  line: ReactNode;
};

const HEART = "M12 20c-4.5-3.6-8-6.4-8-10.2A4.3 4.3 0 0 1 12 7a4.3 4.3 0 0 1 8 2.8c0 3.8-3.5 6.6-8 10.2Z";
const FLAME =
  "M12 3.5c1 3.5 5.5 5.5 5.5 10.5a5.5 5.5 0 0 1-11 0c0-2.2 1-3.8 2.2-5 .3 1.5 1 2.3 2 2.8-.2-2.8.1-5.800 1.300-8.300Z";
const STAR = "m12 4 2.4 5 5.4.7-4 3.800 1 5.400L12 16.300l-4.800 2.600 1-5.400-4-3.800 5.400-.700L12 4Z";
const CROWN = "M5 15 4 7.5l4.5 3.5L12 6l3.5 5L20 7.5 19 15H5Z";
const MAP = "M9 4 3.5 6v14L9 18l6 2 5.5-2V4L15 6 9 4Z";
const BOW = "M12 12 5.500 8v8L12 12Zm0 0 6.500-4v8L12 12Z";
const PETALS = [0, 60, 120, 180, 240, 300].map((deg) => {
  const rad = (deg * Math.PI) / 180;
  return { cx: 12 + 5.2 * Math.cos(rad), cy: 12 + 5.2 * Math.sin(rad) };
});

const drawings: Record<IconName, Drawing> = {
  home: {
    soft: <path d="M6.5 10.5 12 5.500l5.500 5V19h-11v-8.500Z" />,
    line: (
      <>
        <path d="M4 11.5 12 4l8 7.5" />
        <path d="M6.5 10v9h11v-9" />
        <path d="M12 16.5c-1.2-1-2-1.7-2-2.6a1.2 1.2 0 0 1 2-.8 1.2 1.2 0 0 1 2 .8c0 .9-.8 1.6-2 2.6Z" />
      </>
    ),
  },
  trail: {
    soft: <path d={MAP} />,
    line: (
      <>
        <path d={MAP} />
        <path d="M9 4v14M15 6v14" />
      </>
    ),
  },
  review: {
    soft: <circle cx="12" cy="9" r="6" />,
    line: (
      <>
        <circle cx="12" cy="9" r="6" />
        <path d="M12 15v6M9.5 21h5" />
        <path d="M9.5 8a3 3 0 0 1 2.5-2" />
      </>
    ),
  },
  profile: {
    soft: <path d="M5 20c.8-3.5 3.6-5 7-5s6.2 1.5 7 5H5Z" />,
    line: (
      <>
        <circle cx="12" cy="10" r="3.5" />
        <path d="M5 20c.8-3.5 3.6-5 7-5s6.2 1.5 7 5" />
        <path d="M9.500 4 12 5.500 14.500 4v3L12 5.500 9.500 7V4Z" />
      </>
    ),
  },
  settings: {
    soft: <circle cx="12" cy="12" r="5" />,
    line: (
      <>
        {PETALS.map((p) => (
          <circle key={`${p.cx}-${p.cy}`} cx={p.cx} cy={p.cy} r="2.6" />
        ))}
        <circle cx="12" cy="12" r="2" />
      </>
    ),
  },
  heart: { soft: <path d={HEART} />, line: <path d={HEART} /> },
  alert: {
    soft: <circle cx="12" cy="12" r="8.5" />,
    line: (
      <>
        <circle cx="12" cy="12" r="8.5" />
        <path d="M12 7.5V13M12 16.300v.2" />
      </>
    ),
  },
  check: { line: <path d="m5 12.5 4.5 4.5L19 7.5" /> },
  cross: { line: <path d="m6.5 6.5 11 11M17.5 6.5l-11 11" /> },
  clock: {
    soft: <circle cx="12" cy="12" r="8.5" />,
    line: (
      <>
        <circle cx="12" cy="12" r="8.5" />
        <path d="M12 7.5V12l3 2" />
      </>
    ),
  },
  minus: { line: <path d="M7 12h10" /> },
  play: {
    soft: <path d="M8 5.5v13l10.5-6.5L8 5.5Z" />,
    line: <path d="M8 5.5v13l10.5-6.5L8 5.5Z" />,
  },
  send: {
    soft: <path d="M4 11.5 20 5l-6.5 15-2.5-6.5-7-2Z" />,
    line: <path d="M4 11.5 20 5l-6.5 15-2.5-6.5-7-2Z" />,
  },
  bulb: {
    soft: <path d="M8.5 14a5.5 5.5 0 1 1 7 0c-.6.5-1 1.2-1 2h-5c0-.8-.4-1.5-1-2Z" />,
    line: (
      <>
        <path d="M9.5 17.5h5M10.5 20.5h3" />
        <path d="M8.5 14a5.5 5.5 0 1 1 7 0c-.6.5-1 1.2-1 2h-5c0-.8-.4-1.5-1-2Z" />
      </>
    ),
  },
  reset: {
    line: (
      <>
        <path d="M5.5 12a6.5 6.5 0 1 0 2-4.7" />
        <path d="M5 5v3.5h3.5" />
      </>
    ),
  },
  eye: {
    soft: <path d="M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6Z" />,
    line: (
      <>
        <path d="M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6Z" />
        <circle cx="12" cy="12" r="2.5" />
      </>
    ),
  },
  back: { line: <path d="M14.5 6 8.5 12l6 6" /> },
  // Streak: chama com um coração dentro e um brilhinho.
  flame: {
    soft: <path d={FLAME} />,
    line: (
      <>
        <path d={FLAME} />
        <path d="M12 17.500c-1.300-1-2.200-1.800-2.200-2.800a1.200 1.200 0 0 1 2.200-.6 1.200 1.200 0 0 1 2.200.6c0 1-.9 1.800-2.200 2.800Z" />
        <path d="M19.500 3v3M18 4.500h3" />
      </>
    ),
  },
  star: { soft: <path d={STAR} />, line: <path d={STAR} /> },
  crown: {
    soft: <path d={CROWN} />,
    line: (
      <>
        <path d={CROWN} />
        <path d="M5.5 18.5h13" />
      </>
    ),
  },
  // Conquista: medalha pendurada em um laço.
  medal: {
    soft: <circle cx="12" cy="15.500" r="4.500" />,
    line: (
      <>
        <circle cx="12" cy="15.500" r="4.500" />
        <path d="M8 3.500 12 6l4-2.500v5L12 6 8 8.500v-5Z" />
        <path d="M12 8v3" />
      </>
    ),
  },
  lock: {
    soft: <path d="M7 11h10v8.5H7z" />,
    line: (
      <>
        <path d="M7 11h10v8.5H7z" />
        <path d="M9 11V8a3 3 0 0 1 6 0v3" />
      </>
    ),
  },
  bow: {
    soft: <path d={BOW} />,
    line: (
      <>
        <path d={BOW} />
        <circle cx="12" cy="12" r="1.600" />
      </>
    ),
  },
  // ---- unidades da trilha
  hash: { line: <path d="M9.5 4 7.5 20M16.5 4l-2 16M4.5 9h16M3.5 15h16" /> },
  pointers: {
    line: (
      <>
        <path d="M3.500 12h6.500M7.500 9.500 10 12l-2.500 2.500" />
        <path d="M20.500 12H14M16.500 9.500 14 12l2.500 2.500" />
      </>
    ),
  },
  window: {
    soft: <path d="M8 8.500h9v7H8z" />,
    line: (
      <>
        <path d="M3 10h18v4H3z" />
        <path d="M8 8.500h9v7H8z" />
      </>
    ),
  },
  stack: {
    soft: <path d="m4 8 8-4 8 4-8 4-8-4Z" />,
    line: (
      <>
        <path d="m4 8 8-4 8 4-8 4-8-4Z" />
        <path d="m4 12 8 4 8-4M4 16l8 4 8-4" />
      </>
    ),
  },
  search: {
    soft: <circle cx="11" cy="11" r="6" />,
    line: (
      <>
        <circle cx="11" cy="11" r="6" />
        <path d="m15.500 15.500 4.500 4.500" />
      </>
    ),
  },
  link: {
    line: (
      <>
        <path d="M10 14a4 4 0 0 0 5.7 0l3-3A4 4 0 0 0 13 5.3l-1 1" />
        <path d="M14 10a4 4 0 0 0-5.7 0l-3 3A4 4 0 0 0 11 18.7l1-1" />
      </>
    ),
  },
  tree: {
    soft: (
      <>
        <circle cx="12" cy="6" r="2.500" />
        <circle cx="6.500" cy="17.500" r="2.500" />
        <circle cx="17.500" cy="17.500" r="2.500" />
      </>
    ),
    line: (
      <>
        <circle cx="12" cy="6" r="2.500" />
        <circle cx="6.500" cy="17.500" r="2.500" />
        <circle cx="17.500" cy="17.500" r="2.500" />
        <path d="M10.800 8.200 7.700 15.300M13.200 8.200l3.100 7.100" />
      </>
    ),
  },
  heap: {
    soft: <path d="M12 4 3.500 19.500h17L12 4Z" />,
    line: (
      <>
        <path d="M12 4 3.500 19.500h17L12 4Z" />
        <path d="M8.800 10.500h6.400M6 15h12" />
      </>
    ),
  },
  graph: {
    soft: (
      <>
        <circle cx="6" cy="7" r="2.300" />
        <circle cx="18" cy="6" r="2.300" />
        <circle cx="12" cy="13" r="2.300" />
        <circle cx="6.500" cy="19" r="2.300" />
        <circle cx="18" cy="18.500" r="2.300" />
      </>
    ),
    line: (
      <>
        <circle cx="6" cy="7" r="2.300" />
        <circle cx="18" cy="6" r="2.300" />
        <circle cx="12" cy="13" r="2.300" />
        <circle cx="6.500" cy="19" r="2.300" />
        <circle cx="18" cy="18.500" r="2.300" />
        <path d="M7.800 8.500 10.300 11.500M16.300 7.600 13.700 11.300M10.300 14.600 8 17.300M13.900 14.300l2.500 2.700" />
      </>
    ),
  },
  table: {
    soft: <path d="M9.300 9.700h5.400v4.600H9.300z" />,
    line: (
      <>
        <path d="M4 5h16v14H4z" />
        <path d="M4 9.700h16M4 14.300h16M9.300 5v14M14.700 5v14" />
      </>
    ),
  },
};

export function Icon({ name, size = 22 }: { name: IconName; size?: number }) {
  const drawing = drawings[name];
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className="icon">
      {drawing.soft && (
        <g fill="currentColor" fillOpacity={0.18} stroke="none">
          {drawing.soft}
        </g>
      )}
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {drawing.line}
      </g>
    </svg>
  );
}
