"use client";

import { FormEvent, useState } from "react";
import { LockKeyhole } from "lucide-react";

export function LoginForm() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password })
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data.error || "No se pudo iniciar sesión.");
      window.location.href = "/admin";
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Error desconocido.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-shell">
      <form className="login-card" onSubmit={submit}>
        <img src="/logo.png" alt="Fenix Fight System" />
        <div className="login-icon">
          <LockKeyhole size={24} />
        </div>
        <span className="eyebrow">Acceso privado</span>
        <h1>Panel del cliente</h1>
        <p>Ingresa la contraseña configurada en Vercel para consultar las métricas.</p>
        <label>
          Contraseña
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="ADMIN_PASSWORD"
            autoFocus
          />
        </label>
        {error && <div className="status-banner danger">{error}</div>}
        <button className="primary-button large" type="submit" disabled={loading}>
          {loading ? "Entrando..." : "Entrar al panel"}
        </button>
      </form>
    </main>
  );
}
