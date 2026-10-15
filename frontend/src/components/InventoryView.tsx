import { useId, useRef, useState } from "react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Info,
  Backpack,
  Leaf,
  MapPin,
  Sparkles,
  Sprout,
  Wheat,
  Zap,
} from "lucide-react";
import { inventoryTraySlots, itemDefinitions } from "../game/items";
import type { ItemDefinition } from "../game/items";

export function GameButton({
  pending,
  children,
  className = "",
  disabled,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { pending?: boolean }) {
  return (
    <button
      {...props}
      className={`rq-button ${className}`}
      disabled={disabled || pending}
      aria-busy={pending || undefined}
    >
      {pending ? "处理中…" : children}
    </button>
  );
}

export function ItemIcon({
  item,
  size = 32,
}: {
  item: ItemDefinition;
  size?: 32 | 48;
}) {
  return (
    <img
      className="rq-pixel-art hw-item-icon"
      src={item.icon}
      width={size}
      height={size}
      alt=""
      draggable={false}
    />
  );
}

export function ItemSlot({
  item,
  count = 0,
  selected,
  binding,
  onClick,
}: {
  item?: ItemDefinition;
  count?: number;
  selected?: boolean;
  binding?: number;
  onClick?: () => void;
}) {
  if (!item) return <div className="rq-item-slot hw-slot" aria-hidden="true" />;
  return (
    <button
      className="rq-item-slot hw-slot"
      data-selected={!!selected}
      data-depleted={count <= 0}
      aria-pressed={!!selected}
      aria-label={`${item.name}，数量 ${count}${binding ? `，快捷栏 ${binding}` : ""}`}
      onClick={onClick}
    >
      <ItemIcon item={item} size={48} />
      <b className="hw-count rq-numeric">{count}</b>
      {binding && <span className="hw-binding">{binding}</span>}
      {selected && <span className="hw-selection-corners" aria-hidden="true" />}
    </button>
  );
}

export function InventoryWallet({
  gold,
  energy,
  shards,
}: {
  gold: number;
  energy: number;
  shards: number;
}) {
  return (
    <div
      className="hw-wallet rq-numeric"
      aria-label="随身货币与特殊资源"
      data-expanded={energy > 0 || shards > 0 || gold >= 100000}
    >
      <span>
        <img
          className="rq-pixel-art"
          src="/assets/hearthwood/detail/items/gold.png"
          width="16"
          height="16"
          alt=""
        />
        <b>{gold}</b>
        <small className="hw-sr-only">金币</small>
      </span>
      {energy > 0 && (
        <span>
          <Zap size={16} aria-hidden="true" />
          <b>{energy}</b>
          <small>能量</small>
        </span>
      )}
      {shards > 0 && (
        <span>
          <Sparkles size={16} aria-hidden="true" />
          <b>{shards}</b>
          <small>知识碎片</small>
        </span>
      )}
    </div>
  );
}

export function InventoryTip() {
  const id = useId();
  return (
    <span className="hw-tip">
      <button
        type="button"
        className="hw-help"
        aria-label="快捷栏说明"
        aria-describedby={id}
      >
        <Info size={18} />
      </button>
      <span role="tooltip" id={id}>
        点选口袋分配当前物品，数量不变。在世界中按 1–4
        打开背包查看。空口袋仍保留原来的快捷绑定。
      </span>
    </span>
  );
}

export interface InventoryViewProps {
  quantities: Record<string, number>;
  selectedId: string;
  quickItems: string[];
  onSelect: (id: string) => void;
  onBind: (id: string, index: number) => void;
  action: {
    label: string;
    run: () => void;
    disabled?: boolean;
    reason?: string;
    hint?: string;
  };
  pending?: boolean;
  error?: string;
  notice?: string;
  growthSeconds: number;
  definitions?: Record<string, ItemDefinition>;
}

export function InventoryView({
  quantities,
  selectedId,
  quickItems,
  onSelect,
  onBind,
  action,
  pending,
  error,
  notice,
  growthSeconds,
  definitions = itemDefinitions,
}: InventoryViewProps) {
  const [filter, setFilter] = useState("全部");
  const [detailView, setDetailView] = useState(false);
  const [bindingNotice, setBindingNotice] = useState("");
  const detailTab = useRef<HTMLButtonElement>(null);
  const trayTab = useRef<HTMLButtonElement>(null);
  const owned = Object.keys(definitions).filter((id) => quantities[id] > 0);
  const visible = owned.filter(
    (id) => filter === "全部" || definitions[id].group === filter,
  );
  const item = definitions[selectedId];
  const count = quantities[selectedId] || 0;
  const showDetails = () => {
    setDetailView(true);
    requestAnimationFrame(() => detailTab.current?.focus());
  };
  const select = (id: string) => {
    onSelect(id);
    setBindingNotice("");
    if (window.matchMedia("(max-width: 700px)").matches) showDetails();
  };
  const bind = (index: number) => {
    if (!item || count <= 0) return;
    onBind(selectedId, index);
    setBindingNotice(`已将${item.name}放入快捷栏 ${index + 1}，数量不变。`);
  };
  const belt: ReactNode = (
    <section className="hw-belt" aria-label="快捷栏分配">
      <div className="hw-section-line">
        <h3>
          快捷
          <br />
          口袋
        </h3>
        <InventoryTip />
      </div>
      <div className="hw-belt-slots">
        {quickItems.map((id, index) => {
          const definition = definitions[id];
          const ownedCount = quantities[id] || 0;
          return (
            <button
              key={index}
              disabled={!item || count <= 0}
              aria-label={`将${item?.name || "物品"}放入快捷栏 ${index + 1}`}
              aria-description={`当前绑定${definition?.name || "空位"}，${ownedCount > 0 ? `数量 ${ownedCount}` : "暂未持有"}`}
              title={`${index + 1} · ${definition?.name || "空位"}${ownedCount > 0 ? ` × ${ownedCount}` : "（暂未持有）"}`}
              aria-pressed={id === selectedId && ownedCount > 0}
              className="hw-quick-slot"
              data-depleted={ownedCount <= 0}
              onClick={() => bind(index)}
            >
              <kbd>{index + 1}</kbd>
              {definition && ownedCount > 0 ? (
                <ItemIcon item={definition} size={48} />
              ) : (
                <span className="hw-quick-empty" aria-hidden="true"></span>
              )}
              <span className="hw-sr-only">{definition?.name || "空位"}</span>
              {ownedCount > 0 && (
                <small className="rq-numeric">{ownedCount}</small>
              )}
              {id === selectedId && ownedCount > 0 && (
                <Check
                  size={12}
                  className="hw-bound-check"
                  aria-hidden="true"
                />
              )}
            </button>
          );
        })}
      </div>
      <p className="hw-binding-status" role="status">
        {bindingNotice ||
          (count > 0 ? `点选口袋，放入${item?.name}` : "持有物品后可分配口袋")}
      </p>
    </section>
  );
  return (
    <div
      className="hw-inventory"
      data-mobile-view={detailView ? "details" : "tray"}
    >
      <div className="hw-inventory-layout">
        <section className="hw-tray" aria-label="物品格子">
          <div className="hw-filters" aria-label="物品分类">
            {[
              { label: "全部", Icon: Backpack },
              { label: "材料", Icon: Leaf },
              { label: "种植", Icon: Sprout },
              { label: "收获", Icon: Wheat },
            ].map(({ label, Icon }) => (
              <button
                key={label}
                aria-pressed={filter === label}
                onClick={() => setFilter(label)}
              >
                <Icon size={18} aria-hidden="true" /> {label}
              </button>
            ))}
          </div>
          <div className="hw-slots">
            {Array.from(
              { length: Math.max(inventoryTraySlots, visible.length) },
              (_, index) => {
                const id = visible[index];
                return (
                  <ItemSlot
                    key={id || `empty-${index}`}
                    item={definitions[id]}
                    count={quantities[id]}
                    selected={id === selectedId}
                    binding={
                      quickItems.includes(id)
                        ? quickItems.indexOf(id) + 1
                        : undefined
                    }
                    onClick={() => select(id)}
                  />
                );
              },
            )}
          </div>
          {!visible.length && (
            <p className="hw-tray-caption">这个分类还没有物品。</p>
          )}
          <button
            ref={trayTab}
            className="rq-button hw-mobile-detail-button"
            onClick={showDetails}
          >
            查看所选物品 <ArrowRight size={16} />
          </button>
          <div className="hw-desktop-belt">{belt}</div>
        </section>
        <aside className="hw-details" aria-label="物品详情">
          <button
            ref={detailTab}
            className="hw-back"
            onClick={() => {
              setDetailView(false);
              requestAnimationFrame(() => trayTab.current?.focus());
            }}
          >
            <ArrowLeft size={16} /> 返回物品
          </button>
          {item ? (
            <>
              <div className="hw-item-heading">
                <div className="hw-item-display">
                  <ItemIcon item={item} size={48} />
                </div>
                <div>
                  <h3>{item.name}</h3>
                  <span className="hw-support rq-numeric">
                    {count > 0 ? `持有 ${count} 份` : "暂未持有"}
                  </span>
                </div>
              </div>
              <p className="hw-item-summary">{item.summary}</p>
              <div className="hw-action">
                <GameButton
                  className="rq-button--primary hw-item-action"
                  disabled={action.disabled}
                  pending={pending}
                  onClick={action.run}
                >
                  {action.label}
                  <ArrowRight size={16} aria-hidden="true" />
                </GameButton>
                {(action.reason || action.hint) && (
                  <p className="hw-support">{action.reason || action.hint}</p>
                )}
                {error && (
                  <p className="hw-feedback hw-error" role="alert">
                    {error}
                  </p>
                )}
                {notice && !error && (
                  <p className="hw-feedback" role="status">
                    {notice}
                  </p>
                )}
              </div>
              <div className="hw-mobile-belt">{belt}</div>
              <details className="hw-item-notes" key={selectedId}>
                <summary>用途与来源</summary>
                <p className="hw-description">{item.description}</p>
                <div className="hw-item-use">
                  <h4>用途</h4>
                  <p>{item.use}</p>
                  {selectedId === "seed" && (
                    <p className="hw-support">
                      {growthSeconds} 秒成熟 · 离线也会生长
                    </p>
                  )}
                </div>
                <p className="hw-source hw-support">
                  <MapPin size={16} aria-hidden="true" />
                  {item.source}
                </p>
              </details>
            </>
          ) : (
            <p>选择一个物品，查看它的用途。</p>
          )}
        </aside>
      </div>
    </div>
  );
}
