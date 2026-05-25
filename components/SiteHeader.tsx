"use client";

import Link from "next/link";
import { Menu, X, Zap } from "lucide-react";
import { useState } from "react";

const navItems = [
  { href: "/", label: "Inicio" },
  { href: "/#filosofia", label: "Filosofía" },
  { href: "/#coach", label: "Coach" },
  { href: "/galeria", label: "Galería" },
  { href: "/videos", label: "Videos" },
  { href: "/#horarios", label: "Horarios" }
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link href="/" className="brand-mark" onClick={() => setOpen(false)}>
          <img src="/logo.png" alt="Fenix Fight System" />
          <span>
            FENIX <b>FIGHT SYSTEM</b>
          </span>
        </Link>

        <nav className="desktop-nav">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>

        <a className="nav-cta" href="https://wa.me/528671643047">
          <Zap size={16} />
          Entrena ya
        </a>

        <button className="icon-button mobile-toggle" onClick={() => setOpen((value) => !value)}>
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {open && (
        <nav className="mobile-nav">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} onClick={() => setOpen(false)}>
              {item.label}
            </Link>
          ))}
          <a href="https://wa.me/528671643047" onClick={() => setOpen(false)}>
            Entrena ya
          </a>
        </nav>
      )}
    </header>
  );
}
