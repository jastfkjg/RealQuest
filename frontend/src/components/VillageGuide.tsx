import { useState } from "react";
import { IntroGuidePreference } from "./VillageIntro";

const pages = [
  {
    name: "行走与交互",
    title: "从家门口，慢慢出发",
    lines: [
      <>
        使用 <kbd>WASD</kbd> 或方向键移动，靠近对象按 <kbd>E</kbd>{" "}
        互动；进入房间后，到门前按 E 离开。
      </>,
      <>
        点击地面自动寻路，点击远处对象会先走近再互动。<kbd>Shift</kbd>{" "}
        可加快行走。
      </>,
      <>
        触屏用方向键移动、交互按钮操作。<kbd>F</kbd> 切换全屏，<kbd>Esc</kbd>{" "}
        关闭面板。I 背包、C 角色、J 日志、L 现实成长。
      </>,
    ],
  },
  {
    name: "家园与生计",
    title: "给小日子留一份收获",
    lines: [
      <>
        落枝和矿石每 30 秒恢复。走近小屋南侧农田种下种子，60
        秒后收获；离线不会让作物枯萎。
      </>,
      <>
        杂货铺可以买卖物品、交付村民订单。工坊可出售萝卜、制作木板，用材料升级建筑。
      </>,
      <>
        06:00 起床，01:00
        前到床边睡觉。未睡会送回家，生命下降且体力不恢复；床边也可免费小憩。
      </>,
    ],
  },
  {
    name: "洞穴与远行",
    title: "准备好，再去看山那边",
    lines: [
      <>
        武备台可购买武器与菜汤，购买无需制造等级；打造需要建造1级和相应科学／魔法等级，带走武器后要主动装备。
      </>,
      <>
        石根山洞在旧采石场旁。空格攻击、Q 火花术、R
        菜汤，点击怪物选目标；清理每层后继续，第3层可短休。
      </>,
      <>
        底层守卫掉落门钥魔法石，搭配魔法3级永久开启东行石门。阅读面板、现实成长、后台与离线都会暂停游戏时间。
      </>,
    ],
  },
  {
    name: "现实成长",
    title: "也为现实中的脚步留一页",
    lines: [
      <>
        现实生活为角色带来成长；森林与家园提供物品。即使没有现实记录，也能自由游玩。
      </>,
      <>
        与诺亚交谈，领取学习、运动或工作的现实委托。具体条件、时间和回礼在接取前显示。
      </>,
      <>
        成长手记可直接从底部打开。研习手札保留学习记录；记录一次25分钟学习后，可去图书馆东侧尝试解读遗迹。
      </>,
    ],
  },
];
export function VillageGuide() {
  const [index, turn] = useState(0);
  const page = pages[index];
  return (
    <div className="field-guide">
      <aside aria-hidden="true">
        <img src="/assets/hearthwood/arrival-village-v1.webp" alt="" />
        <img
          className="field-guide-book"
          src="/assets/hearthwood/detail/interiors/book.png"
          alt=""
        />
      </aside>
      <section>
        <nav className="field-tabs" aria-label="旅人指南书页">
          {pages.map((p, i) => (
            <button
              key={p.name}
              aria-pressed={i === index}
              onClick={() => turn(i)}
            >
              {p.name}
            </button>
          ))}
        </nav>
        <h3>{page.title}</h3>
        <ol className="field-guide-lines">
          {page.lines.map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ol>
        <IntroGuidePreference />
      </section>
    </div>
  );
}
