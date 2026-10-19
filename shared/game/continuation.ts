import type { GameState } from './protocol';
import { clearedDepth, hasDepartureNotes, returnNote, trackedDeparture, type JourneyBookmark, type ReturnNote } from './nextDeparture';
export interface OptionalStorage { getItem(key: string): string | null; setItem(key: string, value: string): void; }
interface Preference { version: 1; collapsed: boolean; bookmark?: JourneyBookmark; }
/** Optional, per-save UI metadata only. Call snapshot only after a confirmed foreground server reply. */
export class JourneyContinuation {
  private id = ''; private prefs: Preference = { version: 1, collapsed: false };
  awaiting = true; cue: ReturnNote | null = null;
  constructor(private storage: OptionalStorage) {}
  private key() { return 'realquest-cocos-guidance-v1:' + this.id; }
  attach(id: string) {
    if (id === this.id) return;
    this.id = id; this.prefs = { version: 1, collapsed: false }; this.cue = null; this.awaiting = true;
    try { const p = JSON.parse(this.storage.getItem(this.key()) || 'null');
      if (p?.version === 1 && typeof p.collapsed === 'boolean') this.prefs = p;
    } catch { /* Optional metadata never replaces or blocks an authoritative save. */ }
  }
  get collapsed() { return this.prefs.collapsed; }
  private persist() { if (this.id) try { this.storage.setItem(this.key(), JSON.stringify(this.prefs)); } catch { /* Optional. */ } }
  fold(collapsed: boolean) { this.prefs.collapsed = collapsed; this.cue = null; this.persist(); }
  dismiss() { this.cue = null; }
  private remember(state: GameState, now: number) {
    if (!hasDepartureNotes(state)) return;
    this.prefs.bookmark = { version: 1, at: now, depth: clearedDepth(state), magic: state.knowledge_growth?.magic || 0 }; this.persist();
  }
  leave(id: string, state: GameState, now: number) {
    this.attach(id); if (!this.awaiting) this.remember(state, now); this.awaiting = true; this.cue = null;
  }
  snapshot(id: string, state: GameState, now: number, foreground: boolean, returning: boolean) {
    this.attach(id);
    if (!foreground || this.awaiting && !returning) return;
    if (returning) this.cue = this.collapsed ? null : returnNote(state, now, this.prefs.bookmark || null);
    this.awaiting = false; this.remember(state, now); this.reconcile(state, now);
  }
  reconcile(state: GameState, now: number) { if (this.collapsed || !trackedDeparture(state, now)) this.cue = null; }
  reset() { this.id = ''; this.prefs = { version: 1, collapsed: false }; this.awaiting = true; this.cue = null; }
  inspect() { return { collapsed: this.collapsed, awaitingForeground: this.awaiting, returnCue: this.cue }; }
}
