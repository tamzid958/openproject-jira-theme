// ISO 8601 duration helpers — OpenProject's time-tracking fields use durations
// like "PT2H30M". We keep all conversions limited to the shapes OpenProject
// emits/accepts (hours + minutes; days only for work-package duration).

const DURATION_RE = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?)?$/;

export function fromIsoDuration(s) {
  if (!s || typeof s !== "string") return null;
  const m = s.match(DURATION_RE);
  if (!m) return null;
  const days = Number(m[1] || 0);
  const hours = Number(m[2] || 0);
  const minutes = Number(m[3] || 0);
  return days * 24 + hours + minutes / 60;
}

export function toIsoDuration(hours) {
  if (hours == null || Number.isNaN(Number(hours))) return null;
  const totalMinutes = Math.round(Number(hours) * 60);
  if (totalMinutes <= 0) return "PT0H";
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h && m) return `PT${h}H${m}M`;
  if (h) return `PT${h}H`;
  return `PT${m}M`;
}

export function formatDurationShort(s) {
  const hours = fromIsoDuration(s);
  if (hours == null) return "—";
  if (hours === 0) return "0h";
  const wholeHours = Math.floor(hours);
  const minutes = Math.round((hours - wholeHours) * 60);
  if (minutes === 0) return `${wholeHours}h`;
  if (wholeHours === 0) return `${minutes}m`;
  return `${wholeHours}h ${minutes}m`;
}
