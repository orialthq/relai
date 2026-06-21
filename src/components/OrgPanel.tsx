import type { AppState } from "../types";

export function OrgPanel({ state }: { state: AppState }) {
  const roots = state.org.filter((n) => n.parentId === null);
  const childrenOf = (id: string) => state.org.filter((n) => n.parentId === id);
  const membersOf = (id: string) => state.members.filter((m) => m.nodeId === id);

  return (
    <section className="panel">
      <header className="panel-head">
        <h2 className="panel-title">조직</h2>
        <span className="panel-tag">relay가 타고 흐르는 구조</span>
      </header>
      <div className="org-tree">
        {roots.map((root) => (
          <div key={root.id} className="org-root">
            <div className="org-node org-node--root">
              <span className="org-dot" />
              {root.name}
            </div>
            <div className="org-children">
              {childrenOf(root.id).map((child) => (
                <div key={child.id} className="org-node org-node--child">
                  <div className="org-node-label">
                    <span className="org-dot org-dot--child" />
                    {child.name}
                  </div>
                  <div className="org-members">
                    {membersOf(child.id).map((m) => (
                      <span key={m.id} className="chip">
                        {m.name}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
