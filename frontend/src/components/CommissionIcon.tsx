import type { LifeTask } from "../types";

/** Original integer-grid pixel objects; native controls provide accessible names. */
export function CommissionIcon({ kind }: { kind: LifeTask["kind"] }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="commission-icon"
      shapeRendering="crispEdges"
    >
      {kind === "study" ? (
        <>
          <path fill="var(--rq-ink)" d="M2 4h8v1h4V4h8v17h-8v1h-4v-1H2z" />
          <path fill="var(--rq-timber)" d="M3 5h8v15H3zM13 5h8v15h-8z" />
          <path
            fill="var(--rq-linen-raised)"
            d="M4 4h6v1h1v14H4zM13 5h1V4h6v15h-7z"
          />
          <path
            fill="var(--rq-timber)"
            d="M5 7h4v1H5zM5 10h4v1H5zM5 13h4v1H5zM14 7h5v1h-5zM14 10h5v1h-5zM14 13h5v1h-5zM11 6h2v14h-2z"
          />
          <path fill="var(--rq-moss)" d="M17 3h2v6h-1V8h-1z" />
        </>
      ) : kind === "exercise" ? (
        <>
          <path
            fill="var(--rq-ink)"
            d="M5 2h6v12h2v2h1v6H1v-6h2v-3h2zM15 3h6v11h2v8h-8v-2h-1v-6h1z"
          />
          <path
            fill="var(--rq-timber)"
            d="M6 3h4v12h2v2h1v3H2v-3h2v-3h2zM16 4h4v11h2v5h-7v-6h1z"
          />
          <path
            fill="var(--rq-amber)"
            d="M7 4h2v2H7zM7 8h3v1H7zM7 11h3v1H7zM17 5h2v2h-2zM17 9h3v1h-3zM17 12h3v1h-3z"
          />
          <path fill="var(--rq-ink-muted)" d="M2 19h11v2H2zM15 19h7v2h-7z" />
        </>
      ) : (
        <>
          <path
            fill="var(--rq-ink)"
            d="M13 1h5v2h3v3h2v4h-2v2h-4v-2h-2l-1 2-9 11H2v-4L12 8l-2-2V3h3z"
          />
          <path fill="var(--rq-timber)" d="M13 9l2 2L5 22H3v-2z" />
          <path
            fill="var(--rq-control-border)"
            d="M14 2h3v2h3v3h2v2h-2v2h-2V9h-3l-4-4V4h3z"
          />
          <path fill="var(--rq-linen-raised)" d="M14 3h2v2h3v2h-2z" />
        </>
      )}
    </svg>
  );
}
