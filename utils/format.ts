// Date formatting — Twitter/Bluesky style.
// <60s: "now" · <60m: "Xm" · <24h: "Xh" · <7d: "Xd"
// <~12mo same year: "Xmo" · older or different year: absolute date
// ("Jun 22" same year, "Jun 22, 2024" different year)
export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diffInMs = now.getTime() - d.getTime();
  const diffInSeconds = Math.floor(diffInMs / 1000);
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  const diffInHours = Math.floor(diffInMinutes / 60);
  const diffInDays = Math.floor(diffInHours / 24);

  if (diffInSeconds < 60) return "now";
  if (diffInMinutes < 60) return `${diffInMinutes}m`;
  if (diffInHours < 24) return `${diffInHours}h`;
  if (diffInDays < 7) return `${diffInDays}d`;

  // Beyond a week, switch to calendar-month math (not 30-day buckets) so
  // "1mo" lines up with an actual month boundary the way Twitter/Bluesky do.
  const monthsDiff =
    (now.getFullYear() - d.getFullYear()) * 12 +
    (now.getMonth() - d.getMonth()) -
    (now.getDate() < d.getDate() ? 1 : 0);

  const sameYear = now.getFullYear() === d.getFullYear();

  if (monthsDiff < 1) {
    // Still within ~a month but past 7 days — show weeks, matching
    // Twitter/Bluesky which use "Xw" in this window.
    const diffInWeeks = Math.floor(diffInDays / 7);
    return `${diffInWeeks}w`;
  }

  if (monthsDiff < 12 && sameYear) {
    return `${monthsDiff}mo`;
  }

  // Older than ~a year, or crossed into a different calendar year:
  // switch to an absolute date instead of a relative one.
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  });
}
