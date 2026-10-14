import { useEffect, useState } from "react";
import { Leaf } from "lucide-react";
import { serverNow, useGame } from "../stores/game";
import { staminaNow } from "../game/stamina";

export function StaminaBadge() {
  const { state, open } = useGame();
  const [now, setNow] = useState(serverNow);
  useEffect(() => {
    const id = setInterval(() => setNow(serverNow()), 1000);
    return () => clearInterval(id);
  }, []);
  if (!state) return null;
  const current = staminaNow(state, now),
    max = state.stamina?.max || 100;
  return (
    <button
      className="stamina-badge"
      aria-label={`体力 ${current}/${max}，打开行前手札`}
      onClick={() => open("training")}
      data-low={current < 6}
    >
      <Leaf size={16} aria-hidden="true" />
      <span>
        体力{" "}
        <b>
          {current}/{max}
        </b>
      </span>
      <i aria-hidden="true">
        <i style={{ transform: `scaleX(${current / max})` }} />
      </i>
    </button>
  );
}
