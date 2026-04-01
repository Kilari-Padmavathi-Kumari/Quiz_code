"use client";

import Link from "next/link";
import { startTransition, useEffect, useMemo, useState } from "react";

import { Avatar } from "../../components/avatar";
import { LoginCard } from "../../components/login-card";
import { SiteShell } from "../../components/site-shell";
import { useFrontendSession } from "../../components/session-panel";
import {
  addQuestion,
  approveWalletTopupRequest,
  createContest,
  getAdminContests,
  getAdminUsers,
  getJobs,
  getWalletTopupRequests,
  publishContest,
  recoverContest,
  rejectWalletTopupRequest,
  retryJob
} from "../../lib/api";

interface AdminContest {
  id: string;
  title: string;
  status: string;
  member_count: number;
  starts_at: string;
  prize_pool: string;
}

interface JobItem {
  job_id: string;
  queue: string;
  job_name: string;
  data?: Record<string, unknown>;
  status: string;
  attempts?: number;
  scheduled_for: string;
  failed_reason: string | null;
}

interface AdminUser {
  id: string;
  email: string;
  name: string;
  avatar_url: string | null;
  wallet_balance: string;
  is_admin: boolean;
  is_banned: boolean;
  created_at: string;
}

interface WalletTopupRequestItem {
  id: string;
  user_id: string;
  amount: string;
  status: "pending" | "approved" | "rejected";
  requested_at: string;
  reviewed_at: string | null;
  user_name: string;
  user_email: string;
}

function getStatusPillClass(status: string) {
  if (status === "live") {
    return "pill pill--live";
  }

  if (status === "open" || status === "pending") {
    return "pill pill--open";
  }

  if (status === "draft") {
    return "pill pill--draft";
  }

  if (status === "ended" || status === "approved" || status === "completed") {
    return "pill pill--ended";
  }

  if (status === "cancelled" || status === "rejected" || status === "failed") {
    return "pill pill--cancelled";
  }

  return "pill";
}

export default function AdminPage() {
  const { session, isReady } = useFrontendSession();
  const [contests, setContests] = useState<AdminContest[]>([]);
  const [jobs, setJobs] = useState<JobItem[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [walletRequests, setWalletRequests] = useState<WalletTopupRequestItem[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [busyAction, setBusyAction] = useState<string | null>(null);

  const [contestForm, setContestForm] = useState({
    title: "quiz-platform",
    starts_at: new Date(Date.now() + 10 * 60 * 1000).toISOString().slice(0, 16),
    entry_fee: "10",
    max_members: "100",
    prize_rule: "all_correct" as "all_correct" | "top_scorer"
  });

  const [selectedContestId, setSelectedContestId] = useState("");
  const [questionForm, setQuestionForm] = useState({
    seq: "1",
    body: "National Animal of India?",
    option_a: "Lion",
    option_b: "Elephant",
    option_c: "Tiger",
    option_d: "Leopard",
    correct_option: "c" as "a" | "b" | "c" | "d",
    time_limit_sec: "20"
  });
  const activeContests = contests.filter((contest) => contest.status === "open" || contest.status === "live").length;
  const endedContests = contests.filter((contest) => contest.status === "ended").length;

  async function loadAdminData(accessToken: string) {
    setError(null);
    setIsLoadingData(true);

    try {
      const [contestResult, jobsResult, usersResult, walletRequestsResult] = await Promise.all([
        getAdminContests(accessToken),
        getJobs(accessToken),
        getAdminUsers(accessToken),
        getWalletTopupRequests(accessToken)
      ]);

      setContests(contestResult.contests);
      setJobs(jobsResult.jobs);
      setUsers(usersResult.users);
      setWalletRequests(walletRequestsResult.requests);

      if (!selectedContestId && contestResult.contests.length > 0) {
        setSelectedContestId(contestResult.contests[0].id);
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load admin data");
    } finally {
      setIsLoadingData(false);
    }
  }

  useEffect(() => {
    if (!session?.accessToken || !session.isAdmin) {
      return;
    }

    startTransition(() => {
      void loadAdminData(session.accessToken);
    });
  }, [session]);

  const selectedContest = useMemo(
    () => contests.find((contest) => contest.id === selectedContestId) ?? null,
    [contests, selectedContestId]
  );

  if (!isReady) {
    return (
      <SiteShell title="Admin Console" subtitle="Loading admin session...">
        <div className="notice">Checking saved session...</div>
      </SiteShell>
    );
  }

  if (!session) {
    return (
      <SiteShell
        title="Admin Console"
        subtitle="Request a one-time code for the admin account to create contests, publish jobs, and inspect queue state."
      >
        <LoginCard targetHref="/admin" adminShortcut />
      </SiteShell>
    );
  }

  if (!session.isAdmin) {
    return (
      <SiteShell title="Admin Console" subtitle="This route is reserved for admin users.">
        <div className="notice error">
          The current session does not have admin access. Sign in using
          <span className="mono"> padmavathi.kilari@fissionlabs.com</span>.
        </div>
      </SiteShell>
    );
  }

  return (
    <SiteShell
      title="Admin Console"
      subtitle="Create contests, stage questions, monitor jobs, and manage wallet operations from one cleaner control room."
    >
      <section className="admin-hero">
        <div className="admin-hero__content">
          <div className="eyebrow">Control Room</div>
          <h2 className="section-title">Run live contests with a calmer, clearer operations surface</h2>
          <p className="muted">
            Draft contests, load questions, inspect queue pressure, and credit wallets from one page built to feel more like a modern live ops desk.
          </p>
          <div className="admin-hero__pills">
            <span className="pill pill--open">Queue aware</span>
            <span className="pill pill--live">Live recovery</span>
            <span className="pill pill--ended">Wallet approvals</span>
          </div>
        </div>

        <div className="admin-hero__stats">
          <div className="admin-stat-card admin-stat-card--contest">
            <span className="eyebrow">Contests</span>
            <div className="stat-value">{contests.length}</div>
            <div className="muted">Total tracked contests</div>
          </div>
          <div className="admin-stat-card admin-stat-card--live">
            <span className="eyebrow">Active</span>
            <div className="stat-value">{activeContests}</div>
            <div className="muted">Open or live right now</div>
          </div>
          <div className="admin-stat-card admin-stat-card--jobs">
            <span className="eyebrow">Jobs</span>
            <div className="stat-value">{jobs.length}</div>
            <div className="muted">Queued or recoverable items</div>
          </div>
          <div className="admin-stat-card admin-stat-card--results">
            <span className="eyebrow">Results</span>
            <div className="stat-value">{endedContests}</div>
            <div className="muted">Completed contests</div>
          </div>
        </div>
      </section>

      {message ? <div className="notice success">{message}</div> : null}
      {error ? <div className="notice error" style={{ marginTop: 14 }}>{error}</div> : null}
      {isLoadingData ? (
        <div className="loading-grid" style={{ marginTop: 20 }}>
          <div className="loading-card loading-card--panel" />
          <div className="loading-card loading-card--panel" />
        </div>
      ) : null}

      <div className="grid two" style={{ marginTop: 20 }}>
        <div className="card card-luxe admin-panel">
          <div className="admin-panel__header">
            <div>
              <div className="eyebrow">Create Contest</div>
              <h3 className="admin-panel__title">Contest setup</h3>
              <p className="muted admin-panel__copy">Define the title, timing, entry fee, and prize behavior before publishing.</p>
            </div>
          </div>
          <label className="field">
            <span>Title</span>
            <input
              value={contestForm.title}
              onChange={(event) => setContestForm((current) => ({ ...current, title: event.target.value }))}
            />
          </label>
          <label className="field">
            <span>Starts At</span>
            <input
              type="datetime-local"
              value={contestForm.starts_at}
              onChange={(event) => setContestForm((current) => ({ ...current, starts_at: event.target.value }))}
            />
          </label>
          <div className="grid two">
            <label className="field">
              <span>Entry Fee</span>
              <input
                value={contestForm.entry_fee}
                onChange={(event) => setContestForm((current) => ({ ...current, entry_fee: event.target.value }))}
              />
            </label>
            <label className="field">
              <span>Max Members</span>
              <input
                value={contestForm.max_members}
                onChange={(event) => setContestForm((current) => ({ ...current, max_members: event.target.value }))}
              />
            </label>
          </div>
          <label className="field">
            <span>Prize Rule</span>
            <select
              value={contestForm.prize_rule}
              onChange={(event) =>
                setContestForm((current) => ({
                  ...current,
                  prize_rule: event.target.value as "all_correct" | "top_scorer"
                }))
              }
            >
              <option value="all_correct">All Correct with top-scorer fallback</option>
              <option value="top_scorer">Top Scorer</option>
            </select>
          </label>
          <div className="admin-inline-note">
            <span className="pill pill--draft">Draft first</span>
            <span className="muted">Keep the contest in draft until questions are ready and the start time is in the future.</span>
          </div>
          <button
            type="button"
            className="solid-button"
            disabled={busyAction === "create-contest"}
            onClick={() => {
              setMessage(null);
              setError(null);
              setBusyAction("create-contest");

              startTransition(async () => {
                try {
                  const result = await createContest(session.accessToken, {
                    title: contestForm.title,
                    starts_at: new Date(contestForm.starts_at).toISOString(),
                    entry_fee: Number(contestForm.entry_fee),
                    max_members: Number(contestForm.max_members),
                    prize_rule: contestForm.prize_rule
                  });

                  setSelectedContestId(result.contest.id);
                  setMessage(`Success: created contest ${result.contest.id}.`);
                  await loadAdminData(session.accessToken);
                } catch (createError) {
                  setError(createError instanceof Error ? createError.message : "Contest creation failed");
                } finally {
                  setBusyAction(null);
                }
              });
            }}
          >
            {busyAction === "create-contest" ? "Creating..." : "Create Contest"}
          </button>
        </div>

        <div className="card card-luxe admin-panel">
          <div className="admin-panel__header">
            <div>
              <div className="eyebrow">Add Question</div>
              <h3 className="admin-panel__title">Question composer</h3>
              <p className="muted admin-panel__copy">Load the round in sequence and publish only when the selected contest is fully ready.</p>
            </div>
            {selectedContest ? (
              <div className="admin-selected-contest">
                <span className={getStatusPillClass(selectedContest.status)}>{selectedContest.status}</span>
                <strong>{selectedContest.title}</strong>
                <span className="mono">{selectedContest.id}</span>
              </div>
            ) : null}
          </div>
          <label className="field">
            <span>Contest</span>
            <select
              value={selectedContestId}
              onChange={(event) => setSelectedContestId(event.target.value)}
            >
              <option value="">Select contest</option>
              {contests.map((contest) => (
                <option key={contest.id} value={contest.id}>
                  {contest.title} ({contest.status})
                </option>
              ))}
            </select>
          </label>
          <div className="grid two">
            <label className="field">
              <span>Sequence</span>
              <input
                value={questionForm.seq}
                onChange={(event) => setQuestionForm((current) => ({ ...current, seq: event.target.value }))}
              />
            </label>
            <label className="field">
              <span>Time Limit</span>
              <input
                value={questionForm.time_limit_sec}
                onChange={(event) =>
                  setQuestionForm((current) => ({ ...current, time_limit_sec: event.target.value }))
                }
              />
            </label>
          </div>
          <label className="field">
            <span>Question</span>
            <textarea
              value={questionForm.body}
              onChange={(event) => setQuestionForm((current) => ({ ...current, body: event.target.value }))}
            />
          </label>
          <div className="grid two">
            <label className="field">
              <span>Option A</span>
              <input
                value={questionForm.option_a}
                onChange={(event) => setQuestionForm((current) => ({ ...current, option_a: event.target.value }))}
              />
            </label>
            <label className="field">
              <span>Option B</span>
              <input
                value={questionForm.option_b}
                onChange={(event) => setQuestionForm((current) => ({ ...current, option_b: event.target.value }))}
              />
            </label>
            <label className="field">
              <span>Option C</span>
              <input
                value={questionForm.option_c}
                onChange={(event) => setQuestionForm((current) => ({ ...current, option_c: event.target.value }))}
              />
            </label>
            <label className="field">
              <span>Option D</span>
              <input
                value={questionForm.option_d}
                onChange={(event) => setQuestionForm((current) => ({ ...current, option_d: event.target.value }))}
              />
            </label>
          </div>
          <label className="field">
            <span>Correct Option</span>
            <select
              value={questionForm.correct_option}
              onChange={(event) =>
                setQuestionForm((current) => ({
                  ...current,
                  correct_option: event.target.value as "a" | "b" | "c" | "d"
                }))
              }
            >
              <option value="a">a</option>
              <option value="b">b</option>
              <option value="c">c</option>
              <option value="d">d</option>
            </select>
          </label>
          <div className="stack-row">
            <button
              type="button"
              className="solid-button"
              disabled={!selectedContestId}
              onClick={() => {
                if (!selectedContestId) {
                  setError("Select a contest first.");
                  return;
                }

                setMessage(null);
                setError(null);
                setBusyAction("add-question");

                startTransition(async () => {
                  try {
                    const result = await addQuestion(session.accessToken, selectedContestId, {
                      seq: Number(questionForm.seq),
                      body: questionForm.body,
                      option_a: questionForm.option_a,
                      option_b: questionForm.option_b,
                      option_c: questionForm.option_c,
                      option_d: questionForm.option_d,
                      correct_option: questionForm.correct_option,
                      time_limit_sec: Number(questionForm.time_limit_sec)
                    });

                    setMessage(`Success: added question ${result.question.seq} to ${selectedContestId}.`);
                    setQuestionForm((current) => ({
                      ...current,
                      seq: String(Number(current.seq) + 1)
                    }));
                    await loadAdminData(session.accessToken);
                  } catch (questionError) {
                    setError(questionError instanceof Error ? questionError.message : "Question add failed");
                  } finally {
                    setBusyAction(null);
                  }
                });
              }}
            >
              {busyAction === "add-question" ? "Adding..." : "Add Question"}
            </button>

            <button
              type="button"
              className="ghost-button"
              disabled={!selectedContestId}
              onClick={() => {
                if (!selectedContestId) {
                  return;
                }

                setMessage(null);
                setError(null);
                setBusyAction("publish-contest");

                startTransition(async () => {
                  try {
                    await publishContest(session.accessToken, selectedContestId);
                    setMessage(`Success: published contest ${selectedContestId}.`);
                    await loadAdminData(session.accessToken);
                  } catch (publishError) {
                    setError(publishError instanceof Error ? publishError.message : "Publish failed");
                  } finally {
                    setBusyAction(null);
                  }
                });
              }}
            >
              {busyAction === "publish-contest" ? "Publishing..." : "Publish Selected Contest"}
            </button>
          </div>
        </div>
      </div>

      <div className="grid two" style={{ marginTop: 22 }}>
        <div className="card card-luxe admin-panel">
          <div className="admin-panel__header">
            <div>
              <div className="eyebrow">Contest Monitor</div>
              <h3 className="admin-panel__title">Live contest control</h3>
              <p className="muted admin-panel__copy">Recover timelines, rebuild cache, and jump to finished results from one list.</p>
            </div>
          </div>
          <div className="list" style={{ marginTop: 16 }}>
            {contests.length === 0 ? (
              <div className="empty-state empty-state--history">
                <div className="empty-state__eyebrow">Contest Control</div>
                <strong>No contests yet</strong>
                <p>Create a contest above and it will appear here for recovery, publishing, and result tracking.</p>
              </div>
            ) : null}
            {contests.map((contest) => (
              <div key={contest.id} className={`contest-card contest-card--luxe admin-monitor-card admin-monitor-card--${contest.status}`}>
                <div className="contest-card__header">
                  <div className="contest-card__titleblock">
                    <div className="contest-card__timing">
                      {contest.status === "live" ? "Live now" : new Date(contest.starts_at).toLocaleDateString()}
                    </div>
                    <h3 className="contest-card__title">{contest.title}</h3>
                    <div className="pill-row">
                      <span className={getStatusPillClass(contest.status)}>{contest.status}</span>
                      <span className="pill gold">Prize Rs {contest.prize_pool}</span>
                      <span className="pill rose">{contest.member_count} joined</span>
                    </div>
                  </div>

                  <div className="contest-card__actions">
                    <button
                      type="button"
                      className="ghost-button"
                      onClick={() => {
                        setMessage(null);
                        setError(null);

                        startTransition(async () => {
                          try {
                            await recoverContest(session.accessToken, contest.id);
                            setMessage(`Recovery triggered for ${contest.id}`);
                            await loadAdminData(session.accessToken);
                          } catch (recoverError) {
                            setError(recoverError instanceof Error ? recoverError.message : "Recover failed");
                          }
                        });
                      }}
                    >
                      Recover
                    </button>

                    {contest.status === "ended" ? (
                      <Link href={`/contests/${contest.id}/leaderboard`} className="solid-button">
                        View Result
                      </Link>
                    ) : null}
                  </div>
                </div>

                <p className="muted contest-card__subcopy">
                  Starts at {new Date(contest.starts_at).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="card card-luxe admin-panel">
          <div className="admin-panel__header">
            <div>
              <div className="eyebrow">Job Monitor</div>
              <h3 className="admin-panel__title">Queue pressure and retries</h3>
              <p className="muted admin-panel__copy">Watch delayed, active, and failed jobs without leaving the console.</p>
            </div>
          </div>
          <div className="list" style={{ marginTop: 16 }}>
            {jobs.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state__eyebrow">Queue Watch</div>
                <strong>No queued jobs right now</strong>
                <p>Once contests are published or retried, queue activity and failures will show up here.</p>
              </div>
            ) : null}
            {jobs.map((job) => (
              <div key={job.job_id} className="notice notice-luxe admin-job-card">
                <div className="pill-row" style={{ marginBottom: 10 }}>
                  <span className="pill">{job.queue}</span>
                  <span className="pill gold">{job.job_name}</span>
                  <span className={getStatusPillClass(job.status)}>{job.status}</span>
                </div>
                <div className="admin-job-card__topline">
                  <div className="mono admin-job-card__id">
                    {job.job_id}
                  </div>
                  <span className="pill">{job.attempts ?? 0} attempts</span>
                </div>
                <div className="muted">Scheduled for {new Date(job.scheduled_for).toLocaleString()}</div>
                <div className="mono admin-job-card__payload">
                  {JSON.stringify(job.data ?? {})}
                </div>
                {job.failed_reason ? (
                  <div className="notice error" style={{ marginTop: 10 }}>
                    {job.failed_reason}
                  </div>
                ) : null}
                <div className="stack-row" style={{ marginTop: 12 }}>
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={() => {
                      setMessage(null);
                      setError(null);

                      startTransition(async () => {
                        try {
                          const result = await retryJob(session.accessToken, job.queue, job.job_id);
                          setMessage(`Job action complete: ${result.mode}`);
                          await loadAdminData(session.accessToken);
                        } catch (retryError) {
                          setError(retryError instanceof Error ? retryError.message : "Job retry failed");
                        }
                      });
                    }}
                  >
                    Retry / Recreate
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid two" style={{ marginTop: 22 }}>
        <div className="card card-luxe admin-panel">
          <div className="admin-panel__header">
            <div>
              <div className="eyebrow">Wallet Requests</div>
              <h3 className="admin-panel__title">Approval queue</h3>
              <p className="muted admin-panel__copy">Review player top-up requests with clearer ownership, timing, and status.</p>
            </div>
          </div>
          <div className="list" style={{ marginTop: 16 }}>
            {walletRequests.length === 0 ? (
              <div className="empty-state empty-state--wallet">
                <div className="empty-state__eyebrow">Wallet Ops</div>
                <strong>No wallet requests</strong>
                <p>User payment requests will appear here and can be approved from this panel.</p>
              </div>
            ) : null}
            {walletRequests.map((walletRequest) => (
              <div key={walletRequest.id} className="notice notice-luxe wallet-request-card">
                <div className="stack-row" style={{ justifyContent: "space-between", alignItems: "center" }}>
                  <div className="wallet-request-card__main">
                    <strong>{walletRequest.user_name}</strong>
                    <div className="muted">{walletRequest.user_email}</div>
                    <div className="muted">Requested Rs {walletRequest.amount}</div>
                    <div className="muted">
                      Requested {new Date(walletRequest.requested_at).toLocaleString()}
                    </div>
                  </div>
                  <div className="pill-row">
                    <span className={getStatusPillClass(walletRequest.status)}>
                      {walletRequest.status}
                    </span>
                    {walletRequest.status === "pending" ? (
                      <>
                        <button
                          type="button"
                          className="solid-button"
                          disabled={
                            busyAction === `approve-wallet-request:${walletRequest.id}` ||
                            busyAction === `reject-wallet-request:${walletRequest.id}`
                          }
                          onClick={() => {
                            setMessage(null);
                            setError(null);
                            setBusyAction(`approve-wallet-request:${walletRequest.id}`);

                            startTransition(async () => {
                              try {
                                await approveWalletTopupRequest(session.accessToken, walletRequest.id);
                                setMessage(
                                  `Success: approved Rs ${walletRequest.amount} for ${walletRequest.user_name}.`
                                );
                                await loadAdminData(session.accessToken);
                              } catch (approveError) {
                                setError(
                                  approveError instanceof Error ? approveError.message : "Wallet request approval failed"
                                );
                              } finally {
                                setBusyAction(null);
                              }
                            });
                          }}
                        >
                          {busyAction === `approve-wallet-request:${walletRequest.id}` ? "Approving..." : "Approve"}
                        </button>
                        <button
                          type="button"
                          className="danger-button"
                          disabled={
                            busyAction === `approve-wallet-request:${walletRequest.id}` ||
                            busyAction === `reject-wallet-request:${walletRequest.id}`
                          }
                          onClick={() => {
                            setMessage(null);
                            setError(null);
                            setBusyAction(`reject-wallet-request:${walletRequest.id}`);

                            startTransition(async () => {
                              try {
                                await rejectWalletTopupRequest(session.accessToken, walletRequest.id);
                                setMessage(
                                  `Success: rejected Rs ${walletRequest.amount} request from ${walletRequest.user_name}.`
                                );
                                await loadAdminData(session.accessToken);
                              } catch (rejectError) {
                                setError(
                                  rejectError instanceof Error ? rejectError.message : "Wallet request rejection failed"
                                );
                              } finally {
                                setBusyAction(null);
                              }
                            });
                          }}
                        >
                          {busyAction === `reject-wallet-request:${walletRequest.id}` ? "Rejecting..." : "Reject"}
                        </button>
                      </>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card card-luxe admin-panel">
          <div className="admin-panel__header">
            <div>
              <div className="eyebrow">Users</div>
              <h3 className="admin-panel__title">Signed-in accounts</h3>
              <p className="muted admin-panel__copy">See who has joined the system, how much balance they hold, and which account is admin.</p>
            </div>
          </div>
          <div className="list" style={{ marginTop: 16 }}>
            {users.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state__eyebrow">Accounts</div>
                <strong>No users found</strong>
                <p>Player and admin accounts will appear here after they sign in.</p>
              </div>
            ) : null}
            {users.map((user) => (
              <div key={user.id} className="notice notice-luxe admin-user-card">
                <div className="stack-row" style={{ justifyContent: "space-between", alignItems: "center" }}>
                  <div className="profile-chip">
                    <Avatar
                      name={user.name}
                      src={user.avatar_url}
                      className="profile-chip__avatar"
                      imageClassName="profile-chip__avatar profile-chip__avatar--image"
                    />
                    <div className="profile-chip__copy">
                      <strong>{user.name}</strong>
                      <span className="muted">{user.email}</span>
                    </div>
                  </div>
                  <div className="pill-row">
                    <span className="pill gold">Rs {user.wallet_balance}</span>
                    {user.is_admin ? <span className="pill">Admin</span> : null}
                    {user.is_banned ? <span className="pill rose">Banned</span> : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {selectedContest ? (
        <div className="footer-note">
          Selected contest for question entry: <span className="mono">{selectedContest.id}</span>
        </div>
      ) : null}
    </SiteShell>
  );
}
