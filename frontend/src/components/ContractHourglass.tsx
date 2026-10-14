import { useId } from "react";

/** Empty original raster frame with server-time-derived sand behind its glass. */
export function ContractHourglass({
  remainingRatio,
}: {
  remainingRatio: number;
}) {
  const id = useId().replace(/:/g, "");
  const ratio = Math.max(0, Math.min(1, remainingRatio));
  const upper = 74 - 43 * Math.sqrt(ratio);
  const lower = 124 - 43 * Math.sqrt(1 - ratio);
  return (
    <div
      className="contract-hourglass"
      data-remaining-ratio={ratio.toFixed(4)}
      aria-hidden="true"
    >
      <svg viewBox="0 0 100 150" className="contract-sand">
        <defs>
          <clipPath id={`${id}-upper`}>
            <path d="M31 30H69C77 38 72 49 62 58L53 68Q50 71 50 74Q50 71 47 68L38 58C28 49 23 38 31 30Z" />
          </clipPath>
          <clipPath id={`${id}-lower`}>
            <path d="M50 76C49 82 41 85 34 93C25 102 25 116 33 124H67C75 116 75 102 66 93C59 85 51 82 50 76Z" />
          </clipPath>
          <linearGradient id={`${id}-gold`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ffe197" />
            <stop offset="0.45" stopColor="#e6b556" />
            <stop offset="1" stopColor="#bb7927" />
          </linearGradient>
        </defs>
        <g clipPath={`url(#${id}-upper)`}>
          <rect
            x="23"
            y={upper}
            width="54"
            height={74 - upper}
            fill={`url(#${id}-gold)`}
          />
          {ratio > 0 && (
            <ellipse cx="50" cy={upper + 1} rx="27" ry="2" fill="#ffe6a3" />
          )}
        </g>
        <g clipPath={`url(#${id}-lower)`}>
          <rect
            x="23"
            y={lower}
            width="54"
            height={124 - lower}
            fill={`url(#${id}-gold)`}
          />
          {ratio < 1 && (
            <ellipse cx="50" cy={lower + 1} rx="27" ry="2" fill="#f4ce75" />
          )}
        </g>
        {ratio > 0 && (
          <path
            className="contract-sand-stream"
            d={`M50 73V${Math.max(78, lower)}`}
            stroke="#e8b855"
            strokeWidth="0.9"
            strokeDasharray="1 2"
          />
        )}
      </svg>
      <img
        src="/assets/hearthwood/commission-hourglass-v1.webp"
        width="1024"
        height="1536"
        alt=""
      />
    </div>
  );
}
