import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";
import { AnalyticsTracker } from "@/components/AnalyticsTracker";

export const metadata: Metadata = {
  title: "Fenix Fight System | Muay Thai & Disciplina",
  description:
    "Centro de entrenamiento en Nuevo Laredo. Muay Thai, disciplina, transformación física y mental.",
  icons: {
    icon: "/logo.png"
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        {children}
        <Suspense fallback={null}>
          <AnalyticsTracker />
        </Suspense>
      </body>
    </html>
  );
}
