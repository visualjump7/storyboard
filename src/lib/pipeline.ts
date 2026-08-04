import type { Scene } from './types';

/** The minimum shape splitPipeline needs (Scene and SharedScene both fit). */
export type PipelinePost = {
  order_index: number;
  created_at: string;
  scheduled_at: string | null;
};

/** Scheduled posts bucketed by local calendar date. */
export interface ScheduleGroup<T extends PipelinePost = Scene> {
  /** Local date key, 'YYYY-MM-DD'. */
  key: string;
  /** Display label, e.g. 'Wednesday · Aug 6' (year appended when not current). */
  label: string;
  /** True when the whole day is before today (local). */
  isPast: boolean;
  posts: T[];
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** Local 'YYYY-MM-DD' key for a Date. */
function dateKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * Split a project's posts into the unscheduled backlog (manual order) and
 * scheduled groups (sorted by time, bucketed by the viewer's local date).
 */
export function splitPipeline<T extends PipelinePost>(
  posts: T[],
  now: Date = new Date(),
): { backlog: T[]; groups: ScheduleGroup<T>[] } {
  const backlog = posts
    .filter((p) => !p.scheduled_at)
    .sort((a, b) => a.order_index - b.order_index || a.created_at.localeCompare(b.created_at));

  const scheduled = posts
    .filter((p): p is T & { scheduled_at: string } => Boolean(p.scheduled_at))
    .sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at));

  const todayKey = dateKey(now);
  const groups: ScheduleGroup<T>[] = [];
  for (const post of scheduled) {
    const key = dateKey(new Date(post.scheduled_at));
    const last = groups[groups.length - 1];
    if (last && last.key === key) {
      last.posts.push(post);
    } else {
      groups.push({ key, label: formatGroupLabel(key), isPast: key < todayKey, posts: [post] });
    }
  }
  return { backlog, groups };
}

/** 'YYYY-MM-DD' → 'Wednesday · Aug 6' (plus the year when it isn't this year). */
export function formatGroupLabel(key: string): string {
  const [y, m, d] = key.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const weekday = date.toLocaleDateString('en-US', { weekday: 'long' });
  const monthDay = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const year = y === new Date().getFullYear() ? '' : ` ${y}`;
  return `${weekday} · ${monthDay}${year}`;
}

/** Time-of-day chip text, '' when the post sits at local midnight (date-only). */
export function formatScheduleTime(iso: string): string {
  const d = new Date(iso);
  if (d.getHours() === 0 && d.getMinutes() === 0) return '';
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

/** Compact date for the projects index, e.g. 'Wed, Aug 6'. */
export function formatNextDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

/** ISO timestamptz → value for an <input type="date">, '' when unscheduled. */
export function isoToLocalDateInput(iso: string | null): string {
  if (!iso) return '';
  return dateKey(new Date(iso));
}

/** ISO timestamptz → value for an <input type="time">, '' at local midnight. */
export function isoToLocalTimeInput(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (d.getHours() === 0 && d.getMinutes() === 0) return '';
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Date/time input values (local) → ISO timestamptz. Empty time = midnight. */
export function localInputsToIso(date: string, time: string): string {
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = (time || '00:00').split(':').map(Number);
  return new Date(y, m - 1, d, hh, mm).toISOString();
}
