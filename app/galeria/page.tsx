"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ChevronLeft, ChevronRight, X } from "lucide-react";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

const certImages = [
  "media/reconocimientos/r1 (2).jpeg",
  "media/reconocimientos/r1 (13).jpeg",
  "media/reconocimientos/r1 (10).jpeg",
  "media/reconocimientos/r1 (6).jpeg",
  "media/reconocimientos/r1 (9).jpeg",
  "media/reconocimientos/r1 (12).jpeg",
  "media/reconocimientos/r1 (11).jpeg",
  "media/reconocimientos/r1 (8).jpeg",
  "media/reconocimientos/r1 (5).jpeg",
  "media/reconocimientos/r1 (4).jpeg",
  "media/reconocimientos/r1 (3).jpeg",
  "media/reconocimientos/r1 (7).jpeg",
  "media/reconocimientos/r1 (14).jpeg",
  "media/reconocimientos/r1 (1).jpeg"
];

export default function GalleryPage() {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  function open(index: number) {
    setActiveIndex(index);
    window.dispatchEvent(
      new CustomEvent("fenix:track", {
        detail: { eventType: "gallery_open", metadata: { image: certImages[index] } }
      })
    );
  }

  function next() {
    if (activeIndex === null) return;
    setActiveIndex((activeIndex + 1) % certImages.length);
  }

  function prev() {
    if (activeIndex === null) return;
    setActiveIndex((activeIndex - 1 + certImages.length) % certImages.length);
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
          <span className="eyebrow">Evidencia</span>
          <h1>Galería de reconocimientos</h1>
          <p>
            Certificaciones, trayectoria y momentos clave del sistema de entrenamiento Fenix Fight
            System.
          </p>
        </section>

        <section className="gallery-grid">
          {certImages.map((src, index) => (
            <button className="gallery-card" key={src} onClick={() => open(index)}>
              <img src={`/${src}`} alt={`Reconocimiento ${index + 1}`} />
              <span>{String(index + 1).padStart(2, "0")}</span>
            </button>
          ))}
        </section>
      </main>

      {activeIndex !== null && (
        <div className="lightbox" onClick={() => setActiveIndex(null)}>
          <button className="icon-button lightbox-close" onClick={() => setActiveIndex(null)}>
            <X size={22} />
          </button>
          <button
            className="icon-button lightbox-prev"
            onClick={(event) => {
              event.stopPropagation();
              prev();
            }}
          >
            <ChevronLeft size={28} />
          </button>
          <img
            src={`/${certImages[activeIndex]}`}
            alt={`Reconocimiento ${activeIndex + 1}`}
            onClick={(event) => event.stopPropagation()}
          />
          <button
            className="icon-button lightbox-next"
            onClick={(event) => {
              event.stopPropagation();
              next();
            }}
          >
            <ChevronRight size={28} />
          </button>
          <span className="lightbox-count">
            {activeIndex + 1} / {certImages.length}
          </span>
        </div>
      )}
      <SiteFooter />
    </>
  );
}
