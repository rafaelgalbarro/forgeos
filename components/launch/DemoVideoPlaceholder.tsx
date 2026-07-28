import { Panel } from "@/components/ui/fhis/Layout";

export function DemoVideoPlaceholder() {
  return (
    <Panel className="fhis-launch-demo-video">
      <div className="fhis-launch-demo-video-inner">
        <div className="fhis-launch-demo-play">▶</div>
        <p className="fhis-launch-demo-label">Demo ForgeOS 1.0</p>
        <p className="fhis-launch-demo-sub">Idea → Venture completa en 10 minutos</p>
      </div>
    </Panel>
  );
}
