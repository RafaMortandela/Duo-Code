import { NavLink } from "react-router-dom";
import { copy } from "../copy";
import { useProgress } from "../progress/ProgressProvider";
import { Icon, type IconName } from "./Icon";

const items: { to: string; label: string; icon: IconName }[] = [
  { to: "/", label: copy.nav.home, icon: "home" },
  { to: "/trail", label: copy.nav.trail, icon: "trail" },
  { to: "/review", label: copy.nav.review, icon: "review" },
  { to: "/profile", label: copy.nav.profile, icon: "profile" },
  { to: "/settings", label: copy.nav.settings, icon: "settings" },
];

export function Sidebar() {
  const { progress } = useProgress();
  return (
    <aside className="sidebar">
      <div className="brand">
        <span className="brand-mark" aria-hidden="true">
          <Icon name="bow" size={26} />
        </span>
        <span className="brand-name">{copy.app.name}</span>
      </div>
      <nav className="nav" aria-label={copy.nav.label}>
        {items.map((item) => (
          <NavLink key={item.to} to={item.to} end className="nav-link">
            <Icon name={item.icon} />
            {item.label}
          </NavLink>
        ))}
      </nav>
      {progress && (
        <div
          className="sidebar-streak"
          data-state={progress.streak.state}
          title={copy.home.state[progress.streak.state]}
        >
          <Icon name="flame" size={20} />
          {copy.streak.sidebar(progress.streak.current)}
        </div>
      )}
    </aside>
  );
}
