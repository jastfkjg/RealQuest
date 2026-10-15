import { useEffect, useRef, useState } from "react";
import { serverNow, useGame } from "../stores/game";
import { api } from "../services/api";
import { staminaNow } from "../game/stamina";
import type { GrowthOption, GrowthTarget } from "../types";
import { CharacterView } from "./CharacterView";

export function CharacterPanel() {
  const { state, command, busy } = useGame();
  const [now, setNow] = useState(serverNow);
  const [error, setError] = useState("");
  const [result, setResult] = useState("");
  const [syncing, setSyncing] = useState(false);
  const inFlight = useRef(false);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(serverNow()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  async function upgrade(target: GrowthTarget, option: GrowthOption) {
    if (inFlight.current || useGame.getState().busy) return;
    inFlight.current = true;
    setError("");
    setResult("");
    setSyncing(true);
    const capacity = target === "vitality" || target === "stamina";
    try {
      const ok = await command(
        capacity
          ? "health_spend"
          : option.currency === "knowledge_points"
            ? "knowledge_spend"
            : "skill_spend",
        {
          [capacity ? "target" : "branch"]: target,
          expected_invested: option.expected_invested,
        },
      );
      if (ok) setResult(useGame.getState().notice);
      else {
        const message = useGame.getState().error || "升级未保存，请稍后重试";
        try {
          useGame.getState().accept(await api("state"));
          setError(`${message}。已同步最新数据，请核对后再操作。`);
        } catch {
          setError(`${message}。暂时无法同步，重试不会重复扣点。`);
        }
      }
    } finally {
      setNow(serverNow());
      setSyncing(false);
      inFlight.current = false;
    }
  }
  if (!state?.character) return null;
  if (!state.character_growth_options || !state.vitality || !state.stamina) {
    return (
      <p className="hc-unavailable" role="alert">
        档案数据尚未就绪，请刷新页面并确认后端已更新。
      </p>
    );
  }
  return (
    <CharacterView
      character={state.character}
      vitality={state.vitality}
      stamina={{ current: staminaNow(state, now), max: state.stamina.max }}
      balances={{
        health_points: state.health_points || 0,
        knowledge_points: state.knowledge_points || 0,
        skill_points: state.skill_points || 0,
      }}
      options={state.character_growth_options}
      journal={state.life_journal}
      onOpenJournal={() => useGame.getState().open("activity")}
      onLocateNoah={() => {
        useGame.getState().open(null);
        useGame.getState().navigate({ mapId: "overworld", targetId: "noah" });
      }}
      busy={busy || syncing}
      error={error}
      result={result}
      onUpgrade={(target, option) => void upgrade(target, option)}
      onSelectionChange={() => {
        setError("");
        setResult("");
      }}
    />
  );
}
