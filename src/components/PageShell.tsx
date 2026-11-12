import type { ReactNode } from "react";
import { Icon } from "./Icon";

export function PageShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <section className="page">
      <header>
        <h1>{title}</h1>
        {subtitle && <p className="page-subtitle">{subtitle}</p>}
      </header>
      {children}
    </section>
  );
}

/** Cartão de "ainda não tem nada aqui", usado pelas telas até suas specs chegarem. */
export function EmptyCard({ message }: { message: string }) {
  return (
    <div className="card empty">
      <Icon name="heart" size={32} />
      <p>{message}</p>
    </div>
  );
}
