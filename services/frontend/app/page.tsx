import Link from "next/link";

import { LoginCard } from "../components/login-card";
import { SiteShell } from "../components/site-shell";

const stats = [
  { value: "100", label: "players per contest" },
  { value: "15s", label: "tight answer windows" },
  { value: "24/7", label: "recovery-ready operations" }
];

const featureCards = [
  {
    eyebrow: "Gameplay",
    title: "Fast rounds built for pressure",
    copy:
      "Short question timers, live room updates, and focused mobile-first flows make each contest feel urgent from the first second."
  },
  {
    eyebrow: "Trust",
    title: "Wallet and payouts stay auditable",
    copy:
      "Every contest entry, credit, refund, and prize movement lands in ledger-backed wallet history so players can verify what changed."
  },
  {
    eyebrow: "Operations",
    title: "Admins stay in control during live traffic",
    copy:
      "Publish contests, rebuild cache, inspect queues, and recover jobs without leaving the app when something needs attention."
  }
];

const showcasePoints = [
  "Live contest rooms with real-time player flow",
  "Redis-backed state plus BullMQ job orchestration",
  "Contest history, leaderboard paths, and wallet ledger visibility",
  "Admin recovery controls for safer local and deployed runs"
];

const steps = [
  "Sign in instantly and open the player dashboard.",
  "Top up the wallet and join a contest before it goes live.",
  "Track debits, winnings, and results from the same dashboard."
];

export default function HomePage() {
  return (
    <SiteShell
      title="A modern live quiz arena that feels competitive, polished, and reliable."
      subtitle="Built for sharp first impressions: premium player flows, resilient contest operations, and real-time gameplay that still feels trustworthy under pressure."
    >
      <section className="landing-hero">
        <div className="landing-hero__content landing-fade-up">
          <div className="landing-kicker landing-fade-up landing-delay-1">Live Quiz Platform</div>
          <h2 className="landing-display">
            Turn timed trivia into a product people want to explore immediately.
          </h2>
          <p className="landing-copy landing-fade-up landing-delay-2">
            Quick Quiz Arena combines a polished player dashboard, real-time contest delivery,
            wallet-backed transaction history, and admin recovery tooling into one experience that
            feels closer to a modern game product than a demo screen.
          </p>

          <div className="landing-actions landing-fade-up landing-delay-3">
            <Link href="/dashboard" className="solid-button">
              Explore Dashboard
            </Link>
            <Link href="/admin" className="ghost-button">
              Open Admin Console
            </Link>
          </div>

          <div className="landing-stats">
            {stats.map((stat) => (
              <div key={stat.label} className="landing-stat landing-hover-card landing-fade-up landing-delay-4">
                <div className="landing-stat__value">{stat.value}</div>
                <div className="landing-stat__label">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="landing-hero__side landing-fade-up landing-delay-2">
          <div className="landing-preview landing-float">
            <div className="landing-preview__top">
              <span className="chip">Premium Player Flow</span>
              <span className="landing-preview__badge">Ready for Demo</span>
            </div>

            <div className="landing-preview__board">
              <div className="landing-preview__panel landing-preview__panel--primary landing-hover-card">
                <div className="eyebrow">Contest Pulse</div>
                <h3>Friday Night Sprint</h3>
                <div className="pill-row">
                  <span className="pill gold">Entry Rs 10</span>
                  <span className="pill">74/100 joined</span>
                  <span className="pill rose">Prize Rs 740</span>
                </div>
              </div>

              <div className="landing-preview__panel landing-hover-card">
                <div className="eyebrow">Wallet Story</div>
                <div className="landing-mini-list">
                  <div className="landing-mini-item">
                    <strong>- Rs 10</strong>
                    <span>Contest entry debit</span>
                  </div>
                  <div className="landing-mini-item">
                    <strong>+ Rs 120</strong>
                    <span>Prize credit after results</span>
                  </div>
                </div>
              </div>

              <div className="landing-preview__panel landing-preview__panel--accent landing-hover-card">
                <div className="eyebrow">Leaderboard Feel</div>
                <div className="landing-mini-list">
                  <div className="landing-mini-rank">
                    <span>#1</span>
                    <strong>Player One</strong>
                  </div>
                  <div className="landing-mini-rank">
                    <span>#2</span>
                    <strong>Player Two</strong>
                  </div>
                  <div className="landing-mini-rank">
                    <span>#3</span>
                    <strong>You</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <LoginCard />
        </div>
      </section>

      <section className="landing-feature-grid" style={{ marginTop: 28 }}>
        {featureCards.map((card) => (
          <article key={card.title} className="landing-feature-card landing-hover-card landing-fade-up landing-delay-3">
            <div className="eyebrow">{card.eyebrow}</div>
            <h3>{card.title}</h3>
            <p className="muted">{card.copy}</p>
          </article>
        ))}
      </section>

      <section className="landing-showcase" style={{ marginTop: 28 }}>
        <div className="landing-showcase__intro">
          <span className="chip">Why It Feels Better</span>
          <h3 className="section-title">A stronger first screen for players, admins, and reviewers</h3>
          <p className="muted">
            The home page now sets the tone immediately: competitive energy, trustworthy money
            movement, and a cleaner product story for anyone opening the project for the first time.
          </p>
        </div>

        <div className="landing-showcase__grid">
          <div className="landing-showcase__card landing-hover-card landing-fade-up landing-delay-2">
            <div className="eyebrow">Highlights</div>
            <div className="panel-grid" style={{ marginTop: 14 }}>
              {showcasePoints.map((point) => (
                <div key={point} className="notice">
                  {point}
                </div>
              ))}
            </div>
          </div>

          <div className="landing-showcase__card landing-showcase__card--timeline landing-hover-card landing-fade-up landing-delay-3">
            <div className="eyebrow">Player Journey</div>
            <div className="landing-timeline">
              {steps.map((step, index) => (
                <div key={step} className="landing-timeline__item">
                  <div className="landing-timeline__index">0{index + 1}</div>
                  <div>{step}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
