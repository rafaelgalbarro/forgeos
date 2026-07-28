"use client";

import Link from "next/link";
import { Grid, Panel } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import { Badge } from "@/components/ui/fhis/Badge";
import { listVideoTutorials } from "@/lib/forgeos-launch";

export function VideoTutorialsPanel() {
  const videos = listVideoTutorials();

  return (
    <>
      <SectionHeader
        title="Video tutoriales"
        description="Placeholders para contenido de onboarding y producto"
      />
      <Grid cols={2} gap="md">
        {videos.map((video) => (
          <Panel key={video.id} className="fhis-video-tutorial">
            <div className="fhis-video-tutorial-header">
              <Badge variant="default">{video.duration}</Badge>
              {video.comingSoon && <Badge variant="accent">Próximamente</Badge>}
            </div>
            <h3>{video.title}</h3>
            <p>{video.summary}</p>
            <Link href={video.href} className="fhis-btn fhis-btn-ghost fhis-btn-sm">
              {video.comingSoon ? "Preview" : "Ver video"} →
            </Link>
          </Panel>
        ))}
      </Grid>
    </>
  );
}
