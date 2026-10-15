import { useGame } from "../stores/game";
import { currentMap } from "../game/navigation";
import { itemDefinitions } from "../game/items";
import { InventoryView } from "./InventoryView";

export function InventoryPanel() {
  const {
    state,
    world,
    inventoryItem,
    selectItem,
    quickItems,
    pinItem,
    navigate,
    command,
    busy,
    open,
    error,
    notice,
    noticePanel,
  } = useGame();
  if (!state || !world) return null;
  const owned = Object.keys(itemDefinitions).filter(
    (key) => state.inventory[key] > 0,
  );
  const item = inventoryItem || owned[0] || "seed";
  const count = state.inventory[item] || 0;
  const map = currentMap(world, state);
  const nearby = (id: string) => {
    const object = map.objects.find((o) => o.id === id);
    return (
      object &&
      Math.hypot(object.x - state.position.x, object.y - state.position.y) <= 65
    );
  };
  const plot = world.objects
    .filter((o) => o.kind === "plot" && !state.plots[o.id])
    .sort(
      (a, b) =>
        Math.hypot(a.x - state.position.x, a.y - state.position.y) -
        Math.hypot(b.x - state.position.x, b.y - state.position.y),
    )[0];
  const atCounter = !!nearby("workshop_counter");
  const atMarket = !!nearby("mira");
  let actionLabel = "查看相关委托",
    action = () => open("journal"),
    disabled = false;
  if (item === "seed") {
    actionLabel = plot && nearby(plot.id) ? "种下一颗种子" : "标记家园农田";
    disabled = !count || !plot;
    action = () => {
      if (!plot) return;
      if (nearby(plot.id)) void command("plant", { target: plot.id });
      else navigate({ mapId: "overworld", targetId: plot.id });
    };
  } else if (item === "wood") {
    actionLabel = atCounter ? "制作 1 块木板" : "标记工坊柜台";
    disabled = !count || (atCounter && count < 3);
    action = () => {
      if (atCounter) void command("craft", { target: "workshop_counter" });
      else navigate({ mapId: "workshop", targetId: "workshop_counter" });
    };
  } else if (item === "crop") {
    actionLabel = atCounter || atMarket
      ? `出售 · +${7 + state.buildings.workshop} 金币`
      : "标记风铃杂货铺";
    disabled = !count;
    action = () => {
      if (atCounter) void command("sell", { target: "workshop_counter" });
      else if (atMarket) void command("market_trade", { target: "mira", side: "sell", item: "crop", amount: 1 });
      else navigate({ mapId: "shop", targetId: "mira" });
    };
  } else if (item === "stone") {
    actionLabel = "标记小屋工作台";
    action = () => navigate({ mapId: "home", targetId: "home_desk" });
  }
  const reason = !count
    ? "暂未持有，收集后再使用或分配快捷栏。"
    : item === "seed" && !plot
      ? "农田已种满，等待成熟后收获。"
      : item === "wood" && atCounter && count < 3
        ? `还需要 ${3 - count} 份木材。`
        : undefined;
  return (
    <InventoryView
      quantities={state.inventory}
      selectedId={item}
      quickItems={quickItems}
      onSelect={selectItem}
      onBind={pinItem}
      pending={busy}
      error={error}
      notice={noticePanel === "inventory" ? notice : ""}
      growthSeconds={state.buildings.home >= 2 ? 45 : 60}
      action={{
        label: actionLabel,
        run: action,
        disabled: disabled || !count,
        reason,
        hint: actionLabel.startsWith("标记")
          ? "仅标记方向，请走近后互动。"
          : undefined,
      }}
    />
  );
}
