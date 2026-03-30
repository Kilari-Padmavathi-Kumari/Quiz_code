"use client";

import Link from "next/link";
import { startTransition, useEffect, useState } from "react";

import { LoginCard } from "../../components/login-card";
import { SiteShell } from "../../components/site-shell";
import { useFrontendSession } from "../../components/session-panel";
import {
  type PrizeRule,
  getAllContests,
  getContestHistory,
  getWalletBalance,
  getWalletRequests,
  getWalletTransactions,
  joinContest,
  requestMoney
} from "../../lib/api";

interface ContestItem {
  id: string;
  title: string;
  status: string;
  entry_fee: string;
  max_members: number;
  member_count: number;
  starts_at: string;
  prize_pool: string;
  prize_rule: PrizeRule;
}

interface WalletTransactionItem {
  id: string;
  type: "credit" | "debit";
  reason: "entry_fee" | "prize" | "refund" | "topup" | "manual_topup";
  amount: string;
  balance_before: string;
  balance_after: string;
  reference_id: string | null;
  metadata?: {
    contestId?: string;
    contestTitle?: string;
    source?: string;
  };
  created_at: string;
}

interface ContestHistoryItem {
  contest_id: string;
  title: string;
  status: string;
  entry_fee: string;
  member_count: number;
  max_members: number;
  starts_at: string;
  joined_at: string;
  is_winner: boolean;
  prize_amount: string;
  correct_count: string;
  prize_pool: string;
  prize_rule: PrizeRule;
}

interface WalletRequestItem {
  id: string;
  amount: string;
  status: "pending" | "approved" | "rejected";
  requested_at: string;
  reviewed_at: string | null;
}

type ContestTab = "all" | "current" | "future" | "past";
const CONTEST_TAB_STORAGE_KEY = "quiz-app-dashboard-contest-tab";

function getPrizeRuleLabel(prizeRule: PrizeRule) {
  return prizeRule === "all_correct" ? "All Correct" : "Top Scorer";
}

function getPrizeRuleDescription(prizeRule: PrizeRule) {
  return prizeRule === "all_correct"
    ? "Only players with full marks win this contest."
    : "The highest correct score wins; ties split the prize.";
}

function formatTransactionReason(transaction: WalletTransactionItem) {
  if (transaction.reason === "entry_fee") {
    return transaction.metadata?.contestTitle
      ? `Contest joined: ${transaction.metadata.contestTitle}`
      : "Contest entry fee";
  }

  if (transaction.reason === "manual_topup") {
    return "Wallet top-up";
  }

  if (transaction.reason === "prize") {
    return transaction.metadata?.contestTitle
      ? `Prize won: ${transaction.metadata.contestTitle}`
      : transaction.reference_id
        ? `Prize won: Contest ${transaction.reference_id}`
        : "Contest prize";
  }

  if (transaction.reason === "refund") {
    return transaction.metadata?.contestTitle
      ? `Refund received: ${transaction.metadata.contestTitle}`
      : transaction.reference_id
        ? `Refund received: Contest ${transaction.reference_id}`
        : "Contest refund";
  }

  return "Wallet update";
}

function getContestBucket(contest: ContestItem) {
  const startsAtMs = new Date(contest.starts_at).getTime();
  const now = Date.now();

  if (contest.status === "ended" || contest.status === "cancelled") {
    return "past";
  }

  if (contest.status === "live" || contest.status === "open") {
    return "current";
  }

  if (contest.status === "draft" && startsAtMs > now) {
    return "future";
  }

  return "past";
}

export default function DashboardPage() {
  const { session, isReady } = useFrontendSession();
  const [walletBalance, setWalletBalance] = useState<string>("0.00");
  const [contests, setContests] = useState<ContestItem[]>([]);
  const [contestHistory, setContestHistory] = useState<ContestHistoryItem[]>([]);
  const [transactions, setTransactions] = useState<WalletTransactionItem[]>([]);
  const [walletRequests, setWalletRequests] = useState<WalletRequestItem[]>([]);
  const [amount, setAmount] = useState("50");
  const [contestLookupId, setContestLookupId] = useState("");
  const [contestTab, setContestTab] = useState<ContestTab>("all");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [busyAction, setBusyAction] = useState<string | null>(null);

  const totalContestAttempts = contestHistory.length;
  const totalWins = contestHistory.filter((contest) => contest.is_winner).length;
  const totalPrizeWon = contestHistory
    .reduce((total, contest) => total + Number(contest.prize_amount), 0)
    .toFixed(2);
  const pendingWalletRequest = walletRequests.find((request) => request.status === "pending") ?? null;
  const currentContests = contests.filter((contest) => getContestBucket(contest) === "current");
  const futureContests = contests.filter((contest) => getContestBucket(contest) === "future");
  const pastContests = contests.filter((contest) => getContestBucket(contest) === "past");
  const visibleContests =
    contestTab === "all"
      ? contests
      : contestTab === "current"
        ? currentContests
        : contestTab === "future"
          ? futureContests
          : pastContests;

  const tabMeta: Record<
    ContestTab,
    { eyebrow: string; title: string; empty: string; label: string; icon: string }
  > = {
    all: {
      eyebrow: "All Contests",
      title: "Every contest in one place",
      empty: "No contests available right now.",
      label: "All",
      icon: "Grid"
    },
    current: {
      eyebrow: "Current Contests",
      title: "Join what is active now",
      empty: "No current contests right now. Create or publish one from the admin console.",
      label: "Current",
      icon: "Live"
    },
    future: {
      eyebrow: "Upcoming Contests",
      title: "Future contests to watch",
      empty: "No future contests scheduled right now.",
      label: "Upcoming",
      icon: "Soon"
    },
    past: {
      eyebrow: "Past Contests",
      title: "Previous rounds and results",
      empty: "No past contests yet.",
      label: "Past",
      icon: "Done"
    }
  };

  async function loadData(accessToken: string) {
    setError(null);
    setIsLoadingData(true);

    try {
      const [walletResult, contestResult, transactionsResult, contestHistoryResult, walletRequestsResult] = await Promise.all([
        getWalletBalance(accessToken),
        getAllContests(),
        getWalletTransactions(accessToken),
        getContestHistory(accessToken),
        getWalletRequests(accessToken)
      ]);

      setWalletBalance(walletResult.wallet_balance);
      setContests(contestResult.contests);
      setTransactions(transactionsResult.transactions);
      setContestHistory(contestHistoryResult.contests);
      setWalletRequests(walletRequestsResult.requests);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load dashboard");
    } finally {
      setIsLoadingData(false);
    }
  }

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const storedTab = window.localStorage.getItem(CONTEST_TAB_STORAGE_KEY) as ContestTab | null;
    if (storedTab && ["all", "current", "future", "past"].includes(storedTab)) {
      setContestTab(storedTab);
    }
  }, []);

  useEffect(() => {
    if (!session?.accessToken) {
      return;
    }

    startTransition(() => {
      void loadData(session.accessToken);
    });
  }, [session]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(CONTEST_TAB_STORAGE_KEY, contestTab);
  }, [contestTab]);

  if (!isReady) {
    return (
      <SiteShell title="Player Dashboard" subtitle="Loading local session...">
        <div className="notice">Checking saved session...</div>
      </SiteShell>
    );
  }

  if (!session) {
    return (
      <SiteShell
        title="Player Dashboard"
        subtitle="Request a one-time code to access wallet, contests, and live gameplay."
      >
        <LoginCard targetHref="/dashboard" />
      </SiteShell>
    );
  }

  return (
    <SiteShell
      title="Player Dashboard"
      subtitle="Request wallet credit, join a live contest, and jump into the real-time game room."
    >
      <div className="grid three">
        <div className="stat-card">
          <div className="eyebrow">Wallet</div>
          <div className="stat-value">Rs {walletBalance}</div>
          <p className="muted">
            Wallet balance updates after an admin approves your credit request.
          </p>
        </div>

        <div className="stat-card">
          <div className="eyebrow">Performance</div>
          <div className="stat-value">{totalWins}/{totalContestAttempts}</div>
          <p className="muted">
            Contest wins and total attempts from your joined contest history.
          </p>
        </div>

        <div className="stat-card">
          <div className="eyebrow">Prize Credits</div>
          <div className="stat-value">Rs {totalPrizeWon}</div>
          <p className="muted">
            Total prize money credited back to this wallet across completed contests.
          </p>
        </div>
      </div>

      <div className="grid two" style={{ marginTop: 18 }}>
        <div className="card">
          <div className="eyebrow">Request Money</div>
          <label className="field" style={{ marginTop: 12 }}>
            <span>Amount</span>
            <input value={amount} onChange={(event) => setAmount(event.target.value)} />
          </label>
          <p className="muted" style={{ marginTop: 12 }}>
            This sends a wallet credit request to admin. Your balance will change only after approval.
          </p>
          {pendingWalletRequest ? (
            <div className="notice warn" style={{ marginTop: 12 }}>
              You already have a pending request for Rs {pendingWalletRequest.amount}. Wait for admin approval first.
            </div>
          ) : null}
          <button
            type="button"
            className="solid-button"
            disabled={busyAction === "request-money" || Boolean(pendingWalletRequest)}
            onClick={() => {
              setMessage(null);
              setError(null);
              setBusyAction("request-money");

              startTransition(async () => {
                try {
                  await requestMoney(session.accessToken, Number(amount));
                  setMessage("Success: wallet credit request sent to admin.");
                  await loadData(session.accessToken);
                } catch (topupError) {
                  setError(topupError instanceof Error ? topupError.message : "Wallet request failed");
                } finally {
                  setBusyAction(null);
                }
              });
            }}
          >
            {pendingWalletRequest
              ? "Request Pending"
              : busyAction === "request-money"
                ? "Sending request..."
                : "Send Wallet Request"}
          </button>
        </div>

        <div className="card">
          <div className="eyebrow">Account</div>
          <h3>{session.name}</h3>
          <p className="muted mono">{session.email}</p>
          <p className="muted" style={{ marginTop: 12 }}>
            {session.isAdmin
              ? "This account can access both player and admin workflows."
              : "This account can join contests, watch results, and track wallet history."}
          </p>
          <div className="pill-row">
            <span className="pill">{session.isAdmin ? "Admin Access" : "Player Access"}</span>
            <button
              type="button"
              className="ghost-button"
              disabled={isLoadingData}
              onClick={() => {
                startTransition(() => {
                  void loadData(session.accessToken);
                });
              }}
            >
              {isLoadingData ? "Refreshing..." : "Refresh Data"}
            </button>
          </div>
        </div>
      </div>

      <div className="grid two" style={{ marginTop: 18 }}>
        <div className="card">
          <div className="eyebrow">Quick Open</div>
          <label className="field" style={{ marginTop: 12 }}>
            <span>Contest ID</span>
            <input
              value={contestLookupId}
              onChange={(event) => setContestLookupId(event.target.value)}
              placeholder="Paste a contest UUID"
            />
          </label>
          <div className="stack-row">
            <Link
              href={contestLookupId ? `/contests/${contestLookupId}/live` : "/dashboard"}
              className="ghost-button"
            >
              Open Live Room
            </Link>
            <Link
              href={contestLookupId ? `/contests/${contestLookupId}/leaderboard` : "/dashboard"}
              className="solid-button"
            >
              Open Leaderboard
            </Link>
          </div>
        </div>

        <div className="card">
          <div className="eyebrow">Dashboard Guide</div>
          <div className="list" style={{ marginTop: 14 }}>
            <div className="notice">
              Send a wallet request first, then wait for admin approval before the balance appears in your account.
            </div>
            <div className="notice">
              Join a contest from the list below and the entry fee will appear in wallet history as a debit.
            </div>
            <div className="notice">
              When a contest ends, winnings appear in wallet history as a credit and the contest moves to Contest History.
            </div>
            <div className="notice">
              Use the leaderboard button in Contest History to check who won after the contest finishes.
            </div>
          </div>
        </div>
      </div>

      {message ? <div className="notice success" style={{ marginTop: 18 }}>{message}</div> : null}
      {error ? <div className="notice error" style={{ marginTop: 18 }}>{error}</div> : null}

      {isLoadingData ? (
        <div className="loading-grid" style={{ marginTop: 22 }}>
          <div className="loading-card" />
          <div className="loading-card" />
          <div className="loading-card" />
        </div>
      ) : null}

      <section style={{ marginTop: 22 }}>
        <div className="hero-actions" style={{ justifyContent: "space-between" }}>
          <div>
            <div className="eyebrow">Request Status</div>
            <h2 className="section-title">Wallet requests</h2>
          </div>
        </div>

        <div className="list">
          {walletRequests.length === 0 ? (
            <div className="empty-state">
              <strong>No wallet requests yet</strong>
              <p>Send a request above and admin approval updates will appear here.</p>
            </div>
          ) : null}

          {walletRequests.map((request) => (
            <article key={request.id} className="notice notice-luxe">
              <div className="stack-row" style={{ justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <strong>Requested Rs {request.amount}</strong>
                  <div className="muted">Requested {new Date(request.requested_at).toLocaleString()}</div>
                  {request.reviewed_at ? (
                    <div className="muted">Reviewed {new Date(request.reviewed_at).toLocaleString()}</div>
                  ) : (
                    <div className="muted">Waiting for admin approval</div>
                  )}
                </div>

                <div className="pill-row">
                  <span
                    className={
                      request.status === "approved"
                        ? "pill gold"
                        : request.status === "rejected"
                          ? "pill rose"
                          : "pill"
                    }
                  >
                    {request.status}
                  </span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section style={{ marginTop: 22 }}>
        <div className="hero-actions" style={{ justifyContent: "space-between" }}>
          <div>
            <div className="eyebrow">Payment History</div>
            <h2 className="section-title">Wallet ledger</h2>
          </div>
        </div>

        <div className="list">
          {transactions.length === 0 ? (
            <div className="empty-state">
              <strong>No wallet activity yet</strong>
              <p>
                After this user adds money, joins a contest, gets a refund, or wins a prize, the ledger will show the
                full money trail here.
              </p>
            </div>
          ) : null}

          {transactions.map((transaction) => (
            <article key={transaction.id} className="notice notice-luxe">
              <div className="stack-row" style={{ justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <strong>{formatTransactionReason(transaction)}</strong>
                  <div className="muted">{new Date(transaction.created_at).toLocaleString()}</div>
                  <div className="muted">
                    {transaction.type === "credit" ? "Credit" : "Debit"} | Before Rs {transaction.balance_before}
                  </div>
                </div>

                <div className="pill-row">
                  <span className={`pill ${transaction.type === "credit" ? "gold" : "rose"}`}>
                    {transaction.type === "credit" ? "+" : "-"}Rs {transaction.amount}
                  </span>
                  <span className="pill">Balance Rs {transaction.balance_after}</span>
                </div>
              </div>

              {transaction.reference_id ? (
                <div className="mono" style={{ marginTop: 10, fontSize: "0.84rem" }}>
                  Ref: {transaction.reference_id}
                </div>
              ) : null}
            </article>
          ))}
        </div>
      </section>

      <section style={{ marginTop: 22 }}>
        <div className="hero-actions" style={{ justifyContent: "space-between" }}>
          <div>
            <div className="eyebrow">Contest History</div>
            <h2 className="section-title">Attempts, results, and winners</h2>
          </div>
        </div>

        <div className="list">
          {contestHistory.length === 0 ? (
            <div className="empty-state">
              <strong>No contest history yet</strong>
              <p>This section fills in after the current user joins and completes at least one contest.</p>
            </div>
          ) : null}

          {contestHistory.map((contest) => (
            <article key={contest.contest_id} className="contest-card contest-card--luxe">
              <div className="stack-row" style={{ justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <h3 style={{ margin: "0 0 8px" }}>{contest.title}</h3>
                  <div className="contest-meta">
                    <span className="pill">{contest.status}</span>
                    <span className="pill">{getPrizeRuleLabel(contest.prize_rule)}</span>
                    <span className="pill gold">Entry Rs {contest.entry_fee}</span>
                    <span className="pill">{contest.correct_count} correct</span>
                    <span className={contest.is_winner ? "pill gold" : "pill rose"}>
                      {contest.is_winner ? `Won Rs ${contest.prize_amount}` : "No prize"}
                    </span>
                  </div>
                </div>

                <div className="stack-row">
                  <Link href={`/contests/${contest.contest_id}/live`} className="ghost-button">
                    Open Contest
                  </Link>
                  {contest.status === "ended" ? (
                    <Link href={`/contests/${contest.contest_id}/leaderboard`} className="solid-button">
                      Leaderboard
                    </Link>
                  ) : null}
                </div>
              </div>

              <p className="muted" style={{ marginBottom: 0 }}>
                {getPrizeRuleDescription(contest.prize_rule)}
              </p>
              <p className="muted" style={{ marginBottom: 0, marginTop: 8 }}>
                Joined {new Date(contest.joined_at).toLocaleString()} | Starts {new Date(contest.starts_at).toLocaleString()}
              </p>
              <div className="mono" style={{ marginTop: 10, fontSize: "0.84rem" }}>
                {contest.contest_id} | {contest.member_count}/{contest.max_members} players | Prize pool Rs {contest.prize_pool}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section style={{ marginTop: 22 }}>
        <div className="hero-actions" style={{ justifyContent: "space-between" }}>
          <div>
            <div className="eyebrow">{tabMeta[contestTab].eyebrow}</div>
            <h2 className="section-title">{tabMeta[contestTab].title}</h2>
          </div>
        </div>

        <div className="tab-row" style={{ marginTop: 14, marginBottom: 18 }}>
          {(["all", "current", "future", "past"] as ContestTab[]).map((tab) => (
            <button
              key={tab}
              type="button"
              className={contestTab === tab ? "tab-button tab-button--active" : "tab-button"}
              onClick={() => setContestTab(tab)}
            >
              <span className="tab-button__icon">{tabMeta[tab].icon}</span>
              <span className="tab-button__label">
                {tabMeta[tab].label}
                {tab === "all" ? ` (${contests.length})` : null}
                {tab === "current" ? ` (${currentContests.length})` : null}
                {tab === "future" ? ` (${futureContests.length})` : null}
                {tab === "past" ? ` (${pastContests.length})` : null}
              </span>
            </button>
          ))}
        </div>

        <div className="list">
          {visibleContests.length === 0 ? (
            <div className="empty-state">
              <strong>{tabMeta[contestTab].title}</strong>
              <p>{tabMeta[contestTab].empty}</p>
            </div>
          ) : null}

          {visibleContests.map((contest) => (
            <article key={contest.id} className="contest-card contest-card--luxe">
              <div className="stack-row" style={{ justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <h3 style={{ margin: "0 0 8px" }}>{contest.title}</h3>
                  <div className="contest-meta">
                    <span className="pill">{contest.status}</span>
                    <span className="pill">{getPrizeRuleLabel(contest.prize_rule)}</span>
                    <span className="pill gold">Entry Rs {contest.entry_fee}</span>
                    <span className="pill">{contest.member_count}/{contest.max_members} joined</span>
                    <span className="pill rose">Prize Rs {contest.prize_pool}</span>
                  </div>
                </div>

                <div className="stack-row">
                  {contest.status === "open" || contest.status === "live" ? (
                    <>
                      <button
                        type="button"
                        className="solid-button"
                        disabled={
                          busyAction === `join:${contest.id}` ||
                          contest.status !== "open" ||
                          contest.member_count >= contest.max_members
                        }
                        onClick={() => {
                          setMessage(null);
                          setError(null);
                          setBusyAction(`join:${contest.id}`);

                          startTransition(async () => {
                            try {
                              const result = await joinContest(session.accessToken, contest.id);
                              setWalletBalance(result.wallet_balance);
                              setMessage(`Success: joined ${contest.title}. Prize pool is now Rs ${result.prize_pool}.`);
                              await loadData(session.accessToken);
                            } catch (joinError) {
                              setError(joinError instanceof Error ? joinError.message : "Join failed");
                            } finally {
                              setBusyAction(null);
                            }
                          });
                        }}
                      >
                        {busyAction === `join:${contest.id}`
                          ? "Joining..."
                          : contest.status === "open"
                            ? "Join Contest"
                            : "Live Now"}
                      </button>

                      <Link href={`/contests/${contest.id}/live`} className="ghost-button">
                        Open Live View
                      </Link>
                    </>
                  ) : null}

                  {contest.status === "draft" ? (
                    <Link href={`/contests/${contest.id}/live`} className="ghost-button">
                      Preview Contest
                    </Link>
                  ) : null}

                  {contest.status === "ended" || contest.status === "cancelled" ? (
                    <>
                      <Link href={`/contests/${contest.id}/live`} className="ghost-button">
                        Open Contest
                      </Link>
                      {contest.status === "ended" ? (
                        <Link href={`/contests/${contest.id}/leaderboard`} className="solid-button">
                          View Leaderboard
                        </Link>
                      ) : null}
                    </>
                  ) : null}
                </div>
              </div>

              <p className="muted" style={{ marginBottom: 0 }}>
                {getPrizeRuleDescription(contest.prize_rule)}
              </p>
              <p className="muted" style={{ marginBottom: 0, marginTop: 8 }}>
                {contest.status === "ended" || contest.status === "cancelled" ? "Started" : "Starts"} at{" "}
                {new Date(contest.starts_at).toLocaleString()}
              </p>
              <div className="mono" style={{ marginTop: 10, fontSize: "0.84rem" }}>
                {contest.id}
              </div>
            </article>
          ))}
        </div>
      </section>
    </SiteShell>
  );
}
