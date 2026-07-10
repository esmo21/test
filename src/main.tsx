import { StrictMode, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { User } from '@supabase/supabase-js';
import { supabase } from './lib/supabase';
import { GRADES, calculateGradeScore, calculateSessionScore, createEmptyCounts, formatScore, validateCounts, type BoulderGrade, type GradeCounts } from './lib/scoring';
import './styles.css';

type SessionRow = { id: string; user_id: string; session_date: string; score: number; created_at: string; updated_at: string } & Record<`grade_${BoulderGrade}_${'completed'|'flashed'}`, number>;
type AuthMode = 'login' | 'register';

const today = () => new Date().toISOString().slice(0, 10);
const rowToCounts = (row: SessionRow): GradeCounts => Object.fromEntries(GRADES.map((g) => [g, { completed: row[`grade_${g}_completed`], flashed: row[`grade_${g}_flashed`] }])) as GradeCounts;
const countsToPayload = (counts: GradeCounts) => Object.fromEntries(GRADES.flatMap((g) => [[`grade_${g}_completed`, counts[g].completed], [`grade_${g}_flashed`, counts[g].flashed]]));

function AuthView() {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setLoading(true); setMessage('');
    const result = mode === 'login' ? await supabase.auth.signInWithPassword({ email, password }) : await supabase.auth.signUp({ email, password });
    if (result.error) setMessage(result.error.message); else setMessage(mode === 'register' ? 'Registrierung erfolgreich. Prüfe ggf. deine E-Mails.' : 'Angemeldet.');
    setLoading(false);
  }
  return <main className="auth-shell"><section className="card auth-card"><h1>Boulder Tracker</h1><p>Bitte melde dich an, um deine Boulder-Trainings zu verwalten.</p><form onSubmit={submit}><label htmlFor="email">E-Mail</label><input id="email" type="email" required value={email} onChange={(e)=>setEmail(e.target.value)} /><label htmlFor="password">Passwort</label><input id="password" type="password" required minLength={6} value={password} onChange={(e)=>setPassword(e.target.value)} /><button className="primary" disabled={loading}>{loading ? 'Bitte warten…' : mode === 'login' ? 'Anmelden' : 'Registrieren'}</button></form><button className="link-button" onClick={()=>setMode(mode === 'login' ? 'register' : 'login')}>{mode === 'login' ? 'Noch kein Konto? Registrieren' : 'Schon registriert? Anmelden'}</button>{message && <p role="status" className="message">{message}</p>}</section></main>;
}

function App() {
  const [user, setUser] = useState<User | null>(null); const [authLoading, setAuthLoading] = useState(true);
  const [sessions, setSessions] = useState<SessionRow[]>([]); const [loading, setLoading] = useState(false); const [error, setError] = useState('');
  const [date, setDate] = useState(today()); const [counts, setCounts] = useState<GradeCounts>(createEmptyCounts()); const [editingId, setEditingId] = useState<string | null>(null);
  useEffect(() => { supabase.auth.getSession().then(({ data }) => { setUser(data.session?.user ?? null); setAuthLoading(false); }); const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => setUser(session?.user ?? null)); return () => subscription.unsubscribe(); }, []);
  useEffect(() => { if (user) void loadSessions(); else setSessions([]); }, [user]);
  async function loadSessions() { setLoading(true); setError(''); const { data, error: e } = await supabase.from('boulder_sessions').select('*').order('session_date', { ascending: false }).order('created_at', { ascending: false }); if (e) setError(e.message); else setSessions((data ?? []) as SessionRow[]); setLoading(false); }
  const score = useMemo(() => calculateSessionScore(counts), [counts]); const validation = useMemo(() => validateCounts(counts), [counts]);
  const stats = useMemo(() => { const completed = sessions.reduce((s,r)=>s+GRADES.reduce((a,g)=>a+r[`grade_${g}_completed`],0),0); const flashed = sessions.reduce((s,r)=>s+GRADES.reduce((a,g)=>a+r[`grade_${g}_flashed`],0),0); const total = sessions.reduce((s,r)=>s+Number(r.score),0); return { completed, flashed, total, avg: sessions.length ? total / sessions.length : 0 }; }, [sessions]);
  function updateCount(grade: BoulderGrade, key: 'completed'|'flashed', value: string) { setCounts((prev) => ({ ...prev, [grade]: { ...prev[grade], [key]: value === '' ? 0 : Number(value) } })); }
  async function save(event: React.FormEvent) { event.preventDefault(); if (!user) return; if (!date) { setError('Das Datum ist ein Pflichtfeld.'); return; } if (!validation.valid) { setError(validation.errors.join(' ')); return; } setLoading(true); setError(''); const payload = { user_id: user.id, session_date: date, score: calculateSessionScore(counts), ...countsToPayload(counts) }; const result = editingId ? await supabase.from('boulder_sessions').update(payload).eq('id', editingId).eq('user_id', user.id) : await supabase.from('boulder_sessions').insert(payload); if (result.error) setError(result.error.message); else { setCounts(createEmptyCounts()); setDate(today()); setEditingId(null); await loadSessions(); } setLoading(false); }
  function edit(row: SessionRow) { setEditingId(row.id); setDate(row.session_date); setCounts(rowToCounts(row)); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  async function remove(row: SessionRow) { if (!confirm(`Training vom ${row.session_date} wirklich löschen?`)) return; setLoading(true); const { error: e } = await supabase.from('boulder_sessions').delete().eq('id', row.id).eq('user_id', row.user_id); if (e) setError(e.message); else await loadSessions(); setLoading(false); }
  if (authLoading) return <main className="auth-shell"><p>Lade Anmeldung…</p></main>; if (!user) return <AuthView />;
  return <><header><div><h1>Boulder Tracker</h1><p>Training dokumentieren, Fortschritt sehen.</p></div><button onClick={()=>void supabase.auth.signOut()}>Abmelden</button></header><main className="container"><section className="hero card"><span>Aktuelle Gesamtpunktzahl</span><strong>{formatScore(stats.total)}</strong></section><section className="grid"><form className="card form-card" onSubmit={save}><h2>{editingId ? 'Training bearbeiten' : 'Neue Trainingseinheit'}</h2><label htmlFor="date">Datum</label><input id="date" type="date" required value={date} onChange={(e)=>setDate(e.target.value)} />{GRADES.map((g)=><fieldset key={g}><legend>Grad {g}</legend><label htmlFor={`c-${g}`}>Geschafft</label><input id={`c-${g}`} type="number" min="0" step="1" value={counts[g].completed} onChange={(e)=>updateCount(g,'completed',e.target.value)} /><label htmlFor={`f-${g}`}>Davon geflasht</label><input id={`f-${g}`} type="number" min="0" step="1" value={counts[g].flashed} onChange={(e)=>updateCount(g,'flashed',e.target.value)} /><output>{formatScore(calculateGradeScore(g, counts[g].completed, counts[g].flashed))} Punkte</output></fieldset>)}<div className="preview">Live-Vorschau: <strong>{formatScore(score)} Punkte</strong></div>{!validation.valid && <ul className="errors" aria-live="polite">{validation.errors.map((e)=><li key={e}>{e}</li>)}</ul>}{error && <p className="errors" role="alert">{error}</p>}<button className="primary" disabled={loading || !validation.valid}>{loading ? 'Speichere…' : 'Training speichern'}</button>{editingId && <button type="button" onClick={()=>{setEditingId(null); setCounts(createEmptyCounts()); setDate(today());}}>Bearbeitung abbrechen</button>}</form><aside className="card"><h2>Statistik</h2><dl><dt>Gesamtpunktzahl</dt><dd>{formatScore(stats.total)}</dd><dt>Trainingseinheiten</dt><dd>{sessions.length}</dd><dt>Geschaffte Boulder</dt><dd>{stats.completed}</dd><dt>Geflashte Boulder</dt><dd>{stats.flashed}</dd><dt>Ø Punkte pro Training</dt><dd>{formatScore(stats.avg)}</dd></dl></aside></section><section className="card"><h2>Historie</h2>{loading && <p>Lade Daten…</p>}{!loading && sessions.length===0 && <p>Noch keine Trainings gespeichert.</p>}<div className="history">{sessions.map((s)=><article key={s.id} className="session"><div><h3>{new Date(s.session_date).toLocaleDateString('de-DE')}</h3><strong>{formatScore(Number(s.score))} Punkte</strong><p>{GRADES.filter((g)=>s[`grade_${g}_completed`] > 0).map((g)=>`Grad ${g}: ${s[`grade_${g}_completed`]} geschafft, ${s[`grade_${g}_flashed`]} geflasht`).join(' · ') || 'Keine Boulder'}</p></div><div className="actions"><button onClick={()=>edit(s)}>Bearbeiten</button><button className="danger" onClick={()=>void remove(s)}>Löschen</button></div></article>)}</div></section></main></>;
}

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
