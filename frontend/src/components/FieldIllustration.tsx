import { itemDefinitions } from "../game/items";
import { useState, type ReactNode } from "react";

export function FieldPage({
  label,
  children,
  notes,
}: {
  label: string;
  children: ReactNode;
  notes?: ReactNode;
}) {
  const [page, turn] = useState("main");
  return (
    <section className="field-paper" aria-label={label}>
      {notes && (
        <nav className="field-tabs" aria-label="查看书页">
          <button aria-pressed={page === "main"} onClick={() => turn("main")}>
            {label}
          </button>
          <button aria-pressed={page === "notes"} onClick={() => turn("notes")}>
            行前手记
          </button>
        </nav>
      )}
      <div className="field-page-content">
        {page === "main" ? children : notes}
      </div>
    </section>
  );
}

/** Existing project-owned props, with original CSS stonework around the route. */
export function FieldIllustration({
  kind,
}: {
  kind: "spell" | "cave" | "gate";
}) {
  return (
    <aside
      className={`field-illustration field-illustration--${kind}`}
      aria-hidden="true"
    >
      {kind === "spell" ? (
        <>
          <img
            className="field-magic-art"
            src="/assets/hearthwood/character/magic.webp"
            alt=""
          />
          <img
            className="field-book-art"
            src="/assets/hearthwood/detail/interiors/book.png"
            alt=""
          />
        </>
      ) : (
        <>
          <div className="field-stone-arch">
            <span />
          </div>
          <img
            className="field-stone-art"
            src="/assets/hearthwood/village/stone.png"
            alt=""
          />
          <img
            className="field-key-art"
            src={itemDefinitions.gate_stone.icon}
            alt=""
          />
        </>
      )}
    </aside>
  );
}
