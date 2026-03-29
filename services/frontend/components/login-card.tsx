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
    <div className="auth-card auth-card--premium">
      <div className="auth-card__top">
        <div className="chip">Instant Access</div>
        <span className="auth-card__spark">Local Demo Mode</span>
      </div>

      <h2 className="card-title">Enter the arena in seconds</h2>
      <p className="auth-card__copy">
        Use any valid email to create a player session instantly. Wallet, contests, and leaderboard
        flows are ready the moment you sign in.
      </p>

      <div className="auth-card__trust">
        <div className="auth-card__trust-item">
          <strong>Fast login</strong>
          <span>No waiting on external auth setup.</span>
        </div>
        <div className="auth-card__trust-item">
          <strong>Wallet ready</strong>
          <span>Track debits, credits, and prize history.</span>
        </div>
        <div className="auth-card__trust-item">
          <strong>Contest access</strong>
          <span>Jump into player and admin flows quickly.</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="auth-form">
        <label className="field auth-field">
          <span>Email</span>
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="player.one@gmail.com"
          />
        </label>

        <label className="field auth-field">
          <span>Display name</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Player One"
          />
        </label>

        <button type="submit" className="solid-button auth-card__button" disabled={isPending}>
          {isPending ? "Signing in..." : "Continue"}
        </button>
      </form>

      {adminShortcut ? (
        <div style={{ marginTop: 12 }}>
          <button
            type="button"
            className="ghost-button auth-card__ghost"
            disabled={isPending}
            onClick={handleAdminShortcut}
          >
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
