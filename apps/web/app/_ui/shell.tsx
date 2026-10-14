import type { ReactNode } from "react";

// The step tracker on every screen (D-29), with the approved plain step names.
export const STEPS = [
  { href: "/start", name: "Your role and CV" },
  { href: "/found", name: "Your strongest material" },
  { href: "/sprint", name: "Build your stories" },
  { href: "/expects", name: "Check for gaps" },
  { href: "/claims", name: "Prepare for challenges" },
  { href: "/summary", name: "Where you stand" },
] as const;

export function Page({ step, title, children }: { step: number | null; title: string; children: ReactNode }) {
  return (
    <main className="page">
      {step !== null && (
        <nav aria-label="Your progress">
          <ol className="steps">
            {STEPS.map((s, i) => (
              <li key={s.href} className={i + 1 === step ? "here" : i + 1 < step ? "done" : ""} aria-current={i + 1 === step ? "step" : undefined}>
                {i + 1 < step ? <a href={s.href} style={{ color: "inherit", textDecoration: "none" }}>{i + 1}. {s.name}</a> : `${i + 1}. ${s.name}`}
              </li>
            ))}
          </ol>
        </nav>
      )}
      <h1>{title}</h1>
      {children}
    </main>
  );
}

export function NextStep({ href, children }: { href: string; children: ReactNode }) {
  return <p className="next"><a className="btn primary" href={href}>{children}</a></p>;
}
