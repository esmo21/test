import { StrictMode, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import type { User } from "@supabase/supabase-js";
import { supabase } from "./lib/supabase";
import {
  GRADES,
  calculateBoulderStatistics,
  calculateGradeScore,
  calculateSessionScore,
  calculateYearlyBoulderStatistics,
  calculateYearToDateComparison,
  createEmptyCounts,
  formatScore,
  validateCounts,
  type BoulderGrade,
  type GradeCounts,
} from "./lib/scoring";
import "./styles.css";

type SessionRow = {
  id: string;
  user_id: string;
  session_date: string;
  score: number;
  created_at: string;
  updated_at: string;
} & Record<`grade_${BoulderGrade}_${"completed" | "flashed"}`, number>;
type AuthMode = "login" | "register";

const today = () => new Date().toISOString().slice(0, 10);
const rowToCounts = (row: SessionRow): GradeCounts =>
  Object.fromEntries(
    GRADES.map((g) => [
      g,
      {
        completed: row[`grade_${g}_completed`],
        flashed: row[`grade_${g}_flashed`],
      },
    ]),
  ) as GradeCounts;
const countsToPayload = (counts: GradeCounts) =>
  Object.fromEntries(
    GRADES.flatMap((g) => [
      [`grade_${g}_completed`, counts[g].completed],
      [`grade_${g}_flashed`, counts[g].flashed],
    ]),
  );
const countInputValue = (value: number) => (value === 0 ? "" : String(value));
const formatDate = (value: string) =>
  new Date(`${value}T00:00:00.000Z`).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  });
const formatPercent = (value: number) =>
  new Intl.NumberFormat("de-DE", {
    maximumFractionDigits: 1,
    signDisplay: "exceptZero",
  }).format(value);

function AuthView() {
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    const result =
      mode === "login"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });
    if (result.error) setMessage(result.error.message);
    else
      setMessage(
        mode === "register"
          ? "Registrierung erfolgreich. Prüfe ggf. deine E-Mails."
          : "Angemeldet.",
      );
    setLoading(false);
  }
  return (
    <main className="auth-shell">
      <section className="card auth-card">
        <h1>Boulder Tracker</h1>
        <p>Bitte melde dich an, um deine Boulder-Trainings zu verwalten.</p>
        <form onSubmit={submit}>
          <label htmlFor="email">E-Mail</label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <label htmlFor="password">Passwort</label>
          <input
            id="password"
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button className="primary" disabled={loading}>
            {loading
              ? "Bitte warten…"
              : mode === "login"
                ? "Anmelden"
                : "Registrieren"}
          </button>
        </form>
        <button
          className="link-button"
          onClick={() => setMode(mode === "login" ? "register" : "login")}
        >
          {mode === "login"
            ? "Noch kein Konto? Registrieren"
            : "Schon registriert? Anmelden"}
        </button>
        {message && (
          <p role="status" className="message">
            {message}
          </p>
        )}
      </section>
    </main>
  );
}

type StatsPanelProps = {
  title: string;
  stats: ReturnType<typeof calculateBoulderStatistics>;
  sessionsCount: number;
};

function StatsPanel({ title, stats, sessionsCount }: StatsPanelProps) {
  return (
    <section className="stat-box" aria-labelledby={`stats-${title}`}>
      <h3 id={`stats-${title}`}>{title}</h3>
      <dl>
        <dt>Gesamtpunktzahl</dt>
        <dd>{formatScore(stats.total)}</dd>
        <dt>Trainingseinheiten</dt>
        <dd>{sessionsCount}</dd>
        <dt>Geschaffte Boulder</dt>
        <dd>{stats.completed}</dd>
        <dt>Geflashte Boulder</dt>
        <dd>{stats.flashed}</dd>
        <dt>Ø Punkte pro Training</dt>
        <dd>{formatScore(stats.avg)}</dd>
      </dl>
      <h4>Geschafft nach Grad</h4>
      <dl className="grade-stats">
        {GRADES.map((grade) => (
          <div key={grade}>
            <dt>{grade}er</dt>
            <dd>{stats.completedByGrade[grade]}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

type YearToDateComparisonPanelProps = {
  comparison: NonNullable<ReturnType<typeof calculateYearToDateComparison>>;
};

function YearToDateComparisonPanel({ comparison }: YearToDateComparisonPanelProps) {
  const trendText =
    comparison.improvementPercent === null
      ? "Kein Vorjahresvergleich."
      : `${formatPercent(comparison.improvementPercent)}% ${
          comparison.improvementPercent >= 0 ? "besser" : "schlechter"
        }`;

  return (
    <section className="stat-box ytd-comparison" aria-labelledby="stats-ytd">
      <h3 id="stats-ytd">YTD-Vergleich</h3>
      <p>
        {formatDate(comparison.comparisonDate)}: {formatScore(comparison.previous.total)} P · {
          comparison.previousSessions
        } Trainings · Ø {formatScore(comparison.previous.avg)} P/Training.
      </p>
      <p>
        Dieses Jahr: {formatScore(comparison.current.total)} P · {comparison.currentSessions} Trainings · Ø {formatScore(
          comparison.current.avg,
        )} P/Training.
      </p>
      <strong>{trendText}</strong>
    </section>
  );
}

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [date, setDate] = useState(today());
  const [counts, setCounts] = useState<GradeCounts>(createEmptyCounts());
  const [editingId, setEditingId] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setAuthLoading(false);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_e, session) =>
      setUser(session?.user ?? null),
    );
    return () => subscription.unsubscribe();
  }, []);
  useEffect(() => {
    if (user) void loadSessions();
    else setSessions([]);
  }, [user]);
  async function loadSessions() {
    setLoading(true);
    setError("");
    const { data, error: e } = await supabase
      .from("boulder_sessions")
      .select("*")
      .order("session_date", { ascending: false })
      .order("created_at", { ascending: false });
    if (e) setError(e.message);
    else setSessions((data ?? []) as SessionRow[]);
    setLoading(false);
  }
  const score = useMemo(() => calculateSessionScore(counts), [counts]);
  const validation = useMemo(() => validateCounts(counts, false), [counts]);
  const sessionSummaries = useMemo(
    () =>
      sessions.map((session) => ({
        sessionDate: session.session_date,
        score: Number(session.score),
        counts: rowToCounts(session),
      })),
    [sessions],
  );
  const stats = useMemo(
    () => calculateBoulderStatistics(sessionSummaries),
    [sessionSummaries],
  );
  const yearlyStats = useMemo(
    () => calculateYearlyBoulderStatistics(sessionSummaries),
    [sessionSummaries],
  );
  const yearToDateComparison = useMemo(
    () => calculateYearToDateComparison(sessionSummaries),
    [sessionSummaries],
  );
  function updateCount(
    grade: BoulderGrade,
    key: "completed" | "flashed",
    value: string,
  ) {
    const trimmedValue = value.trim();
    const parsedValue = trimmedValue === "" ? 0 : Number(trimmedValue);
    const nextValue = Number.isFinite(parsedValue)
      ? Math.max(0, Math.floor(parsedValue))
      : 0;
    setCounts((prev) => {
      const nextGradeCounts = { ...prev[grade], [key]: nextValue };
      if (key === "completed" && nextGradeCounts.flashed > nextValue) {
        nextGradeCounts.flashed = nextValue;
      }
      if (key === "flashed" && nextValue > prev[grade].completed) {
        nextGradeCounts.flashed = prev[grade].completed;
      }
      return { ...prev, [grade]: nextGradeCounts };
    });
  }
  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!user) return;
    if (!date) {
      setError("Das Datum ist ein Pflichtfeld.");
      return;
    }
    if (!validation.valid) {
      setError(validation.errors.join(" "));
      return;
    }
    setLoading(true);
    setError("");
    const payload = {
      user_id: user.id,
      session_date: date,
      score: calculateSessionScore(counts),
      ...countsToPayload(counts),
    };
    const result = editingId
      ? await supabase
          .from("boulder_sessions")
          .update(payload)
          .eq("id", editingId)
          .eq("user_id", user.id)
      : await supabase.from("boulder_sessions").insert(payload);
    if (result.error) setError(result.error.message);
    else {
      setCounts(createEmptyCounts());
      setDate(today());
      setEditingId(null);
      await loadSessions();
    }
    setLoading(false);
  }
  function edit(row: SessionRow) {
    setEditingId(row.id);
    setDate(row.session_date);
    setCounts(rowToCounts(row));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  async function remove(row: SessionRow) {
    if (!confirm(`Training vom ${row.session_date} wirklich löschen?`)) return;
    setLoading(true);
    const { error: e } = await supabase
      .from("boulder_sessions")
      .delete()
      .eq("id", row.id)
      .eq("user_id", row.user_id);
    if (e) setError(e.message);
    else await loadSessions();
    setLoading(false);
  }
  if (authLoading)
    return (
      <main className="auth-shell">
        <p>Lade Anmeldung…</p>
      </main>
    );
  if (!user) return <AuthView />;
  return (
    <>
      <header>
        <div>
          <h1>Boulder Tracker</h1>
          <p>Training dokumentieren, Fortschritt sehen.</p>
        </div>
        <button onClick={() => void supabase.auth.signOut()}>Abmelden</button>
      </header>
      <main className="container">
        <section className="hero card">
          <span>Aktuelle Gesamtpunktzahl</span>
          <strong>{formatScore(stats.total)}</strong>
        </section>
        <section className="grid">
          <form className="card form-card" onSubmit={save}>
            <h2>
              {editingId ? "Training bearbeiten" : "Neue Trainingseinheit"}
            </h2>
            <label htmlFor="date">Datum</label>
            <input
              id="date"
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
            {GRADES.map((g) => (
              <fieldset key={g}>
                <legend>Boulder Level {g}</legend>
                <div className="count-field">
                  <label htmlFor={`c-${g}`}>Geschafft</label>
                  <input
                    id={`c-${g}`}
                    type="number"
                    min="0"
                    step="1"
                    value={countInputValue(counts[g].completed)}
                    onChange={(e) =>
                      updateCount(g, "completed", e.target.value)
                    }
                  />
                </div>
                <div className="count-field">
                  <label htmlFor={`f-${g}`}>Davon geflasht</label>
                  <input
                    id={`f-${g}`}
                    type="number"
                    min="0"
                    max={counts[g].completed}
                    step="1"
                    value={countInputValue(counts[g].flashed)}
                    onChange={(e) => updateCount(g, "flashed", e.target.value)}
                  />
                </div>
                <output>
                  {formatScore(
                    calculateGradeScore(
                      g,
                      counts[g].completed,
                      counts[g].flashed,
                    ),
                  )}{" "}
                  Punkte
                </output>
              </fieldset>
            ))}
            <div className="preview">
              Live-Vorschau: <strong>{formatScore(score)} Punkte</strong>
            </div>
            {!validation.valid && (
              <ul className="errors" aria-live="polite">
                {validation.errors.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            )}
            {error && (
              <p className="errors" role="alert">
                {error}
              </p>
            )}
            <button className="primary" disabled={loading || !validation.valid}>
              {loading ? "Speichere…" : "Training speichern"}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={() => {
                  setEditingId(null);
                  setCounts(createEmptyCounts());
                  setDate(today());
                }}
              >
                Bearbeitung abbrechen
              </button>
            )}
          </form>
          <aside className="card stats-card">
            <h2>Statistik</h2>
            <StatsPanel title="Gesamt" stats={stats} sessionsCount={sessions.length} />
            {yearToDateComparison && (
              <YearToDateComparisonPanel comparison={yearToDateComparison} />
            )}
            {yearlyStats.length > 0 && (
              <div className="yearly-stats" aria-label="Statistik nach Jahren">
                {yearlyStats.map((yearStats) => (
                  <StatsPanel
                    key={yearStats.year}
                    title={yearStats.year}
                    stats={yearStats}
                    sessionsCount={yearStats.sessions}
                  />
                ))}
              </div>
            )}
          </aside>
        </section>
        <section className="card">
          <h2>Historie</h2>
          {loading && <p>Lade Daten…</p>}
          {!loading && sessions.length === 0 && (
            <p>Noch keine Trainings gespeichert.</p>
          )}
          <div className="history">
            {sessions.map((s) => (
              <article key={s.id} className="session">
                <div>
                  <h3>
                    {new Date(s.session_date).toLocaleDateString("de-DE")}
                  </h3>
                  <strong>{formatScore(Number(s.score))} Punkte</strong>
                  <p>
                    {GRADES.filter((g) => s[`grade_${g}_completed`] > 0)
                      .map(
                        (g) =>
                          `Grad ${g}: ${s[`grade_${g}_completed`]} geschafft, ${s[`grade_${g}_flashed`]} geflasht`,
                      )
                      .join(" · ") || "Keine Boulder"}
                  </p>
                </div>
                <div className="actions">
                  <button onClick={() => edit(s)}>Bearbeiten</button>
                  <button className="danger" onClick={() => void remove(s)}>
                    Löschen
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
