/** Public, already-published evidence stays readable when paid workers are off.
 * The former VITE_BENCH_ENABLED flag is deliberately not reused: it was mistaken
 * for PAPERBANANA_BENCH_ENABLED during deployment and hid the published pages.
 * A public-page maintenance override must be explicit and independent.
 */
export function publicLeaderboardEnabled(env = {}) {
  return env.VITE_PUBLIC_LEADERBOARD_ENABLED !== 'false'
}
