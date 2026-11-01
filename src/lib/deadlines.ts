/** Данные раздела «Дедлайны»: сканируем папку deadlines/ на этапе сборки.
 * Каждый JSON-файл — один предмет (materials + deadlines + events); допустима
 * и обёртка { "subjects": [...] }. Прогресс материалов — план по времени:
 * доля пути от startDate до endDate на сегодняшний день. */

export interface Material {
  id: string
  name: string
  /** Единица измерения: «модуль», «глава»… */
  unit: string
  total: number
  startDate: Date
  endDate: Date
}

export interface Requirement {
  materialId: string
  /** Сколько единиц материала должно быть пройдено к дедлайну */
  target: number
}

export interface Deadline {
  id: string
  date: Date
  requirements: Requirement[]
}

export interface DeadlineEvent {
  id: string
  name: string
  date: Date
  /** «exam», «credit»… — неизвестные типы показываем без метки */
  type: string | null
}

export interface Subject {
  id: string
  name: string
  materials: Material[]
  deadlines: Deadline[]
  events: DeadlineEvent[]
  /** Самая ранняя дата предмета — для подписи диапазона */
  startDate: Date
  /** Самая поздняя дата — сортировка предметов и скрытие завершённых */
  endDate: Date
}

/* ─────────────────────────── Парсинг ─────────────────────────── */

const rawFiles = import.meta.glob('/deadlines/*.json', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

function str(v: unknown): string {
  return typeof v === 'string' ? v.trim() : ''
}

function num(v: unknown): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : NaN
}

/** ISO-дата «2026-10-28» → локальная полночь (new Date('2026-10-28') даёт UTC) */
function isoDate(v: unknown): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(str(v))
  if (!m) return null
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  return Number.isNaN(d.getTime()) ? null : d
}

function materialsOf(v: unknown): Material[] {
  if (!Array.isArray(v)) return []
  const out: Material[] = []
  for (const item of v) {
    if (!item || typeof item !== 'object') continue
    const o = item as Record<string, unknown>
    const id = str(o.id)
    const name = str(o.name)
    const start = isoDate(o.startDate)
    const end = isoDate(o.endDate)
    const total = num(o.total)
    if (!id || !name || !start || !end || !(total > 0)) continue
    out.push({ id, name, unit: str(o.unit) || 'ед.', total, startDate: start, endDate: end })
  }
  return out
}

function deadlinesOf(v: unknown): Deadline[] {
  if (!Array.isArray(v)) return []
  const out: Deadline[] = []
  for (const item of v) {
    if (!item || typeof item !== 'object') continue
    const o = item as Record<string, unknown>
    const d = isoDate(o.date)
    if (!d) continue
    const reqs: Requirement[] = []
    if (Array.isArray(o.requirements)) {
      for (const r of o.requirements) {
        if (!r || typeof r !== 'object') continue
        const ro = r as Record<string, unknown>
        const materialId = str(ro.materialId)
        const target = num(ro.target)
        if (!materialId || !(target > 0)) continue
        reqs.push({ materialId, target })
      }
    }
    out.push({ id: str(o.id) || `deadline-${out.length + 1}`, date: d, requirements: reqs })
  }
  return out
}

function eventsOf(v: unknown): DeadlineEvent[] {
  if (!Array.isArray(v)) return []
  const out: DeadlineEvent[] = []
  for (const item of v) {
    if (!item || typeof item !== 'object') continue
    const o = item as Record<string, unknown>
    const name = str(o.name)
    const d = isoDate(o.date)
    if (!name || !d) continue
    out.push({ id: str(o.id) || `event-${out.length + 1}`, name, date: d, type: str(o.type) || null })
  }
  return out
}

interface RawSubject {
  id: string
  name: string
  materials: Material[]
  deadlines: Deadline[]
  events: DeadlineEvent[]
}

function subjectOf(v: unknown): RawSubject | null {
  if (!v || typeof v !== 'object') return null
  const o = v as Record<string, unknown>
  const name = str(o.name)
  const materials = materialsOf(o.materials)
  const deadlines = deadlinesOf(o.deadlines)
  const events = eventsOf(o.events)
  if (!name && materials.length === 0 && deadlines.length === 0 && events.length === 0) return null
  return { id: '', name: name || 'Без названия', materials, deadlines, events }
}

function subjectsFromRaw(fileName: string, raw: string): Subject[] {
  let data: unknown
  try {
    data = JSON.parse(raw)
  } catch {
    return [] // битый json — пропускаем файл целиком
  }
  if (!data || typeof data !== 'object') return []
  const arr = (data as Record<string, unknown>).subjects
  const list: unknown[] = Array.isArray(arr) ? arr : [data]
  const base = fileName.replace(/\.json$/, '')

  const out: Subject[] = []
  for (let i = 0; i < list.length; i++) {
    const s = subjectOf(list[i])
    if (!s) continue
    const rawId = str((list[i] as Record<string, unknown>).id)
    s.id = `${base}#${rawId || i + 1}` // префикс файла защищает от дублей между файлами

    const dates = [
      ...s.materials.flatMap((m) => [m.startDate.getTime(), m.endDate.getTime()]),
      ...s.deadlines.map((d) => d.date.getTime()),
      ...s.events.map((e) => e.date.getTime()),
    ].sort((a, b) => a - b)
    if (dates.length === 0) continue

    out.push({
      ...s,
      startDate: new Date(dates[0]),
      endDate: new Date(dates[dates.length - 1]),
    })
  }
  return out
}

/** Все предметы из deadlines/ — без сортировки и фильтрации (см. getDeadlinesView) */
export const subjects: Subject[] = Object.entries(rawFiles).flatMap(([file, raw]) =>
  subjectsFromRaw(file.split('/').pop() ?? file, raw),
)

/* ─────────────────────────── Отображение ─────────────────────────── */

/** Состояние точки таймлайна и её бейджа-отсчёта */
export type TimelineState = 'past' | 'today' | 'urgent' | 'soon' | 'normal'

export interface BadgeView {
  label: string
  state: TimelineState
}

export interface MaterialView {
  id: string
  name: string
  /** 0–100: доля времени от startDate до endDate на сегодня */
  percent: number
  /** «≈ 19 из 50 модулей» */
  plannedLabel: string
  /** «по плану 37 % · осталось ~3 мес.» */
  statusLabel: string
  /** Позиция маркера цели ближайшего дедлайна на шкале, % (или null) */
  flagPercent: number | null
  flagTitle: string | null
}

export interface RequirementView {
  /** «Видеолекции — 2 модуля» */
  text: string
  /** «план успевает» / «план отстаёт: ≈4 из 6» или null у прошедших */
  note: string | null
  noteOk: boolean
}

export interface DeadlineView {
  id: string
  dateLabel: string
  badge: BadgeView
  requirements: RequirementView[]
}

export interface EventView {
  id: string
  dateLabel: string
  name: string
  typeLabel: string | null
  showTypeChip: boolean
  isExam: boolean
  badge: BadgeView
}

export interface SubjectView {
  id: string
  name: string
  rangeLabel: string
  materials: MaterialView[]
  deadlines: DeadlineView[]
  events: EventView[]
}

export interface NearestView {
  dateLabel: string
  subjectName: string
  badge: BadgeView
}

export interface DeadlinesView {
  todayLabel: string
  nearest: NearestView | null
  subjects: SubjectView[]
}

const DAY = 86_400_000

const fmtFull = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
const fmtShort = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' })

function plural(n: number, forms: readonly [string, string, string]): string {
  const a = Math.abs(n) % 100
  const b = a % 10
  if (a > 10 && a < 20) return forms[2]
  if (b > 1 && b < 5) return forms[1]
  if (b === 1) return forms[0]
  return forms[2]
}

const DAY_FORMS: readonly [string, string, string] = ['день', 'дня', 'дней']
const YEAR_FORMS: readonly [string, string, string] = ['год', 'года', 'лет']

/** Формы множественного числа для известных единиц; неизвестные — как есть */
const UNIT_FORMS: Record<string, readonly [string, string, string]> = {
  модуль: ['модуль', 'модуля', 'модулей'],
  глава: ['глава', 'главы', 'глав'],
  лекция: ['лекция', 'лекции', 'лекций'],
  видеолекция: ['видеолекция', 'видеолекции', 'видеолекций'],
  тема: ['тема', 'темы', 'тем'],
  раздел: ['раздел', 'раздела', 'разделов'],
  параграф: ['параграф', 'параграфа', 'параграфов'],
  статья: ['статья', 'статьи', 'статей'],
  книга: ['книга', 'книги', 'книг'],
  тест: ['тест', 'теста', 'тестов'],
  кейс: ['кейс', 'кейса', 'кейсов'],
  задание: ['задание', 'задания', 'заданий'],
  работа: ['работа', 'работы', 'работ'],
  проект: ['проект', 'проекта', 'проектов'],
  практикум: ['практикум', 'практикума', 'практикумов'],
  семинар: ['семинар', 'семинара', 'семинаров'],
  эссе: ['эссе', 'эссе', 'эссе'],
}

function unitPlural(unit: string, n: number): string {
  const forms = UNIT_FORMS[unit.toLowerCase()]
  return forms ? plural(n, forms) : unit
}

function startOfToday(): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

function badgeOf(date: Date, today: Date): BadgeView {
  const diff = Math.round((date.getTime() - today.getTime()) / DAY)
  if (diff < 0) return { label: `${-diff} ${plural(-diff, DAY_FORMS)} назад`, state: 'past' }
  if (diff === 0) return { label: 'сегодня', state: 'today' }
  if (diff === 1) return { label: 'завтра', state: 'urgent' }
  if (diff <= 7) return { label: `через ${diff} ${plural(diff, DAY_FORMS)}`, state: diff <= 3 ? 'urgent' : 'soon' }
  return { label: `через ${diff} ${plural(diff, DAY_FORMS)}`, state: 'normal' }
}

/** «остался 5 дней» / «осталось ~3 мес.» / null, когда время вышло */
function remainingLabel(end: Date, today: Date): string | null {
  const days = Math.ceil((end.getTime() - today.getTime()) / DAY)
  if (days <= 0) return null
  if (days <= 31) {
    const alone = days === 1 || (days % 10 === 1 && days % 100 !== 11)
    return `${alone ? 'остался' : 'осталось'} ${days} ${plural(days, DAY_FORMS)}`
  }
  if (days <= 730) return `осталось ~${Math.max(1, Math.round(days / 30))} мес.`
  const years = Math.round(days / 365)
  return `осталось ~${years} ${plural(years, YEAR_FORMS)}`
}

/** Доля времени между start и end на сегодня, 0..1 */
function timeFraction(start: Date, end: Date, at: Date): number {
  const span = end.getTime() - start.getTime()
  if (span <= 0) return 1
  return Math.min(1, Math.max(0, (at.getTime() - start.getTime()) / span))
}

interface MaterialFlag {
  deadline: Deadline
  target: number
}

function materialView(m: Material, today: Date, flag: MaterialFlag | null): MaterialView {
  const beforeStart = today.getTime() < m.startDate.getTime()
  const fraction = beforeStart ? 0 : timeFraction(m.startDate, m.endDate, today)
  const percent = Math.round(fraction * 100)
  const planned = Math.round(fraction * m.total)

  const rest = beforeStart ? null : remainingLabel(m.endDate, today)
  const statusLabel = beforeStart
    ? `начнётся ${fmtFull.format(m.startDate)}`
    : rest
      ? `по плану ${percent} % · ${rest}`
      : 'завершён'

  return {
    id: m.id,
    name: m.name,
    percent,
    plannedLabel: `≈ ${planned} из ${m.total} ${unitPlural(m.unit, planned)}`,
    statusLabel,
    flagPercent: flag ? Math.min(100, Math.round((flag.target / m.total) * 100)) : null,
    flagTitle: flag
      ? `К дедлайну ${fmtShort.format(flag.deadline.date)}: ${flag.target} ${unitPlural(m.unit, flag.target)}`
      : null,
  }
}

const EVENT_TYPE_LABELS: Record<string, string> = {
  exam: 'Экзамен',
  credit: 'Зачёт',
  test: 'Контрольная',
  consultation: 'Консультация',
  colloquium: 'Коллоквиум',
  practice: 'Практика',
}

/** Всё, что нужно странице: фильтр завершённых, сортировка, отсчёты, план */
export function getDeadlinesView(): DeadlinesView {
  const today = startOfToday()

  // Завершённые предметы (последняя дата в прошлом) не показываем
  const visible = subjects.filter((s) => s.endDate.getTime() >= today.getTime())
  // «Горячие» сверху: раньше заканчивается — выше
  visible.sort((a, b) => a.endDate.getTime() - b.endDate.getTime())

  const subjectViews: SubjectView[] = visible.map((s) => {
    const upcoming = s.deadlines.filter((d) => d.date.getTime() >= today.getTime())
    const nearestDl = upcoming.length
      ? upcoming.reduce((min, d) => (d.date.getTime() < min.date.getTime() ? d : min))
      : null

    const materials = s.materials.map((m) => {
      const req = nearestDl?.requirements.find((r) => r.materialId === m.id)
      const flag = nearestDl && req ? { deadline: nearestDl, target: req.target } : null
      return materialView(m, today, flag)
    })

    const deadlines: DeadlineView[] = [...s.deadlines]
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .map((d) => {
        const requirements: RequirementView[] = []
        for (const r of d.requirements) {
          const m = s.materials.find((x) => x.id === r.materialId)
          if (!m) continue
          let note: string | null = null
          let noteOk = false
          if (d.date.getTime() >= today.getTime()) {
            const plannedAt = Math.round(timeFraction(m.startDate, m.endDate, d.date) * m.total)
            if (plannedAt >= r.target) {
              note = 'план успевает'
              noteOk = true
            } else {
              note = `план отстаёт: ≈${plannedAt} из ${r.target}`
            }
          }
          requirements.push({
            text: `${m.name} — ${r.target} ${unitPlural(m.unit, r.target)}`,
            note,
            noteOk,
          })
        }
        return { id: d.id, dateLabel: fmtFull.format(d.date), badge: badgeOf(d.date, today), requirements }
      })

    const events: EventView[] = [...s.events]
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .map((e) => {
        const typeLabel = e.type ? (EVENT_TYPE_LABELS[e.type.toLowerCase()] ?? e.type) : null
        return {
          id: e.id,
          dateLabel: fmtFull.format(e.date),
          name: e.name,
          typeLabel,
          showTypeChip: !!typeLabel && !e.name.toLowerCase().includes(typeLabel.toLowerCase()),
          isExam: e.type?.toLowerCase() === 'exam',
          badge: badgeOf(e.date, today),
        }
      })

    return {
      id: s.id,
      name: s.name,
      rangeLabel: `${fmtFull.format(s.startDate)} — ${fmtFull.format(s.endDate)}`,
      materials,
      deadlines,
      events,
    }
  })

  // Ближайший срок по всем видимым предметам — для сводки в шапке страницы
  let nearestDate: Date | null = null
  let nearestSubject: Subject | null = null
  for (const s of visible) {
    const dates = [...s.deadlines, ...s.events]
      .map((x) => x.date)
      .filter((d) => d.getTime() >= today.getTime())
    if (dates.length === 0) continue
    const min = dates.reduce((a, b) => (b.getTime() < a.getTime() ? b : a))
    if (!nearestDate || min.getTime() < nearestDate.getTime()) {
      nearestDate = min
      nearestSubject = s
    }
  }

  const nearest: NearestView | null =
    nearestDate && nearestSubject
      ? {
          dateLabel:
            nearestDate.getFullYear() === today.getFullYear()
              ? fmtShort.format(nearestDate)
              : fmtFull.format(nearestDate),
          subjectName: nearestSubject.name,
          badge: badgeOf(nearestDate, today),
        }
      : null

  return { todayLabel: fmtFull.format(today), nearest, subjects: subjectViews }
}
