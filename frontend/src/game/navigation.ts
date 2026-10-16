import type { World, GameState, NavigationTarget } from "../types";
import { serverNow } from "../stores/game";
import * as shared from "../../../shared/game/navigation";
export { mapById, pathfind, walkable, questTarget } from "../../../shared/game/navigation";
export const currentMap = (world: World, state: GameState) => shared.currentMap(world, state, serverNow());
export const accessibleTarget = (target: NavigationTarget, world: World, state: GameState) => shared.accessibleTarget(target, world, state, serverNow());
