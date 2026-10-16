// Visible progress while background work runs: done steps ticked, the current one
// spinning, later ones waiting. Shows the app is live and what it is doing.
export function Working({ steps, current, detail }: { steps: string[]; current: number; detail?: string }) {
  return (
    <div className="working card" role="status" aria-live="polite">
      {steps.map((s, i) => (
        <div key={s} className={`p ${i < current ? "done" : i === current ? "" : "todo"}`}>
          {i < current ? <span className="tick">✓</span> : i === current ? <span className="spinner" aria-hidden /> : <span className="tick">·</span>}
          <span>{s}{i === current && detail ? ` (${detail})` : ""}</span>
        </div>
      ))}
    </div>
  );
}

export function Spinner({ text }: { text: string }) {
  return <p className="working" role="status"><span className="p"><span className="spinner" aria-hidden /> {text}</span></p>;
}
