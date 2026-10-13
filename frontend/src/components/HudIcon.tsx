/** Original 24×24 pixel geometry. Decorative; the native control owns its name. */
export type HudIconName =
  | "backpack"
  | "journal"
  | "sprout"
  | "map"
  | "sound"
  | "muted"
  | "menu"
  | "pin"
  | "energy";

export function HudIcon({ name }: { name: HudIconName }) {
  const art = {
    backpack: (
      <>
        <path
          fill="var(--hud-outline)"
          d="M8 2h8v3h3v4h2v12h-2v2H5v-2H3V9h2V5h3z"
        />
        <path
          fill="var(--rq-timber)"
          d="M9 3h6v3h-2V5h-2v1H9zM4 11h3v9H4zM17 11h3v9h-3z"
        />
        <path fill="var(--rq-moss)" d="M6 7h12v14H6z" />
        <path fill="var(--hud-leaf)" d="M6 6h12v6H6zM8 15h8v5H8z" />
        <path fill="var(--rq-amber)" d="M7 9h3v6H7zM14 9h3v6h-3zM9 17h6v1H9z" />
        <path fill="var(--hud-outline)" d="M8 11h1v2H8zM15 11h1v2h-1z" />
      </>
    ),
    journal: (
      <>
        <path fill="var(--hud-outline)" d="M2 4h8v1h4V4h8v17h-8v1h-4v-1H2z" />
        <path fill="var(--rq-timber)" d="M3 5h8v15H3zM13 5h8v15h-8z" />
        <path fill="var(--rq-linen)" d="M4 4h6v1h1v14H4zM13 5h1V4h6v15h-7z" />
        <path
          fill="var(--hud-page-line)"
          d="M5 7h4v1H5zM5 10h4v1H5zM5 13h4v1H5zM14 10h5v1h-5zM14 13h5v1h-5zM11 6h2v14h-2z"
        />
        <path fill="var(--rq-timber)" d="M17 3h2v6h-1V8h-1z" />
      </>
    ),
    sprout: (
      <>
        <path
          fill="var(--hud-outline)"
          d="M2 4h7v1h3v3h1V5h3V4h6v7h-2v2h-5v2h-1v7h-4v-8H6v-2H3V9H2z"
        />
        <path fill="var(--rq-timber)" d="M11 12h2v9h-2z" />
        <path
          fill="var(--hud-leaf)"
          d="M3 5h6v1h2v5H6V9H4V8H3zM14 7h2V5h5v5h-2v2h-5z"
        />
        <path
          fill="var(--rq-moss)"
          d="M5 7h2v1h2v2h2v2H9v-1H7V9H5zM14 10h2V8h3v1h-2v2h-2v2h-2v-2h1z"
        />
      </>
    ),
    map: (
      <>
        <path
          fill="var(--hud-outline)"
          d="M2 5h2V4h4V3h2v1h5V3h5V2h2v17h-2v1h-4v1h-2v-1H9v1H4v1H2z"
        />
        <path
          fill="var(--rq-linen)"
          d="M4 6h3V5h2v13H7v1H4zM10 6h4v13h-4zM16 5h3V4h1v13h-2v1h-2z"
        />
        <path
          fill="var(--hud-leaf)"
          d="M5 9h3v3H5zM11 13h2v3h-2zM17 7h2v3h-2z"
        />
        <path
          fill="var(--rq-timber)"
          d="M7 14h2v1H7zM10 11h4v1h-4zM16 12h2v1h-2z"
        />
      </>
    ),
    sound: (
      <>
        <path
          fill="currentColor"
          d="M2 9h4V7h2V5h3V4h2v16h-2v-1H8v-2H6v-2H2zm2 2v2h4v2h2V9H8v2zm11-4h2v2h1v6h-1v2h-2v-3h1v-4h-1zm4-3h2v3h1v10h-1v3h-2v-4h1V8h-1z"
        />
      </>
    ),
    muted: (
      <>
        <path
          fill="currentColor"
          d="M2 9h4V7h2V5h3V4h2v16h-2v-1H8v-2H6v-2H2zm2 2v2h4v2h2V9H8v2zm12-2h2v2h2V9h2v2h-2v2h2v2h-2v-2h-2v2h-2v-2h2v-2h-2z"
        />
      </>
    ),
    menu: (
      <path fill="currentColor" d="M4 5h16v3H4zM4 11h16v3H4zM4 17h16v3H4z" />
    ),
    pin: (
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M8 2h8v2h3v3h2v8h-2v3h-3v3h-3v2h-2v-2H8v-3H5v-3H3V7h2V4h3zm1 5H7v7h2v2h6v-2h2V7h-2V5H9zm1 1h4v5h-4z"
      />
    ),
    energy: (
      <>
        <path
          fill="var(--hud-outline)"
          d="M12 1h7v3h-2v3h-2v2h6v5h-3v3h-3v3h-3v3H7v-5h2v-3H3v-5h3V7h3V4h3z"
        />
        <path
          fill="var(--rq-amber)"
          d="M13 3h3v1h-1v3h-2v4h6v2h-3v3h-3v3h-3v1H9v-2h2v-5H5v-2h3V8h3V5h2z"
        />
        <path fill="var(--rq-linen)" d="M12 6h2v2h-2v3h-2V9h2zM7 11h3v1H7z" />
      </>
    ),
  };
  return (
    <svg
      className={`hud-icon hud-icon-${name}`}
      viewBox="0 0 24 24"
      width="24"
      height="24"
      aria-hidden="true"
      focusable="false"
      shapeRendering="crispEdges"
    >
      {art[name]}
    </svg>
  );
}
