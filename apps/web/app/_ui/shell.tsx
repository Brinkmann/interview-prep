import type { ReactNode } from "react";

// The app shell (D-40): step rail with progress, a "What to do here" box, content, and a
// bar fixed to the bottom with one primary action. Step names as approved (D-29).
export const STEPS = [
  { href: "/start", name: "Your role and CV", minutesLeft: 30 },
  { href: "/found", name: "Your strongest material", minutesLeft: 28 },
  { href: "/sprint", name: "Build your stories", minutesLeft: 22 },
  { href: "/expects", name: "Check for gaps", minutesLeft: 10 },
  { href: "/claims", name: "Prepare for challenges", minutesLeft: 6 },
  { href: "/summary", name: "Where you stand", minutesLeft: 2 },
] as const;

export function Page({ step, title, task, children, bar }: {
  step: number | null; title: string; task?: string[]; children: ReactNode; bar?: ReactNode;
}) {
  return (
    <div className="shell">
      <nav className="rail" aria-label="Your progress">
        <div className="brand">Interview Prep</div>
        <ol className="steps">
          {STEPS.map((s, i) => {
            const n = i + 1;
            const state = step === null ? "" : n === step ? "here" : n < step ? "done" : "";
            const inner = <><span className="dot">{state === "done" ? "✓" : n}</span><span className="name">{s.name}</span></>;
            return (
              <li key={s.href} className={state}>
                {state === "done" ? <a href={s.href}>{inner}</a> : <span className="step" aria-current={state === "here" ? "step" : undefined}>{inner}</span>}
              </li>
            );
          })}
        </ol>
        <p className="time">{step ? `About ${STEPS[step - 1]!.minutesLeft} minutes left` : "About 30 minutes in all"}</p>
      </nav>
      <main className="main">
        <div className="content">
          {step !== null && <p className="eyebrow">Step {step} of 6</p>}
          <h1>{title}</h1>
          {task && (
            <section className="task" aria-label="What to do here">
              <b>What to do here</b>
              <ol>{task.map((t) => <li key={t}>{t}</li>)}</ol>
            </section>
          )}
          {children}
        </div>
        {bar}
      </main>
    </div>
  );
}

// The bottom bar: Back on the left with a short status line, one primary action on the right.
export function ActionBar({ back, hint, next }: {
  back?: string; hint?: ReactNode; next?: { href: string; text: string; disabled?: boolean } | ReactNode;
}) {
  const isLink = next && typeof next === "object" && "href" in (next as object);
  const link = next as { href: string; text: string; disabled?: boolean };
  return (
    <div className="actionbar">
      <div className="inner">
        <div className="row">
          {back && <a className="btn quiet" href={back}>Back</a>}
          {hint && <span className="hint">{hint}</span>}
        </div>
        {isLink ? (
          <a className="btn primary" href={link.disabled ? undefined : link.href} aria-disabled={link.disabled ? "true" : undefined}>{link.text}</a>
        ) : (next as ReactNode)}
      </div>
    </div>
  );
}
