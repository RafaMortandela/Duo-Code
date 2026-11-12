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
  | "alert";

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
      <path d="M12 3.5v3M12 17.5v3M3.5 12h3M17.5 12h3M6 6l2.1 2.1M15.9 15.9 18 18M18 6l-2.1 2.1M8.100 15.9 6 18" />
    </>
  ),
  heart: (
    <path d="M12 20c-4.5-3.6-8-6.4-8-10.2A4.3 4.3 0 0 1 12 7a4.3 4.3 0 0 1 8 2.800c0 3.800-3.500 6.600-8 10.200Z" />
  ),
  alert: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.500v5.500M12 16.300v.2" />
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
