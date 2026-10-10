import { PixelPerson } from "./PixelPerson";
export { PixelPerson } from "./PixelPerson";
export { CharacterPanel } from "./CharacterPanel";

export function CharacterStage({
  appearance,
  large = false,
}: {
  appearance: number;
  large?: boolean;
}) {
  return (
    <div
      className={`character-stage ${large ? "stage-large" : ""}`}
      aria-hidden="true"
    >
      <div className="stage-halo" />
      <div className="stage-tree tree-left" />
      <div className="stage-tree tree-right" />
      <div className="stage-ground" />
      <div className="stage-path" />
      <div className="stage-flower flower-left" />
      <div className="stage-flower flower-right" />
      <div className="stage-person" key={appearance}>
        <PixelPerson variant={appearance} />
      </div>
      <i className="stage-mote mote-one" />
      <i className="stage-mote mote-two" />
      <i className="stage-mote mote-three" />
    </div>
  );
}
