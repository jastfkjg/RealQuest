import { useEffect, useState } from "react";
import { Check, MapPin, ShoppingBasket, Sprout } from "lucide-react";
import { useGame } from "../stores/game";
import { api } from "../services/api";
import { MaterialIcon } from "./WorldPanels";
import { PixelPerson } from "./PixelPerson";
import { QuestDetails } from "./Quests";
import { itemNames } from "../game/items";

export function MarketPanel() {
  const { state, command, busy, navigate, accept } = useGame();
  const [tab, setTab] = useState<"trade" | "orders" | "story">("trade");
  const [side, setSide] = useState<"buy" | "sell">("sell");
  const [selected, select] = useState("crop");
  const [amount, setAmount] = useState(1);
  // Refresh dated offers while open, including a midnight rollover. The server
  // still validates the date on every delivery; failed refresh never grants.
  useEffect(() => {
    let mounted = true;
    const refresh = () =>
      void api("state")
        .then((r) => {
          if (mounted) accept(r);
        })
        .catch(() => {});
    const timer = setInterval(refresh, 30000);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, [accept]);
  if (!state?.market) return <p>小铺正在整理货架，请稍后重新打开。</p>;
  const market = state.market;
  const item = side === "buy" ? "seed" : selected;
  const price = market[side][item];
  const maximum =
    side === "buy"
      ? Math.floor(state.inventory.gold / price)
      : state.inventory[item];
  const enough = maximum >= amount;
  const trade = () =>
    void command("market_trade", { target: "mira", side, item, amount });
  const quests = state.quest_log.filter((q) => q.giver === "mira");
  const quest =
    quests.find((q) => q.status !== "claimed") || quests[quests.length - 1];
  return (
    <div className="market-layout">
      <aside className="market-keeper">
        <div className="market-vignette" aria-hidden="true">
          <img src="/assets/hearthwood/detail/interiors/bookcase.png" alt="" />
          <PixelPerson variant={5} />
          <img
            className="market-counter-art"
            src="/assets/hearthwood/market/counter.png"
            alt=""
          />
        </div>
        <span className="market-eyebrow">村里的小生意</span>
        <h3>米拉</h3>
        <p>杂货铺店主 · 关系 {state.relationships.mira || 0}</p>
        <blockquote>
          {tab === "orders"
            ? "村里的需要，都写在这些纸条上。慢慢备齐，不着急。"
            : tab === "story"
              ? "把日子过成自己喜欢的样子，就是最好的收获。"
              : "新鲜收获、结实木料，我都收。带点种子回家吧。"}
        </blockquote>
        <div className="market-wallet">
          <MaterialIcon item="gold" />
          <span>
            钱袋
            <strong>
              {state.inventory.gold} <small>金币</small>
            </strong>
          </span>
        </div>
        <small>每天都开门 · 预设角色对话</small>
      </aside>
      <section className="market-content">
        <nav className="market-tabs" aria-label="小铺服务">
          {(
            [
              ["trade", "买卖物品"],
              ["orders", "村民订单"],
              ["story", "安家心愿"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              aria-pressed={tab === id}
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          ))}
        </nav>
        {tab === "trade" && (
          <div className="market-trade">
            <div className="market-heading">
              <h3>
                <ShoppingBasket size={19} />
                挑一份，谈笔小生意
              </h3>
              <div className="market-switch" role="group" aria-label="交易方向">
                <button
                  aria-pressed={side === "sell"}
                  onClick={() => {
                    setSide("sell");
                    setAmount(1);
                  }}
                >
                  我要卖
                </button>
                <button
                  aria-pressed={side === "buy"}
                  onClick={() => {
                    setSide("buy");
                    setAmount(1);
                  }}
                >
                  我要买
                </button>
              </div>
            </div>
            <div
              className="market-goods"
              aria-label={side === "sell" ? "可出售物品" : "小铺货架"}
            >
              {Object.entries(market[side]).map(([id, value]) => (
                <button
                  key={id}
                  aria-pressed={item === id}
                  onClick={() => {
                    select(id);
                    setAmount(1);
                  }}
                  aria-label={`选择${itemNames[id]}，每份 ${value} 金币`}
                >
                  <MaterialIcon item={id} />
                  <strong>{itemNames[id]}</strong>
                  <span>{value} 金币 / 份</span>
                  <small>背包 {state.inventory[id]}</small>
                </button>
              ))}
            </div>
            <div className="market-deal">
              <div className="market-selected">
                <MaterialIcon item={item} />
                <div>
                  <h4>
                    {side === "sell" ? "出售" : "买入"}
                    {itemNames[item]}
                  </h4>
                  <p>
                    每份 {price} 金币 · 背包有 {state.inventory[item]} 份
                  </p>
                </div>
              </div>
              <label className="market-quantity">
                交易数量
                <select
                  aria-label="交易数量"
                  value={amount}
                  disabled={busy}
                  onChange={(e) => setAmount(Number(e.target.value))}
                >
                  {[1, 5, 10].map((n) => (
                    <option key={n} value={n}>
                      {n} 份
                    </option>
                  ))}
                </select>
              </label>
              <p className="market-total">
                {side === "sell" ? "将获得" : "将花费"}
                <strong>{price * amount} 金币</strong>
                <span>
                  成交后余额{" "}
                  {enough
                    ? state.inventory.gold +
                      (side === "sell" ? 1 : -1) * price * amount
                    : "—"}
                </span>
              </p>
              <button
                className="primary market-confirm"
                disabled={busy || !enough}
                onClick={trade}
              >
                {busy
                  ? "正在记账…"
                  : !enough
                    ? side === "sell"
                      ? "背包数量不足"
                      : "金币不足"
                    : `${side === "sell" ? "确认出售" : "确认买入"} ${amount} 份${itemNames[item]}`}
              </button>
            </div>
            <p className="market-note">
              {side === "buy"
                ? "家园南侧有六块田。收获两份萝卜时，还会留下一份种子。"
                : "先看看村民订单，交付整份材料能获得更多酬谢。修缮小屋也需要木材和石料，记得留一些。"}
            </p>
          </div>
        )}
        {tab === "orders" && (
          <div className="market-orders">
            <div className="market-heading">
              <h3>今天，帮谁一个小忙？</h3>
              <small>{market.date} · 北京时间</small>
            </div>
            <p>每份每天可交付一次，直接扣除所需物品；明天再来，也没关系。</p>
            {market.orders.map((order) => (
              <article
                key={order.id}
                className="market-order"
                data-complete={order.completed}
                aria-label={order.title}
              >
                <MaterialIcon item={order.item} />
                <div>
                  <h4>{order.title}</h4>
                  <p>{order.note}</p>
                  <span>
                    需要 {order.amount} {itemNames[order.item]} · 持有{" "}
                    {state.inventory[order.item]}
                  </span>
                </div>
                <div className="market-order-action">
                  <strong>{order.gold} 金币</strong>
                  <button
                    className={order.completed ? "" : "primary"}
                    disabled={
                      busy ||
                      order.completed ||
                      state.inventory[order.item] < order.amount
                    }
                    onClick={() =>
                      void command("market_deliver", {
                        target: "mira",
                        order_id: order.id,
                        date: market.date,
                      })
                    }
                  >
                    {order.completed ? (
                      <>
                        <Check size={15} />
                        今日已交付
                      </>
                    ) : busy ? (
                      "正在交付…"
                    ) : state.inventory[order.item] < order.amount ? (
                      "材料未备齐"
                    ) : (
                      "交付这份订单"
                    )}
                  </button>
                  {!order.completed &&
                    state.inventory[order.item] < order.amount && (
                      <button
                        onClick={() =>
                          navigate({
                            mapId: "overworld",
                            targetId:
                              order.item === "wood"
                                ? "wood_1"
                                : order.item === "stone"
                                  ? "stone_1"
                                  : "plot_0",
                          })
                        }
                      >
                        <MapPin size={14} aria-hidden="true" />
                        {order.item === "crop" ? "标记农田" : "标记采集点"}
                      </button>
                    )}
                </div>
              </article>
            ))}
            <p className="market-note">
              累计完成 {state.stats.deliveries || 0} 份订单 · 小铺累计收入{" "}
              {state.stats.trade_income || 0} 金币
            </p>
          </div>
        )}
        {tab === "story" && (
          <div className="market-story">
            <span className="market-eyebrow">
              <Sprout size={17} />
              让小村庄，慢慢成为家
            </span>
            {quest && (
              <article>
                <h3>{quest.title}</h3>
                <QuestDetails quest={quest} conversational />
              </article>
            )}
            <div className="market-home-goal">
              <h4>下一次播种，更早收获</h4>
              <p>
                {state.buildings.home >= 2
                  ? "小屋已完成第一轮修缮，新种的萝卜 45 秒成熟。"
                  : "小屋升至 2 级：6 木材、3 石料、10 金币。新种的萝卜从 60 秒缩短至 45 秒成熟。"}
              </p>
              <button
                onClick={() =>
                  navigate({ mapId: "home", targetId: "home_desk" })
                }
              >
                <MapPin size={16} />
                标记家园升级手册
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
