import Link from "next/link";

import { LoginCard } from "../components/login-card";
import { SiteShell } from "../components/site-shell";

const highlights = [
  "Live contests with up to 100 players and pooled prize money",
  "BullMQ-driven lifecycle: start, reveal, broadcast, end, payouts",
  "Wallet ledger integrity with immutable transaction history",
  "Redis rebuild + job recovery for crash-safe gameplay"
];

export default function HomePage() {
  return (
    <SiteShell
      title="Real-time quiz contests built for scale and fairness."
      subtitle="Mobile-first gameplay, timed answers, and automated payouts. Everything runs with resilient infra so contests never go silent."
    >
      <section className="grid-split">
        <div className="panel panel-hero">
          <div className="panel-header">
            <span className="chip">Production Blueprint</span>
            <h2>Fast rounds. Trusted payouts. Always live.</h2>
            <p className="muted">
              Players join a Rs 10 contest, race through timed questions, and split the prize pool if
              they ace the round. Admins can publish, recover, and monitor jobs without leaving the
              dashboard.
            </p>
          </div>

          <div className="panel-actions">
            <Link href="/dashboard" className="solid-button">
              Open Player Dashboard
            </Link>
            <Link href="/admin" className="ghost-button">
              Open Admin Console
            </Link>
          </div>

          <div className="panel-grid">
            {highlights.map((item) => (
              <div key={item} className="notice">
                {item}
              </div>
            ))}
          </div>
        </div>

        <LoginCard />
      </section>

      <section className="panel panel-flow" style={{ marginTop: 26 }}>
        <div className="panel-header">
          <span className="chip">Quick Start Flow</span>
          <h3>From login to live contest in minutes</h3>
        </div>
        <div className="panel-grid">
          <div className="notice">
            Use the one-time code login to create your player session and wallet.
          </div>
          <div className="notice">
            Visit the dashboard to top up balance and join an open contest.
          </div>
          <div className="notice">
            Use the admin console to publish contests and recover jobs if Redis resets.
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
