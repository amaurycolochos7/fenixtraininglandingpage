"use client";

import Link from "next/link";
import { ArrowLeft, Play } from "lucide-react";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

const videos = Array.from({ length: 34 }, (_, index) => ({
  number: index + 1,
  src: `/media/videos/v${index + 1}.mp4`
}));

export default function VideosPage() {
  function trackPlay(video: number) {
    window.dispatchEvent(
      new CustomEvent("fenix:track", {
        detail: { eventType: "video_play", metadata: { video } }
      })
    );
  }

  return (
    <>
      <SiteHeader />
      <main className="subpage">
        <section className="subpage-hero">
          <Link className="back-link" href="/">
            <ArrowLeft size={18} />
            Volver
          </Link>
          <span className="eyebrow">Video</span>
          <h1>Entrenamiento en movimiento</h1>
          <p>Clips de práctica, técnica, intensidad y resultados del sistema de combate.</p>
        </section>

        <section className="video-grid">
          {videos.map((video) => (
            <article className="video-card" key={video.src}>
              <div className="video-frame">
                <video
                  controls
                  preload="metadata"
                  playsInline
                  poster=""
                  onPlay={() => trackPlay(video.number)}
                >
                  <source src={`${video.src}#t=0.5`} type="video/mp4" />
                </video>
              </div>
              <div className="video-meta">
                <span>Video {String(video.number).padStart(2, "0")}</span>
                <Play size={15} />
              </div>
            </article>
          ))}
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
