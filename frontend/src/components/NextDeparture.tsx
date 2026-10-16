import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  Check,
  Clock3,
  Compass,
  MapPin,
  Moon,
  Swords,
  X,
} from "lucide-react";
import { serverNow, useGame } from "../stores/game";
import { itemDefinitions, itemNames } from "../game/items";
import {
  activePromise,
  bed,
  clearedDepth,
  growthStep,
  nextDeparture,
  trailStep,
  trackedDeparture,
  type PreparationAction,
  type PreparationTopic,
} from "../game/nextDeparture";

export function followPreparation(action: PreparationAction) {
  const store = useGame.getState();
  useGame.setState({ returnCue: null });
  if (action.magic)
    useGame.setState({ studyEntry: "growth", knowledgeBranch: "magic" });
  if (action.target) store.navigate(action.target);
  else if ("panel" in action) store.open(action.panel ?? null);
}
export function usePreparationClock() {
  const [now, setNow] = useState(serverNow);
  useEffect(() => {
    const id = window.setInterval(() => setNow(serverNow()), 1000);
    return () => window.clearInterval(id);
  }, []);
  return now;
}
const topics = [
  { id: "gear", name: "整备行囊", icon: Swords },
  { id: "trail", name: "洞穴路标", icon: Compass },
  { id: "growth", name: "成长约定", icon: BookOpen },
] as const;
const weaponNotes: Record<string, string> = {
  reinforced_sword: "近身稳攻 · 每次只耗1体力",
  spring_spear: "中距物理 · 留出退让空间",
  glow_staff: "远程魔法 · 连续使用更耗体力",
};
const stamp = (at: number) =>
  new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(at * 1000);

export function NextDeparture() {
  const { state, open, busy, command } = useGame();
  const now = usePreparationClock();
  const step = state && nextDeparture(state, now);
  const [topic, setTopic] = useState<PreparationTopic>(step?.topic || "trail");
  const [weaponId, setWeapon] = useState("reinforced_sword");
  const leaf = useRef<HTMLDivElement>(null);
  const [more, setMore] = useState(false);
  const measureLeaf = () => {
    const el = leaf.current;
    setMore(!!el && el.scrollTop + el.clientHeight < el.scrollHeight - 2);
  };
  useEffect(() => {
    const el = leaf.current;
    if (!el) return;
    const observer = new ResizeObserver(measureLeaf);
    observer.observe(el);
    measureLeaf();
    return () => observer.disconnect();
  }, [topic, weaponId, step?.id]);
  if (!state?.combat || !step)
    return <p>完成首层初探并在工坊记下收获后，这页手记就会接上旅程。</p>;
  const c = state.combat;
  const current =
    c.equipped && state.inventory[c.equipped] > 0
      ? c.weapons[c.equipped]
      : null;
  const candidates = Object.keys(c.weapons).filter(
    (id) => id !== "stone_sword",
  );
  const id = candidates.includes(weaponId) ? weaponId : candidates[0];
  const weapon = c.weapons[id];
  const trail = trailStep(state),
    growth = growthStep(state, now),
    task = activePromise(state);
  const depth = clearedDepth(state),
    magic = state.knowledge_growth?.magic || 0;
  const action =
    topic === "gear"
      ? step.topic === "gear"
        ? step
        : {
            label: "标记武备台 · 选购或打造",
            target: { mapId: "workshop", targetId: "armory_counter" },
          }
      : topic === "trail"
        ? trail
        : growth;
  return (
    <div className="departure-journal">
      <aside className="departure-cover" aria-label="行囊与旅程进度">
        <div className="departure-vignette" aria-hidden="true">
          <img src="/assets/hearthwood/arrival-village-v1.webp" alt="" />
          <img
            className="departure-bag"
            src="/assets/hearthwood/detail/items/backpack.png"
            alt=""
          />
          <img
            className="departure-book"
            src="/assets/hearthwood/detail/interiors/book.png"
            alt=""
          />
        </div>
        <div className="departure-cover-copy">
          <small>初探之后 · 下一次出发</small>
          <h3>
            带着收获，
            <br />
            再走远一些
          </h3>
          <p>
            装备、通路和成长各自保留。
            <br />
            选一件眼下想做的事。
          </p>
          <div className="departure-equipped">
            {current ? (
              <img
                src={itemDefinitions[c.equipped!].icon}
                alt=""
                width="42"
                height="42"
              />
            ) : (
              <Swords size={32} />
            )}
            <span>
              <small>当前装备</small>
              <b>{current?.name || "尚未装备"}</b>
            </span>
          </div>
          <div className="departure-condition">
            <span>
              生命 {state.vitality?.current}/{state.vitality?.max}
            </span>
            <span>
              体力 {Math.floor(state.stamina?.current || 0)}/
              {state.stamina?.max}
            </span>
          </div>
        </div>
        <button
          className="departure-cover-link"
          onClick={() => open("equipment")}
        >
          整理随身装备 <ArrowRight size={16} />
        </button>
      </aside>
      <section className="departure-leaf" aria-label="再出发准备">
        <nav className="departure-bookmarks" aria-label="整备书页">
          {topics.map(({ id, name, icon: Icon }) => (
            <button
              key={id}
              aria-pressed={topic === id}
              onClick={() => setTopic(id)}
            >
              <Icon size={17} />
              {name}
            </button>
          ))}
        </nav>
        <div
          className="departure-page"
          key={topic}
          ref={leaf}
          onScroll={measureLeaf}
          data-more={more}
          tabIndex={0}
          aria-label="准备书页正文"
        >
          {topic === "gear" && weapon && (
            <>
              <h3>
                {step.topic === "gear" ? step.title : "下一件武器，由你来选"}
              </h3>
              <div
                className="departure-weapons"
                role="group"
                aria-label="比较进阶武器"
              >
                {candidates.map((key) => (
                  <button
                    key={key}
                    aria-pressed={id === key}
                    onClick={() => setWeapon(key)}
                  >
                    <img
                      src={itemDefinitions[key].icon}
                      alt=""
                      width="44"
                      height="44"
                    />
                    <span>{c.weapons[key].name}</span>
                  </button>
                ))}
              </div>
              <div className="departure-weapon-note" aria-label="武器改善比较">
                <div>
                  <strong>{weapon.name}</strong>
                  <span>{weaponNotes[id]}</span>
                </div>
                <dl>
                  <div>
                    <dt>单次伤害</dt>
                    <dd>
                      {current ? `${current.damage} → ` : ""}
                      {weapon.damage}
                      <small>{weapon.magic ? "魔法" : "物理"}</small>
                    </dd>
                  </div>
                  <div>
                    <dt>每次体力</dt>
                    <dd>
                      {current ? `${current.stamina} → ` : ""}
                      {weapon.stamina}
                    </dd>
                  </div>
                  <div>
                    <dt>购买价格</dt>
                    <dd>
                      {weapon.price}
                      <small>金币</small>
                    </dd>
                  </div>
                </dl>
              </div>
              <p className="departure-explanation">
                购买无需制造等级；也可按图纸打造。现有 {state.inventory.gold}{" "}
                金币
                {state.inventory.gold < weapon.price
                  ? `，购买还差 ${weapon.price - state.inventory.gold}`
                  : "，足够购买"}
                。
              </p>
              <div className="departure-recipe">
                <span>打造</span>
                <p>
                  建造1级 ＋{" "}
                  {weapon.either
                    ? "科学1或魔法1"
                    : weapon.science
                      ? `科学${weapon.science}`
                      : `魔法${weapon.magic_level}`}
                  级
                </p>
                <ul>
                  {Object.entries(weapon.costs).map(([key, n]) => (
                    <li key={key} data-short={(state.inventory[key] || 0) < n}>
                      {itemNames[key]}{" "}
                      <b>
                        {state.inventory[key] || 0}/{n}
                      </b>
                    </li>
                  ))}
                </ul>
              </div>
              <p className="departure-margin-note">
                进阶装备是可选准备。初始短剑仍可继续探索，材料不会自动变成装备。
              </p>
            </>
          )}
          {topic === "trail" && (
            <>
              <h3>{trail.title}</h3>
              <ol className="departure-route" aria-label="永久洞穴通路进度">
                {[1, 2, 3, 4, 5].map((floor) => (
                  <li
                    key={floor}
                    data-cleared={floor <= depth}
                    aria-current={
                      floor === Math.min(5, depth + 1) && depth < 5
                        ? "step"
                        : undefined
                    }
                  >
                    <span>{floor <= depth ? <Check size={18} /> : floor}</span>
                    <b>{floor === 5 ? "守卫" : `${floor}层`}</b>
                  </li>
                ))}
              </ol>
              <p className="departure-explanation">{trail.note}</p>
              <div className="departure-route-notes">
                <p>
                  <Check size={17} />
                  {depth >= 3
                    ? "第3层绳梯已开放，可从洞口内使用"
                    : "清理第3层后，开放洞口内的绳梯"}
                </p>
                <p>
                  <Moon size={17} />
                  永久通路保留，普通怪物次日重现
                </p>
              </div>
              <div className="departure-stone">
                <img
                  src={itemDefinitions.gate_stone.icon}
                  alt=""
                  width="54"
                  height="54"
                />
                <div>
                  <b>
                    {c.gate_open
                      ? "石门已永久开启"
                      : state.inventory.gate_stone
                        ? "门钥魔法石已在行囊"
                        : "底层守卫保管着门钥魔法石"}
                  </b>
                  <p>启门还需魔法3级 · 当前 {magic} 级</p>
                </div>
              </div>
              <button
                className="departure-text-action"
                onClick={() => followPreparation({ label: "", target: bed })}
              >
                需要恢复？标记家中床铺 <ArrowRight size={15} />
              </button>
            </>
          )}
          {topic === "growth" && (
            <>
              <h3>{growth.title}</h3>
              <div className="departure-magic">
                <img
                  src="/assets/hearthwood/character/magic.webp"
                  alt=""
                  width="76"
                  height="76"
                />
                <div>
                  <span>启门魔法</span>
                  <b>
                    {magic}
                    <small> / 3级</small>
                  </b>
                  <div
                    className="departure-levels"
                    aria-label={`魔法${magic}级，启门需要3级`}
                  >
                    {[1, 2, 3].map((level) => (
                      <i key={level} data-earned={magic >= level}>
                        {magic >= level ? <Check size={14} /> : level}
                      </i>
                    ))}
                  </div>
                </div>
                <span className="departure-points">
                  {state.knowledge_points || 0}
                  <small>可用知识点</small>
                </span>
              </div>
              <p className="departure-explanation">{growth.note}</p>
              {task && (
                <div className="departure-promise" role="status">
                  <Clock3 size={20} />
                  <div>
                    <b>
                      {task.kind === "study"
                        ? "学习"
                        : task.kind === "work"
                          ? "工作"
                          : "运动"}
                      约定 · {task.hours}小时
                    </b>
                    <span>
                      {task.ready_at <= now
                        ? "时间已到，尚未结算"
                        : `${stamp(task.ready_at)} 到期 · 北京时间`}
                    </span>
                  </div>
                </div>
              )}
              <p className="departure-margin-note">
                从魔法0级准备启门，共需3知识点。学习每现实小时结算1点，三类委托每日合计最多5点；离线继续计时，游戏睡眠不加速。
              </p>
              <button
                className="departure-text-action"
                onClick={() => open("activity")}
              >
                翻阅成长手记 <ArrowRight size={15} />
              </button>
            </>
          )}
        </div>
        <footer className="departure-page-actions">
          <button
            className="departure-primary"
            onClick={() => followPreparation(action)}
          >
            {action.target ? <MapPin size={17} /> : <ArrowRight size={17} />}
            {action.label}
          </button>
          <span>
            {more
              ? "书页可上下滑动，主操作固定在这里"
              : action.target
                ? "只标记方向，需亲自走近"
                : "查看与选择不会自动花点"}
          </span>
        </footer>
      </section>
      <footer className="departure-binding">
        <span>
          <Check size={14} />
          初探收获与通路已保存
        </span>
        <button
          disabled={busy}
          onClick={() =>
            void command("intro_toggle", {
              dismissed: !state.village_intro?.dismissed,
            })
          }
        >
          {busy
            ? "正在记下…"
            : state.village_intro?.dismissed
              ? "继续下一程引导"
              : "暂时收起下一程引导"}
        </button>
      </footer>
    </div>
  );
}

export function DepartureTracker() {
  const { state, open } = useGame();
  const now = usePreparationClock(),
    step = state && nextDeparture(state, now);
  if (!state || !step) return null;
  return (
    <div className="tracked-quest intro-tracker departure-tracker">
      <span className="chapter-label">初探之后 · 下一次出发</span>
      <h2>{step.title}</h2>
      <p>{step.note}</p>
      <button className="quest-guide" onClick={() => followPreparation(step)}>
        {step.label}
        <ArrowRight size={16} />
      </button>
      <button className="quest-guide" onClick={() => open("preparation")}>
        <BookOpen size={16} />
        翻开再出发手记
      </button>
    </div>
  );
}
export function ReturnJourneySlip() {
  const { state, panel, returnCue, open } = useGame();
  const now = usePreparationClock();
  const visible =
    !!returnCue &&
    !panel &&
    !!state &&
    !state.location.startsWith("cave_") &&
    !!trackedDeparture(state, now);
  useEffect(() => {
    if (!visible) return;
    const dismiss = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.isComposing) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      useGame.setState({ returnCue: null });
    };
    window.addEventListener("keydown", dismiss, true);
    return () => window.removeEventListener("keydown", dismiss, true);
  }, [visible]);
  if (
    !returnCue ||
    panel ||
    !state ||
    state.location.startsWith("cave_") ||
    state.village_intro?.dismissed ||
    state.combat?.gate_open ||
    !trackedDeparture(state, now)
  )
    return null;
  return (
    <aside className="return-journey-slip rq-theme" aria-label="归来续接">
      <button
        className="return-slip-close"
        aria-label="收起归来提示"
        onClick={() => useGame.setState({ returnCue: null })}
      >
        <X size={16} />
      </button>
      <small>
        <BookOpen size={16} />
        旅人的续页
      </small>
      <h3>欢迎回来，接上这一程</h3>
      <p>{nextDeparture(state, now)?.title}</p>
      <button
        className="departure-primary"
        onClick={() => {
          useGame.setState({ returnCue: null });
          open("preparation");
        }}
      >
        看看这次的准备 <ArrowRight size={16} />
      </button>
    </aside>
  );
}
