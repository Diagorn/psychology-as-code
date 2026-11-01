import { CalendarDays, Flag, GraduationCap } from 'lucide-react'
import {
  getDeadlinesView,
  type DeadlineView,
  type EventView,
  type MaterialView,
  type TimelineState,
} from '../lib/deadlines'

function badgeClass(state: TimelineState): string {
  switch (state) {
    case 'past':
      return 'dl-badge-past'
    case 'today':
    case 'urgent':
      return 'dl-badge-danger'
    case 'soon':
      return 'dl-badge-warn'
    default:
      return 'dl-badge-normal'
  }
}

/** Класс точки таймлайна по состоянию */
function dotClass(state: TimelineState): string {
  switch (state) {
    case 'past':
      return 'past'
    case 'today':
    case 'urgent':
      return 'urgent'
    case 'soon':
      return 'soon'
    default:
      return ''
  }
}

function MaterialRow({ m }: { m: MaterialView }) {
  return (
    <div className="dl-material">
      <div className="dl-material-top">
        <span className="dl-material-name">{m.name}</span>
        <span className="dl-material-meta">{m.plannedLabel}</span>
      </div>
      <div
        className="dl-bar"
        role="progressbar"
        aria-valuenow={m.percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${m.name}: ${m.statusLabel}`}
      >
        <div className="dl-bar-fill" style={{ width: `${m.percent}%` }} />
        {m.flagPercent !== null && (
          <span className="dl-bar-flag" style={{ left: `${m.flagPercent}%` }} title={m.flagTitle ?? undefined}>
            <Flag size={11} strokeWidth={2.2} />
          </span>
        )}
      </div>
      <div className="dl-material-status">{m.statusLabel}</div>
    </div>
  )
}

function DeadlineItem({ d }: { d: DeadlineView }) {
  const dot = dotClass(d.badge.state)
  return (
    <li className={`dl-item${dot ? ` ${dot}` : ''}`}>
      <div className="dl-item-head">
        <span className="dl-date">{d.dateLabel}</span>
        <span className={`dl-badge ${badgeClass(d.badge.state)}`}>{d.badge.label}</span>
      </div>
      {d.requirements.length > 0 && (
        <ul className="dl-reqs">
          {d.requirements.map((r) => (
            <li key={r.text} className="dl-req">
              <span className="dl-req-text">{r.text}</span>
              {r.note && (
                <span className={`dl-req-note ${r.noteOk ? 'dl-req-note-ok' : 'dl-req-note-miss'}`}>
                  {r.note}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </li>
  )
}

function EventItem({ e }: { e: EventView }) {
  const dot = dotClass(e.badge.state)
  return (
    <li className={`dl-item${dot ? ` ${dot}` : ''}`}>
      <div className="dl-item-head">
        <span className="dl-event-icon">
          {e.isExam ? <GraduationCap size={14} /> : <CalendarDays size={14} />}
        </span>
        <span className="dl-date">{e.dateLabel}</span>
        {e.showTypeChip && e.typeLabel && <span className="dl-type-chip">{e.typeLabel}</span>}
        <span className={`dl-badge ${badgeClass(e.badge.state)}`}>{e.badge.label}</span>
      </div>
      <div className="dl-event-name">{e.name}</div>
    </li>
  )
}

export function DeadlinesPage() {
  const view = getDeadlinesView()
  const nearest = view.nearest

  return (
    <div className="deadlines-page">
      <div className="deadlines-head">
        <h1>Дедлайны</h1>
        <p>
          Сегодня — {view.todayLabel}.
          {nearest && (
            <>
              {' '}Ближайший срок — <strong>{nearest.dateLabel}</strong>, {nearest.subjectName}{' '}
              <span className={`dl-badge ${badgeClass(nearest.badge.state)}`}>
                {nearest.badge.label}
              </span>
            </>
          )}
        </p>
      </div>

      {view.subjects.length === 0 ? (
        <div className="deadlines-empty">
          Актуальных предметов нет — все дедлайны прошли, либо в deadlines/ пока нет данных
        </div>
      ) : (
        <div className="deadlines-stack">
          {view.subjects.map((s) => (
            <section key={s.id} className="dl-subject">
              <header className="dl-subject-head">
                <h2 className="dl-subject-name">{s.name}</h2>
                <span className="dl-range">{s.rangeLabel}</span>
              </header>

              {s.materials.length > 0 && (
                <>
                  <h3 className="dl-block-title">Материалы</h3>
                  <div className="dl-materials">
                    {s.materials.map((m) => (
                      <MaterialRow key={m.id} m={m} />
                    ))}
                  </div>
                </>
              )}

              {s.deadlines.length > 0 && (
                <>
                  <h3 className="dl-block-title">Дедлайны</h3>
                  <ol className="dl-timeline">
                    {s.deadlines.map((d) => (
                      <DeadlineItem key={d.id} d={d} />
                    ))}
                  </ol>
                </>
              )}

              {s.events.length > 0 && (
                <>
                  <h3 className="dl-block-title">События</h3>
                  <ol className="dl-timeline">
                    {s.events.map((e) => (
                      <EventItem key={e.id} e={e} />
                    ))}
                  </ol>
                </>
              )}
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
