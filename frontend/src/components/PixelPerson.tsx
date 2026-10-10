import { getAppearance } from "../game/appearances";

export function PixelPerson({ variant = 0 }: { variant?: number }) {
  return (
    <div
      aria-hidden="true"
      className={`pixel-person person-${variant}`}
      style={{ backgroundImage: `url("${getAppearance(variant).source}")` }}
    />
  );
}
