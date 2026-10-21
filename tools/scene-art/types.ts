/** Browser-only offline paint contract. No game engine or live client. */
export interface PaintNode {
  setOrigin(x: number, y?: number): PaintNode;
  setScale(scale: number): PaintNode;
  setDepth(depth: number): PaintNode;
  setData(key: string, value: string | boolean): PaintNode;
  setVisible(visible: boolean): PaintNode;
}
export interface PaintScene {
  textures: {
    exists(key: string): boolean;
    get(key: string): {getSourceImage(): HTMLImageElement | HTMLCanvasElement};
    createCanvas(key: string, width: number, height: number): {context: CanvasRenderingContext2D; refresh(): void};
    addCanvas(key: string, canvas: HTMLCanvasElement): void;
  };
  add: {
    image(x: number, y: number, key: string): PaintNode;
    ellipse(x: number, y: number, width: number, height: number, color: number, alpha: number): PaintNode;
  };
}
