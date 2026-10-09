import { create } from "zustand";
type Preferences = { sound: boolean; reducedMotion: boolean };
const defaults: Preferences = {
  sound: false,
  reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
};
function read(): Preferences {
  try {
    return {
      ...defaults,
      ...JSON.parse(localStorage.getItem("realquest-preferences") || "{}"),
    };
  } catch {
    return defaults;
  }
}
export const usePreferences = create<
  Preferences & { set: (value: Partial<Preferences>) => void }
>((set, get) => ({
  ...read(),
  set: (value) => {
    set(value);
    try {
      localStorage.setItem(
        "realquest-preferences",
        JSON.stringify({
          sound: get().sound,
          reducedMotion: get().reducedMotion,
        }),
      );
    } catch {
      /* Storage can be disabled without preventing play. */
    }
  },
}));
let context: AudioContext | null = null;
export function unlockSound() {
  if (!usePreferences.getState().sound) return;
  try {
    context ||= new AudioContext();
    void context.resume().catch(() => undefined);
  } catch {
    /* Optional audio. */
  }
}
export function chime(
  kind: "step" | "interact" | "item" | "reward" = "interact",
) {
  if (
    !usePreferences.getState().sound ||
    !context ||
    context.state !== "running"
  )
    return;
  const notes =
    kind === "reward"
      ? [523, 659, 784]
      : kind === "item"
        ? [659, 880]
        : kind === "step"
          ? [110]
          : [440, 554];
  notes.forEach((frequency, index) => {
    const oscillator = context!.createOscillator(),
      gain = context!.createGain(),
      at = context!.currentTime + index * 0.07;
    oscillator.type = kind === "step" ? "triangle" : "sine";
    oscillator.frequency.setValueAtTime(frequency, at);
    gain.gain.setValueAtTime(kind === "step" ? 0.009 : 0.035, at);
    gain.gain.exponentialRampToValueAtTime(0.001, at + 0.13);
    oscillator.connect(gain);
    gain.connect(context!.destination);
    oscillator.start(at);
    oscillator.stop(at + 0.15);
    oscillator.onended = () => {
      oscillator.disconnect();
      gain.disconnect();
    };
  });
}
export function personFrame(direction: number, step = 0) {
  return step * 4 + [0, 2, 3, 1][direction];
}
