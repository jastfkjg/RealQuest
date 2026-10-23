import {paperSurface,timberSurface,gameControls} from './materials';
import type { PanelHost } from "./panels";
import { itemNames } from "../core/features";
import { C } from "./theme";
/** One selected item, two truthful containers, one explicit transfer direction. */
export class StorageView {
  private item = "seed";
  private page = 0;
  private stack=false;
  private name="";private context="";
  draw(h: PanelHost) {
    const key=h.context?.id||'home_chest',chest=h.state.construction?.chests[key],storage=chest?.items||h.state.storage;
    if(this.context!==key){this.context=key;this.name=chest?.name||'';this.page=0;}
    const w = Math.min(880, h.width - 40),
      height = Math.min(chest?480:440, h.height - 32),
      x = (h.width - w) / 2,
      y = (h.height - height) / 2,
      compact = height < 380;
    const held = (chest?Array.from(new Set([...Object.keys(storage),...Object.keys(h.state.inventory)])):Object.keys(storage)).filter(id=>id!=='gold').filter(id=>(storage[id]||0)+(h.state.inventory[id]||0)>0);
    const all = held.length?held:[this.item],
      per=compact?3:6, pages = Math.max(1, Math.ceil(all.length / per));
    this.page = Math.min(this.page, pages - 1);
    if (!all.includes(this.item)) this.item = all[0];
    const ids = all.slice(this.page * per, this.page * per + per);
    paperSurface(h,{x,y,w,h:height},true);
    h.region('storage-paper',x+20,y+12,w-40,height-24);
    h.text("StorageTitle", chest?chest.name+` · ${Object.values(storage).filter(n=>n>0).length}/${h.state.construction_view?.recipes[chest.recipe].slots}格`:"家园储物箱", x + 24, y + 12, w - 140, 40, 24);
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
        compact ? 110 : 190,
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
        side === "inventory" ? "随身背包" : chest?.name||"家园箱子",
        left + 52,
        y + 70,
        trayW - 64,
        28,
        16,
      );
      ids.forEach((id, i) => {
        const bx = left + (trayW - gridW) / 2 + (i % 3) * (cell + gap),
          by = y + (compact ? 100 : 104) + Math.floor(i / 3) * (cell + 8),
          count = (side==="storage"?storage:h.state.inventory)[id] || 0,
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
        `${itemNames[id] || id} · 背包 ${h.state.inventory[id] || 0} / 箱中 ${storage[id] || 0}`;
    h.text(
      "StorageFeedback",
      feedback,
      x + 28,
      y + height - (chest?(compact?148:168):104),
      w - 56,
      32,
      14,
      h.error ? C.danger : C.ink,
    );
    const bottom = y + height - 60;
    if(chest){
      h.button('chest-move','移动木箱',x+24,bottom-48,132,44,()=>h.go('chest-placement'),h.busy);
      h.button('chest-rename-open','修改箱名',x+164,bottom-48,128,44,()=>h.go('chest-name'),h.busy);
      h.button('chest-stack-mode',this.stack?'数量：整组':'数量：1份',x+304,bottom-48,128,44,()=>{this.stack=!this.stack;h.redraw();},h.busy);
    }
    if(pages>1)h.button(
      "storage-prev",
      "‹",
      x + 28,
      bottom,
      44,
      44,
      () => {
        this.page--;
        this.item = all[this.page * per];
        h.redraw();
      },
      h.busy || !this.page,
    );
    if(pages>1)h.text(
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
    if(pages>1)h.button(
      "storage-next",
      "›",
      x + 124,
      bottom,
      44,
      44,
      () => {
        this.page++;
        this.item = all[this.page * per];
        h.redraw();
      },
      h.busy || this.page + 1 >= pages,
    );
    const send = (action: string) =>
      chest?h.send('construction_transfer',{target:key,chest:key,expected_version:chest.version,item:id,amount:this.stack?(action==="store"?h.state.inventory[id]:storage[id])||0:1,direction:action}):h.send(action, { target: 'home_chest', item: id, amount: 1 });
    if(pages===1)h.text('StorageHint',held.length?'选中物品，再存入或取回。':'背包和箱子都空着，去村庄收集一些物品吧。',x+28,bottom,w-336,44,14,C.muted);
    h.button(
      "store-" + id,
      h.busy ? "正在存取…" : this.stack?"存入整组":"存入 1",
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
      this.stack?"取回整组":"取回 1",
      x + w - 156,
      bottom,
      128,
      44,
      () => send("withdraw"),
      h.busy || !storage[id],
    );
  }
}
