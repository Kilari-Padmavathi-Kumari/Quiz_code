"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { loginWithEmailOnly } from "../lib/api";
import { getTokenExpiry, setStoredSession } from "../lib/session";

const DEFAULT_ADMIN_EMAIL = "admin.quiz@gmail.com";
const DEFAULT_ADMIN_NAME = "Quiz Admin";

export function LoginCard({
  onSuccess,
  targetHref = "/dashboard",
  adminShortcut = false
}: {
  onSuccess?: () => void;
  targetHref?: string;
  adminShortcut?: boolean;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submitLogin(nextEmail: string, nextName: string) {
    setError(null);

    startTransition(async () => {
      try {
        const result = await loginWithEmailOnly({ email: nextEmail, name: nextName });

        setStoredSession({
          accessToken: result.access_token,
          email: result.user.email,
          name: result.user.name,
          userId: result.user.id,
          isAdmin: result.user.is_admin,
          expiresAt: getTokenExpiry(result.access_token)
        });

        onSuccess?.();
        router.push(result.user.is_admin && targetHref === "/dashboard" ? "/admin" : targetHref);
        router.refresh();
      } catch (loginError) {
        setError(loginError instanceof Error ? loginError.message : "Login failed");
      }
    });
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    submitLogin(email, name);
  }

  function handleAdminShortcut() {
    setEmail(DEFAULT_ADMIN_EMAIL);
    setName(DEFAULT_ADMIN_NAME);
    submitLogin(DEFAULT_ADMIN_EMAIL, DEFAULT_ADMIN_NAME);
  }

  return (
    <div className="auth-card">
      <div className="chip">Email Validation</div>
      <h2 className="card-title">Enter with a verified email</h2>
      <p className="muted">
        Google OAuth is disabled for now. This login validates email format and creates a session
        instantly so you can keep building.
      </p>

      <form onSubmit={handleSubmit} className="auth-form">
        <label className="field">
          <span>Email</span>
          <input value={email} onChange={(event) => setEmail(event.target.value)} />
        </label>

        <label className="field">
          <span>Display name</span>
          <input value={name} onChange={(event) => setName(event.target.value)} />
        </label>

        <button type="submit" className="solid-button" disabled={isPending}>
          {isPending ? "Signing in..." : "Continue"}
        </button>
      </form>

      {adminShortcut ? (
        <div style={{ marginTop: 12 }}>
          <button type="button" className="ghost-button" disabled={isPending} onClick={handleAdminShortcut}>
            {isPending ? "Signing in..." : "Continue as Admin"}
          </button>
        </div>
      ) : null}

      {error ? (
        <div className="notice error" style={{ marginTop: 12 }}>
          {error}
        </div>
      ) : null}
    </div>
  );
}
