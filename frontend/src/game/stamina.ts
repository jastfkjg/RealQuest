import type { GameState } from "../types";

export function staminaNow(state: GameState, now: number) {
  const stamina = state.stamina;
  if (!stamina) return 100;
  const step = state.stamina_rules?.seconds_per_point || 720;
  return Math.min(
    stamina.max,
    stamina.current +
      Math.max(0, Math.floor((now - stamina.updated_at) / step)),
  );
}
