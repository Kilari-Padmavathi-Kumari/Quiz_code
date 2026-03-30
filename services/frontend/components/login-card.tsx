"use client";

import { useState } from "react";

import { API_URL } from "../lib/config";

type LoginCardProps = {
  targetHref?: string;
  adminShortcut?: boolean;
};

export function LoginCard({ targetHref = "/dashboard" }: LoginCardProps) {
  const [isPending, setIsPending] = useState(false);

  function continueWithGoogle() {
    setIsPending(true);
    const googleUrl = new URL(`${API_URL}/auth/google`);
    googleUrl.searchParams.set("redirect_to", targetHref);
    window.location.assign(googleUrl.toString());
  }

  return (
    <div className="auth-card auth-card--premium">
      <div className="auth-card__top">
        <span className="chip">Secure Access</span>
        <span className="auth-card__spark">Fast login</span>
      </div>

      <h2 className="card-title">Enter the arena in seconds</h2>
      <p className="auth-card__copy">
        Continue with Google to access contests, wallet history, leaderboard results, and admin
        tools.
      </p>

      <div className="auth-google-block">
        <div className="auth-google-block__label">Continue with Google</div>
        <button
          className="ghost-button auth-card__ghost auth-card__google-cta"
          type="button"
          disabled={isPending}
          onClick={continueWithGoogle}
          style={{ width: "100%" }}
        >
          {isPending ? "Redirecting to Google..." : "Continue with Google"}
        </button>
      </div>
    </div>
  );
}
