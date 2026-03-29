"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import clsx from "clsx";

import { clearStoredSession, getStoredSession, type FrontendSession } from "../lib/session";

export function SiteShell({
  children,
  title,
  subtitle
}: {
  children: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [session, setSession] = useState<FrontendSession | null>(null);

  useEffect(() => {
    setSession(getStoredSession());
  }, [pathname]);

  return (
    <div className="shell">
      <div className="app-layout">
        <aside className="side-nav">
          <Link href="/" className="brand">
            <span className="brand-mark">QZ</span>
            <span className="brand-text">Quick Quiz Arena</span>
          </Link>

          <div className="nav-links">
            <Link href="/" className={clsx("nav-item", pathname === "/" && "nav-item--active")}>
              Home
            </Link>
            <Link
              href="/admin"
              className={clsx("nav-item", pathname === "/admin" && "nav-item--active")}
            >
              Admin
            </Link>
            {session ? (
              <button
                type="button"
                className="nav-item"
                onClick={() => {
                  clearStoredSession();
                  setSession(null);
                  router.push("/");
                  router.refresh();
                }}
              >
                Logout
              </button>
            ) : (
              <Link href="/" className="nav-item">
                Login
              </Link>
            )}
            <Link
              href="/dashboard"
              className={clsx("nav-item", pathname === "/dashboard" && "nav-item--active")}
            >
              Dashboard
            </Link>
            {session ? (
              <span className="status-pill">{session.email}</span>
            ) : (
              <span className="status-pill status-pill--ghost">Guest Mode</span>
            )}
          </div>
        </aside>

        <main className="main">
          <section className="hero-strip">
            <div className="hero-badge">Live Ops Ready</div>
            <h1 className="hero-title">{title}</h1>
            <p className="hero-subtitle">{subtitle}</p>
          </section>

          {children}
        </main>
      </div>
    </div>
  );
}
