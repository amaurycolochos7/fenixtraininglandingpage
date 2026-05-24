import Link from "next/link";
import {
  Activity,
  ArrowRight,
  Dumbbell,
  Flame,
  Medal,
  MessageCircle,
  Shield,
  Trophy
} from "lucide-react";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

const disciplines = [
  {
    icon: Shield,
    title: "Muay Thai",
    text: "Técnica, defensa, condición y temple de combate con fundamentos reales."
  },
  {
    icon: Activity,
    title: "Acondicionamiento",
    text: "Entrenamiento físico para transformar resistencia, fuerza y composición corporal."
  },
  {
    icon: Dumbbell,
    title: "Disciplina personal",
    text: "Rutinas, constancia y mentalidad para sostener el cambio fuera del tatami."
  }
];

const results = [
  { label: "Años de experiencia", value: "+10" },
  { label: "Certificaciones y reconocimientos", value: "+14" },
  { label: "Sistema de transformación", value: "Real" }
];

export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <main>
        <section className="hero-section" id="inicio">
          <div className="hero-media">
            <img
              src="https://images.unsplash.com/photo-1599058917232-d750c185967c?auto=format&fit=crop&q=80&w=1920"
              alt="Entrenamiento de Muay Thai"
            />
          </div>
          <div className="hero-content">
            <span className="eyebrow">Nuevo Laredo, México</span>
            <h1>
              Forja tu <span>espíritu</span>
            </h1>
            <p>
              Artes marciales, salud y disciplina para recuperar fuerza, control y confianza.
              Entrenamiento serio para personas que quieren una transformación medible.
            </p>
            <div className="hero-actions">
              <a className="primary-button large" href="https://wa.me/528671643047">
                <MessageCircle size={19} />
                Inicia hoy
              </a>
              <Link className="secondary-button large" href="/videos">
                Ver videos
                <ArrowRight size={18} />
              </Link>
            </div>
          </div>
          <div className="hero-stat-strip">
            {results.map((item) => (
              <div key={item.label}>
                <strong>{item.value}</strong>
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="section-grid" id="filosofia">
          <div>
            <span className="eyebrow">Filosofía</span>
            <h2>Honor, disciplina y lealtad.</h2>
          </div>
          <div className="text-stack">
            <p>
              Fenix Fight System trabaja desde el Código Bushido: entrenar con intención, respetar
              el proceso y construir una versión más fuerte de cada alumno.
            </p>
            <p>
              El objetivo no es solo pegar más fuerte. Es moverte mejor, pensar con calma y hacer
              de la disciplina una herramienta diaria.
            </p>
          </div>
        </section>

        <section className="discipline-band" id="disciplinas">
          {disciplines.map((item) => (
            <article className="discipline-card" key={item.title}>
              <item.icon size={28} />
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </article>
          ))}
        </section>

        <section className="coach-section" id="coach">
          <div className="coach-photo">
            <img src="/cliente.jpg" alt="Alumno Fenix Fight System" />
          </div>
          <div>
            <span className="eyebrow">Transformación real</span>
            <h2>Un sistema que se mide en constancia.</h2>
            <p>
              La promesa del proyecto es sencilla: entrenamiento serio, evidencia visual,
              seguimiento honesto y una comunidad que empuja hacia adelante.
            </p>
            <div className="proof-row">
              <span>
                <Trophy size={18} />
                Resultados visibles
              </span>
              <span>
                <Medal size={18} />
                Certificaciones
              </span>
              <span>
                <Flame size={18} />
                Mentalidad de combate
              </span>
            </div>
          </div>
        </section>

        <section className="gallery-preview">
          <div>
            <span className="eyebrow">Galería</span>
            <h2>Reconocimientos, atletas y evidencia.</h2>
          </div>
          <Link className="secondary-button" href="/galeria">
            Abrir galería
            <ArrowRight size={18} />
          </Link>
          <div className="preview-grid">
            <img src="/jerry_pose.jpg" alt="Resultado de atleta Fenix" />
            <img src="/Rachel.png.jpeg" alt="Alumna Fenix" />
            <img src="/media/reconocimientos/r1 (2).jpeg" alt="Reconocimiento Fenix" />
          </div>
        </section>

        <section className="schedule-section" id="horarios">
          <div>
            <span className="eyebrow">Horarios</span>
            <h2>Agenda tu clase por WhatsApp.</h2>
          </div>
          <a className="primary-button large" href="https://wa.me/528671643047">
            <MessageCircle size={19} />
            Pedir informes
          </a>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
