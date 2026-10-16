let anchor = { server: 0, tick: 0 };
const monotonic = () => typeof performance !== 'undefined' ? performance.now() : Date.now();
export function acceptClock(server: number) {
  if(!Number.isFinite(server))return;
  // Delayed refresh replies must not wind the display clock backwards.
  const tick=monotonic(), current=anchor.server+(tick-anchor.tick)/1000;
  anchor={server:Math.max(server,anchor.server?current:server),tick};
}
export function serverNow() { return anchor.server + (monotonic() - anchor.tick) / 1000; }
