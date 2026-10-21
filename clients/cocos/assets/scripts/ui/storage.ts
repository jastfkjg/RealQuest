import {paperSurface,timberSurface,gameControls} from './materials';
import type { PanelHost } from "./panels";
import { itemNames } from "../core/features";
import { C } from "./theme";
/** One selected item, two truthful containers, one explicit transfer direction. */
export class StorageView {
  private item = "seed";
  private page = 0;
  draw(h: PanelHost) {
    const w = Math.min(880, h.width - 40),
      height = Math.min(440, h.height - 32),
      x = (h.width - w) / 2,
      y = (h.height - height) / 2,
      compact = height < 380;
    const all = Object.keys(h.state.storage),
      pages = Math.max(1, Math.ceil(all.length / 6));
    this.page = Math.min(this.page, pages - 1);
    if (!all.includes(this.item)) this.item = all[0];
    const ids = all.slice(this.page * 6, this.page * 6 + 6);
    paperSurface(h,{x,y,w,h:height},true);
    h.text("StorageTitle", "家园储物箱", x + 24, y + 12, w - 140, 40, 24);
    h.button(
      "close",
      "返回",
      x + w - 100,
      y + 12,
      76,
      44,
      () => h.close(),
      h.busy,
    );
    const trayW = (w - 72) / 2,
      cell = compact ? 56 : 64,
      gap = 10,
      gridW = 3 * cell + 2 * gap;
    for (const side of ["inventory", "storage"] as const) {
      const left = side === "inventory" ? x + 24 : x + w / 2 + 12;
      h.box(
        "Tray-" + side,
        left,
        y + 66,
        trayW,
        compact ? 160 : 190,
        C.canvas,
        7,
      );
      h.image(
        side === "inventory" ? "items/backpack" : "interiors/chest-closed",
        left + 28,
        y + 84,
        side === "inventory" ? 28 : 36,
        28,
      );
      h.text(
        "TrayTitle-" + side,
        side === "inventory" ? "随身背包" : "家园箱子",
        left + 52,
        y + 70,
        trayW - 64,
        28,
        16,
      );
      ids.forEach((id, i) => {
        const bx = left + (trayW - gridW) / 2 + (i % 3) * (cell + gap),
          by = y + (compact ? 100 : 104) + Math.floor(i / 3) * (cell + 8),
          count = h.state[side][id] || 0,
          selected = id === this.item;
        h.button(
          "storage-pick-" + side + "-" + id,
          "",
          bx,
          by,
          cell,
          cell,
          () => {
            this.item = id;
            h.redraw();
          },
          h.busy,
          selected,
          undefined,
          {label: '选择'+(side==='inventory'?'背包':'箱子')+'中的'+(itemNames[id]||id)+'，'+count+'份',pressed:selected},
        );
        if (h.hasArt("items/" + id))
          h.image(
            "items/" + id,
            bx + cell / 2,
            by + (compact ? 18 : 22),
            compact ? 26 : 32,
            compact ? 26 : 32,
          );
        else
          h.text(
            "StorageGlyph-" + side + "-" + id,
            itemNames[id] || id,
            bx + 3,
            by + 2,
            cell - 6,
            compact ? 32 : 38,
            12,
            selected ? C.raised : C.ink,
            true,
          );
        h.text(
          "StorageCount-" + side + "-" + id,
          (id === "seed"
            ? "种子"
            : id === "wood"
              ? "木材"
              : id === "stone"
                ? "石料"
                : id === "crop"
                  ? "萝卜"
                  : id === "plank"
                    ? "木板"
                    : "数量") +
            " " +
            count,
          bx + 2,
          by + cell - 23,
          cell - 4,
          22,
          12,
          selected ? C.raised : C.ink,
          true,
        );
      });
    }
    const id = this.item,
      feedback =
        h.error ||
        `${itemNames[id] || id} · 背包 ${h.state.inventory[id] || 0} / 箱中 ${h.state.storage[id] || 0}`;
    h.text(
      "StorageFeedback",
      feedback,
      x + 28,
      y + height - (compact ? 100 : 104),
      w - 56,
      32,
      14,
      h.error ? C.danger : C.ink,
    );
    const bottom = y + height - 60;
    h.button(
      "storage-prev",
      "‹",
      x + 28,
      bottom,
      44,
      44,
      () => {
        this.page--;
        this.item = all[this.page * 6];
        h.redraw();
      },
      h.busy || !this.page,
    );
    h.text(
      "StoragePage",
      `${this.page + 1}/${pages}`,
      x + 76,
      bottom,
      44,
      44,
      14,
      C.muted,
      true,
    );
    h.button(
      "storage-next",
      "›",
      x + 124,
      bottom,
      44,
      44,
      () => {
        this.page++;
        this.item = all[this.page * 6];
        h.redraw();
      },
      h.busy || this.page + 1 >= pages,
    );
    const send = (action: string) =>
      h.send(action, { target: "home_chest", item: id, amount: 1 });
    h.button(
      "store-" + id,
      h.busy ? "正在存取…" : "存入 1",
      x + w - 296,
      bottom,
      124,
      44,
      () => send("store"),
      h.busy || !h.state.inventory[id],
      true,
    );
    h.button(
      "withdraw-" + id,
      "取回 1",
      x + w - 156,
      bottom,
      128,
      44,
      () => send("withdraw"),
      h.busy || !h.state.storage[id],
    );
  }
}
