// Persisted IDs are append-only. The original three appearances keep their art.
export const appearances = [
  {
    id: 0,
    name: "林间旅行装",
    label: "林间",
    source: "/assets/ninja-adventure/character-0.png",
  },
  {
    id: 1,
    name: "轻装旅行服",
    label: "轻装",
    source: "/assets/ninja-adventure/character-1.png",
  },
  {
    id: 2,
    name: "远行者装束",
    label: "远行",
    source: "/assets/ninja-adventure/character-2.png",
  },
  {
    id: 3,
    name: "晴空短衫",
    label: "晴空",
    source: "/assets/ninja-adventure/character-3.png",
  },
  {
    id: 4,
    name: "月白旅行装",
    label: "月白",
    source: "/assets/ninja-adventure/character-4.png",
  },
  {
    id: 5,
    name: "暖阳便装",
    label: "暖阳",
    source: "/assets/ninja-adventure/character-5.png",
  },
] as const;

export function getAppearance(id: number) {
  return (
    appearances.find((appearance) => appearance.id === id) ?? appearances[0]
  );
}
