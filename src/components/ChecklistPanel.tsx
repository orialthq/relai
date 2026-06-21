import { useEffect, useRef, useState } from "react";
import type { AppState } from "../types";

export function ChecklistPanel({ state }: { state: AppState }) {
  const [pulsing, setPulsing] = useState<Set<string>>(new Set());
  const prevChecked = useRef<Set<string>>(new Set());

  useEffect(() => {
    const nowChecked = new Set<string>();
    state.checklists.forEach((cl) =>
      cl.items.forEach((it) => {
        if (it.checked) nowChecked.add(it.id);
      })
    );
    const justChecked: string[] = [];
    nowChecked.forEach((id) => {
      if (!prevChecked.current.has(id)) justChecked.push(id);
    });
    prevChecked.current = nowChecked;

    if (justChecked.length > 0) {
      setPulsing((prev) => new Set([...prev, ...justChecked]));
      const t = setTimeout(() => {
        setPulsing((prev) => {
          const next = new Set(prev);
          justChecked.forEach((id) => next.delete(id));
          return next;
        });
      }, 1400);
      return () => clearTimeout(t);
    }
  }, [state.checklists]);

  return (
    <section className="panel">
      <header className="panel-head">
        <h2 className="panel-title">회의록</h2>
        <span className="panel-tag">relay가 자동으로 체크</span>
      </header>
      <div className="checklists">
        {state.checklists.map((cl) => (
          <div key={cl.id} className="checklist">
            <div className="checklist-name">{cl.name}</div>
            <ul className="checklist-items">
              {cl.items.map((it) => (
                <li
                  key={it.id}
                  className={`cl-item ${it.checked ? "cl-item--done" : ""} ${
                    pulsing.has(it.id) ? "cl-item--pulse" : ""
                  }`}
                >
                  <span className="cl-box">{it.checked ? "✓" : ""}</span>
                  <span className="cl-label">{it.label}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
