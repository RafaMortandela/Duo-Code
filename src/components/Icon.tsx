import type { ReactNode } from "react";

// Ícones provisórios de traço arredondado. O conjunto final "fofo" vem na spec 007;
// a API (`name`, `size`) já é a definitiva. As cores vêm de `currentColor`.

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
  | "lock";

const paths: Record<IconName, ReactNode> = {
  home: (
    <>
      <path d="M4 11.5 12 4l8 7.5" />
      <path d="M6.5 10v9h11v-9" />
      <path d="M12 16.5c-1.2-1-2-1.7-2-2.6a1.2 1.2 0 0 1 2-.8 1.2 1.2 0 0 1 2 .8c0 .9-.8 1.6-2 2.6Z" />
    </>
  ),
  trail: (
    <>
      <path d="M9 4 3.5 6v14L9 18l6 2 5.5-2V4L15 6 9 4Z" />
      <path d="M9 4v14M15 6v14" />
    </>
  ),
  review: (
    <>
      <circle cx="12" cy="9" r="6" />
      <path d="M12 15v6M9.5 21h5" />
      <path d="M9.5 8a3 3 0 0 1 2.5-2" />
    </>
  ),
  profile: (
    <>
      <circle cx="12" cy="9" r="3.5" />
      <path d="M5 20c.8-3.5 3.6-5 7-5s6.2 1.5 7 5" />
      <path d="M9 4.5 12 6l3-1.5" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="2.5" />
      <path d="M12 3.5v3M12 17.5v3M3.5 12h3M17.5 12h3M6 6l2.1 2.1M15.9 15.9 18 18M18 6l-2.1 2.1M8.1 15.9 6 18" />
    </>
  ),
  heart: (
    <path d="M12 20c-4.5-3.6-8-6.4-8-10.2A4.3 4.3 0 0 1 12 7a4.3 4.3 0 0 1 8 2.8c0 3.8-3.5 6.6-8 10.2Z" />
  ),
  alert: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V13M12 16.3v.2" />
    </>
  ),
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  cross: <path d="m6.5 6.5 11 11M17.5 6.5l-11 11" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  minus: <path d="M7 12h10" />,
  play: <path d="M8 5.5v13l10.5-6.5L8 5.5Z" />,
  send: <path d="M4 11.5 20 5l-6.5 15-2.5-6.5-7-2Z" />,
  bulb: (
    <>
      <path d="M9.5 17.500h5M10.500 20.500h3" />
      <path d="M8.500 14a5.500 5.500 0 1 1 7 0c-.6.5-1 1.200-1 2h-5c0-.8-.4-1.500-1-2Z" />
    </>
  ),
  reset: (
    <>
      <path d="M5.500 12a6.500 6.500 0 1 0 2-4.700" />
      <path d="M5 5v3.500h3.500" />
    </>
  ),
  eye: (
    <>
      <path d="M3 12s3.500-6 9-6 9 6 9 6-3.500 6-9 6-9-6-9-6Z" />
      <circle cx="12" cy="12" r="2.5" />
    </>
  ),
  back: <path d="M14.5 6 8.5 12l6 6" />,
  flame: (
    <path d="M12 3.5c1 3.5 5.5 5.5 5.5 10.5a5.5 5.5 0 0 1-11 0c0-2.200 1-3.800 2.200-5 .3 1.500 1 2.300 2 2.800-.2-2.800.1-5.800 1.300-8.300Z" />
  ),
  star: (
    <path d="m12 4 2.400 5 5.400.700-4 3.800 1 5.400L12 16.300l-4.800 2.600 1-5.400-4-3.800 5.400-.700L12 4Z" />
  ),
  crown: (
    <>
      <path d="M5 15 4 7.500l4.500 3.500L12 6l3.500 5L20 7.500 19 15H5Z" />
      <path d="M5.500 18.500h13" />
    </>
  ),
  medal: (
    <>
      <circle cx="12" cy="15" r="5" />
      <path d="M9.500 10.500 7.500 4h9l-2 6.500" />
    </>
  ),
  lock: (
    <>
      <path d="M7 11h10v8.500H7z" />
      <path d="M9 11V8a3 3 0 0 1 6 0v3" />
    </>
  ),
};

export function Icon({ name, size = 22 }: { name: IconName; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}
