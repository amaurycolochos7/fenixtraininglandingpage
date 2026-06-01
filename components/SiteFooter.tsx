import { ExternalLink, MessageCircle } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-grid">
        <div>
          <img src="/logo.png" alt="Fénix Fight System" className="footer-logo" />
          <p>
            Muay Thai, disciplina y transformación real en Nuevo Laredo. Entrenamiento con
            mentalidad de combate y seguimiento humano.
          </p>
          <p style={{ marginTop: "8px", fontSize: "13px", opacity: 0.5 }}>
            Donato Guerra 1941, Centro, NLD
          </p>
        </div>
        <div>
          <span className="footer-label">Contacto</span>
          <a href="https://wa.me/528671643047">
            <MessageCircle size={18} />
            WhatsApp
          </a>
          <a href="https://www.instagram.com/fenixfightsystem/" target="_blank">
            <ExternalLink size={18} />
            Instagram
          </a>
        </div>
        <div>
          <span className="footer-label">Privacidad</span>
          <p>
            Las métricas del panel son estimaciones operativas. País, estado y ciudad se calculan
            por IP y pueden variar por VPN, red móvil o proveedor de internet.
          </p>
        </div>
      </div>
      <p className="copyright">© {new Date().getFullYear()} Fénix Fight System.</p>
    </footer>
  );
}
