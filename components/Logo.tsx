/* The Campus Coffee mark: a perforated mess-coupon coin stamped with the cup.
   `variant="coin"` is the cream token (splash, paper artifacts);
   `variant="ghost"` sits quietly on roast surfaces (headers, auth pages). */
export function TokenMark({
  size = 88,
  variant = "coin",
  className = "",
}: {
  size?: number;
  variant?: "coin" | "ghost";
  className?: string;
}) {
  const coin = variant === "coin";
  const face = coin ? "#F2E9DB" : "#231A15";
  const edge = coin ? "none" : "#3A2C23";
  const perf = coin ? "#241812" : "#F2E9DB";
  const cup = coin ? "#241812" : "#F2E9DB";
  const steam = coin ? "#875D26" : "#F0CE9A";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={className}
      aria-hidden
      focusable="false"
    >
      <circle cx="32" cy="32" r="30" fill={face} stroke={edge} strokeWidth={coin ? 0 : 1.5} />
      <circle cx="32" cy="32" r="25" fill="none" stroke={perf} strokeWidth="1.6" strokeDasharray="2.6 4.4" opacity="0.45" />
      <path d="M26.5 25.5c0-2.4 1.8-2.4 1.8-4.8" fill="none" stroke={steam} strokeWidth="2.2" strokeLinecap="round" />
      <path d="M32.8 25.5c0-2.4 1.8-2.4 1.8-4.8" fill="none" stroke={steam} strokeWidth="2.2" strokeLinecap="round" />
      <rect x="21" y="29" width="17.5" height="13.5" rx="3.6" fill={cup} />
      <path d="M39 32h1.9a3.9 3.9 0 0 1 0 7.8H39" fill="none" stroke={cup} strokeWidth="2.5" strokeLinecap="round" />
      <rect x="23.4" y="45" width="12.6" height="2.2" rx="1.1" fill={cup} />
    </svg>
  );
}
