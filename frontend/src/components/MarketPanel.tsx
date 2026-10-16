import { residentPositions } from "../game/residents";
import { serverNow } from "../stores/game";
import { NpcPerson } from "./NpcPerson";
import { NpcSocial } from "./Residents";
import { useEffect, useState } from "react";
import {
  Check,
  MapPin,
  ShoppingBasket,
  Sprout,
  ClipboardList,
  Heart,
} from "lucide-react";
import { useGame } from "../stores/game";
import { api } from "../services/api";
import { MaterialIcon } from "./WorldPanels";
import { QuestDetails } from "./Quests";
import { itemNames } from "../game/items";

export function MarketPanel() {
  const {
    state,
    world,
    selected: selectedObject,
    dialogue,
    command,
    busy,
    navigate,
    accept,
  } = useGame();
  const [tab, setTab] = useState<"trade" | "orders" | "story" | "social">(
    "trade",
  );
  const [side, setSide] = useState<"buy" | "sell">("sell");
  const [selected, select] = useState("crop");
  const [amount, setAmount] = useState(1);
  const [orderPage, setOrderPage] = useState(0);
  const [socialPage, setSocialPage] = useState("chat");
  const [storyPage, setStoryPage] = useState("quest");
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
  const mira =
    world &&
    residentPositions(world, state, serverNow()).find((r) => r.id === "mira");
  const miraNear =
    !!mira &&
    mira.location === state.location &&
    Math.hypot(mira.x - state.position.x, mira.y - state.position.y) <= 72;
  const item = side === "buy" ? "seed" : selected;
  const price = market[side][item];
  const maximum =
    side === "buy"
      ? Math.floor(state.inventory.gold / price)
      : state.inventory[item];
  const enough = maximum >= amount;
  const target = selectedObject?.id === "mira" ? "mira" : "shop_counter";
  const trade = () =>
    void command("market_trade", { target, side, item, amount });
  const quests = state.quest_log.filter((q) => q.giver === "mira");
  const quest =
    quests.find((q) => q.status !== "claimed") || quests[quests.length - 1];
  return (
    <div className="market-layout">
      <aside className="market-keeper">
        <div className="market-vignette" aria-hidden="true">
          <img src="/assets/hearthwood/detail/interiors/bookcase.png" alt="" />
          <NpcPerson id="mira" />
          <img
            className="market-counter-art"
            src="/assets/hearthwood/market/counter.png"
            alt=""
          />
        </div>
        <span className="market-eyebrow">村里的小生意</span>
        <h3>米拉</h3>
        <p>杂货铺店主 · 熟悉度 {state.relationships.mira || 0}</p>
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
        <small>柜台全天可用 · 预设角色对话</small>
      </aside>
      <section className="market-content">
        <nav className="market-tabs" aria-label="小铺服务">
          {(
            [
              ["trade", "买卖物品"],
              ["orders", "村民订单"],
              ["story", "安家心愿"],
              ["social", "邻里日常"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              aria-pressed={tab === id}
              onClick={() => setTab(id)}
            >
              {id === "trade" ? (
                <ShoppingBasket size={16} aria-hidden="true" />
              ) : id === "orders" ? (
                <ClipboardList size={16} aria-hidden="true" />
              ) : id === "story" ? (
                <Sprout size={16} aria-hidden="true" />
              ) : (
                <Heart size={16} aria-hidden="true" />
              )}
              {label}
            </button>
          ))}
        </nav>
        {tab === "social" && (
          <div className="market-social" data-page={socialPage}>
            <nav className="market-subpages" aria-label="邻里书页">
              <button
                aria-pressed={socialPage === "chat"}
                onClick={() => setSocialPage("chat")}
              >
                聊聊日常
              </button>
              <button
                aria-pressed={socialPage === "kindness"}
                onClick={() => setSocialPage("kindness")}
              >
                送礼与帮忙
              </button>
            </nav>
            <h3>柜台边，也聊聊生活</h3>
            <p className="npc-reply">
              {state.npc_encounter?.id === "mira"
                ? dialogue
                : miraNear
                  ? "米拉就在柜台边，先打个招呼吧。"
                  : "米拉正在外面忙自己的生活。柜台照常接收收获和村民订单。"}
            </p>
            <NpcSocial id="mira" />
            {socialPage === "kindness" && (
              <small className="market-reset-note">
                每日限制按北京时间零点刷新。
              </small>
            )}
          </div>
        )}
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
            <nav className="market-order-pages" aria-label="订单翻页">
              <button
                disabled={orderPage === 0}
                onClick={() => setOrderPage(orderPage - 1)}
              >
                上一份
              </button>
              <span>
                订单 {orderPage + 1} / {market.orders.length}
              </span>
              <button
                disabled={orderPage + 1 >= market.orders.length}
                onClick={() => setOrderPage(orderPage + 1)}
              >
                下一份
              </button>
            </nav>
            {market.orders.slice(orderPage, orderPage + 1).map((order) => (
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
                        target,
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
          <div className="market-story" data-page={storyPage}>
            <nav className="market-subpages" aria-label="安家书页">
              <button
                aria-pressed={storyPage === "quest"}
                onClick={() => setStoryPage("quest")}
              >
                心愿委托
              </button>
              <button
                aria-pressed={storyPage === "home"}
                onClick={() => setStoryPage("home")}
              >
                小屋修缮
              </button>
            </nav>
            <span className="market-eyebrow">
              <Sprout size={17} />
              让小村庄，慢慢成为家
            </span>
            {!miraNear && (
              <p className="market-note">
                米拉外出时，剧情委托需要找到她当面聊。
                <button
                  onClick={() =>
                    navigate({
                      mapId: mira?.location || "shop",
                      targetId: "mira",
                    })
                  }
                >
                  标记米拉当前位置
                </button>
              </p>
            )}
            {quest && (
              <article>
                <h3>{quest.title}</h3>
                <fieldset disabled={!miraNear} className="market-story-actions">
                  <QuestDetails quest={quest} conversational />
                </fieldset>
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
