import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  calculateYearlyScoreSeries,
  calendarDayIndex,
  formatScore,
  type ScoredSessionSummary,
  type YearlyScoreSeries,
} from "../lib/scoring";

const colors = ["#236141", "#2563b0", "#b34b16", "#8452a1", "#a72e64", "#137c86"];
const months = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];

function Plot({ series, expanded = false }: { series: YearlyScoreSeries[]; expanded?: boolean }) {
  const id = useId();
  const width = expanded ? 960 : 480;
  const height = expanded ? 460 : 320;
  const left = 76;
  const right = width - 24;
  const top = 34;
  const bottom = height - 56;
  const maximum = Math.max(1, ...series.map(({ points }) => points.at(-1)?.total ?? 0));
  const magnitude = 10 ** Math.floor(Math.log10(maximum / 4));
  const step = Math.ceil(maximum / 4 / magnitude) * magnitude;
  const ceiling = step * 4;
  const x = (day: number) => left + day / 365 * (right - left);
  const y = (total: number) => bottom - total / ceiling * (bottom - top);
  return (
    <>
      <svg className="year-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-labelledby={`${id}-title ${id}-desc`}>
        <title id={`${id}-title`}>Jahresvergleich der kumulierten Punkte</title>
        <desc id={`${id}-desc`}>Datum von Januar bis Dezember auf der X-Achse, kumulierte Punkte auf der Y-Achse. Jede Linie zeigt ein Jahr. Das laufende Jahr endet heute.</desc>
        <text x={left} y={18} className="chart-axis-title">Kumulierte Punkte</text>
        {Array.from({ length: 5 }, (_, index) => {
          const value = index * step;
          return <g key={index}>
            <line x1={left} x2={right} y1={y(value)} y2={y(value)} className="chart-gridline" />
            <text x={left - 10} y={y(value) + 5} textAnchor="end">{new Intl.NumberFormat("de-DE", { notation: "compact", maximumFractionDigits: 1 }).format(value)}</text>
          </g>;
        })}
        {months.map((month, index) => {
          if (!expanded && index % 3 !== 0 && index !== 11) return null;
          const day = calendarDayIndex(`${String(index + 1).padStart(2, "0")}-01`);
          return <text key={month} x={x(day)} y={bottom + 24} textAnchor="middle">{month}</text>;
        })}
        <text x={(left + right) / 2} y={height - 6} textAnchor="middle" className="chart-axis-title">Datum im Jahr</text>
        {series.map(({ year, points }, index) => {
          const first = points[0];
          const path = `M ${x(0)} ${y(0)} V ${y(first.total)} ` + points.slice(1).map((point) => `H ${x(point.day)} V ${y(point.total)}`).join(" ");
          return <g key={year}>
            <path d={path} fill="none" stroke={colors[index % colors.length]} strokeWidth="2.5" strokeDasharray={index >= colors.length ? "7 4" : undefined} strokeLinejoin="round" />
            {expanded && points.map((point) => <circle key={point.date} cx={x(point.day)} cy={y(point.total)} r="5" fill="transparent">
              <title>{point.date.slice(8)}.{point.date.slice(5, 7)}.{year}: {formatScore(point.total)} Punkte</title>
            </circle>)}
          </g>;
        })}
      </svg>
      <span className="chart-legend" aria-label="Jahre und Punktestände am Linienende">
        {series.map(({ year, points }, index) => <span className="chart-legend-item" key={year}>
          <span className="chart-swatch" style={{ borderColor: colors[index % colors.length], borderTopStyle: index >= colors.length ? "dashed" : "solid" }} />
          <span>{year} · {formatScore(points.at(-1)?.total ?? 0)} P</span>
        </span>)}
      </span>
    </>
  );
}

export function YearComparisonChart({ sessions }: { sessions: readonly ScoredSessionSummary[] }) {
  const series = useMemo(() => calculateYearlyScoreSeries(sessions), [sessions]);
  const [expanded, setExpanded] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const id = useId();
  useEffect(() => {
    if (!expanded) return;
    const element = dialog.current;
    element?.showModal();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      element?.close();
      document.body.style.overflow = previousOverflow;
    };
  }, [expanded]);
  return (
    <section className="stat-box chart-panel" aria-labelledby={`${id}-heading`}>
      <h3 id={`${id}-heading`}>Jahresvergleich</h3>
      {series.length === 0 ? <p>Das Diagramm erscheint mit deiner ersten Trainingseinheit.</p> : <>
        <button type="button" className="chart-preview" onClick={() => setExpanded(true)} aria-label="Jahresvergleich vergrößern" aria-haspopup="dialog">
          <Plot series={series} />
          <span className="chart-expand-hint">⤢ Zum Vergrößern klicken</span>
        </button>
        <dialog ref={dialog} className="chart-dialog" aria-labelledby={`${id}-dialog-heading`} onClose={() => setExpanded(false)} onClick={(event) => {
          if (event.target === event.currentTarget) dialog.current?.close();
        }}>
          <div className="chart-dialog-content">
            <div className="chart-dialog-heading">
              <h2 id={`${id}-dialog-heading`}>Jahresvergleich</h2>
              <button type="button" onClick={() => dialog.current?.close()} autoFocus aria-label="Großansicht schließen">Schließen ×</button>
            </div>
            <p>Punkte je Tag, seit Jahresbeginn aufaddiert. Das laufende Jahr endet heute.</p>
            <Plot series={series} expanded />
          </div>
        </dialog>
      </>}
    </section>
  );
}
