"use client";

import { useParams } from "next/navigation";
import { startTransition, useEffect, useState } from "react";

import { SiteShell } from "../../../../components/site-shell";
import { getLeaderboard, type PrizeRule } from "../../../../lib/api";

interface LeaderboardRow {
  user_id: string;
  name: string;
  avatar_url: string | null;
  correct_count: string;
  is_winner: boolean;
  prize_amount: string;
}

function getPrizeRuleLabel(prizeRule: PrizeRule) {
  return prizeRule === "all_correct" ? "All Correct" : "Top Scorer";
}

function getPrizeRuleDescription(prizeRule: PrizeRule) {
  return prizeRule === "all_correct"
    ? "Only players who answer every question correctly become winners."
    : "The player with the highest correct score wins, and ties split the prize.";
}

export default function LeaderboardPage() {
  const params = useParams<{ id: string }>();
  const contestId = params.id;
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [contestTitle, setContestTitle] = useState("");
  const [prizeRule, setPrizeRule] = useState<PrizeRule | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    startTransition(async () => {
      try {
        const result = await getLeaderboard(contestId);
        setContestTitle(result.contest.title);
        setPrizeRule(result.contest.prize_rule);
        setRows(result.leaderboard);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Failed to load leaderboard");
      }
    });
  }, [contestId]);

  return (
    <SiteShell
      title="Contest Leaderboard"
      subtitle="Final ranking, winners, and prize amounts for the selected contest."
    >
      <div className="card card-luxe">
        <div className="eyebrow">Contest</div>
        <h2 style={{ margin: "12px 0 0" }}>{contestTitle || "Contest Result"}</h2>
        {prizeRule ? (
          <>
            <div className="pill-row" style={{ marginTop: 12 }}>
              <span className="pill gold">{getPrizeRuleLabel(prizeRule)}</span>
            </div>
            <p className="muted" style={{ marginTop: 12, marginBottom: 0 }}>
              {getPrizeRuleDescription(prizeRule)}
            </p>
          </>
        ) : null}
        <div className="mono" style={{ marginTop: 12 }}>
          {contestId}
        </div>
      </div>

      {error ? <div className="notice error" style={{ marginTop: 18 }}>{error}</div> : null}

      <div className="leaderboard-board" style={{ marginTop: 18 }}>
        {rows.map((row, index) => (
          <div
            key={row.user_id}
            className={row.is_winner ? "leaderboard-row leaderboard-row--winner" : "leaderboard-row"}
          >
            <div className="stack-row" style={{ justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div className="leaderboard-rankline">
                  <span className="leaderboard-rank">#{index + 1}</span>
                  <h3 style={{ margin: 0 }}>{row.name}</h3>
                </div>
                <div className="pill-row" style={{ marginTop: 8 }}>
                  <span className="pill">Correct {row.correct_count}</span>
                  {row.is_winner ? <span className="pill gold">Winner</span> : null}
                  <span className="pill rose">Prize Rs {row.prize_amount}</span>
                </div>
              </div>

              <div className="leaderboard-score">
                <div className="leaderboard-score__value">{row.correct_count}</div>
                <div className="leaderboard-score__label">correct</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </SiteShell>
  );
}
