import type {GameState} from './protocol';

/** Availability comes from the server's discovered journal, never local guesses. */
export function hasStoryQuest(state: GameState, id: string) {
  return !!state.quest_log?.some(q => q.id === id && q.status !== 'locked');
}
export function legacyJourney(state: GameState) {
  return !state.quest_story || state.quest_story.legacy_departure;
}
export function canExploreStory(state: GameState) {
  return legacyJourney(state) || hasStoryQuest(state, 'first_expedition') || !!state.combat?.gate_open;
}
export function canReadGate(state: GameState) {
  return legacyJourney(state) || hasStoryQuest(state, 'gate_story') || !!state.combat?.gate_open;
}
export function isMainTracked(state: GameState) {
  return !state.tracked_quest || state.quest_log?.some(q => q.id === state.tracked_quest && q.kind === 'main') || ['settle_in', 'leave_valley'].includes(state.tracked_quest);
}
