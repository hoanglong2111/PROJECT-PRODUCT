export function VnFlag({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={(size * 16) / 24} viewBox="0 0 24 16" aria-hidden="true" className="flag-icon">
      <rect width="24" height="16" fill="#da251d" />
      <polygon
        fill="#ff0"
        points="12,3 13.05,6.24 16.45,6.24 13.7,8.24 14.76,11.47 12,9.47 9.24,11.47 10.3,8.24 7.55,6.24 10.95,6.24"
      />
    </svg>
  );
}

export function GbFlag({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={(size * 16) / 24} viewBox="0 0 24 16" aria-hidden="true" className="flag-icon">
      <rect width="24" height="16" fill="#00247d" />
      <path d="M0,0 L24,16 M24,0 L0,16" stroke="#fff" strokeWidth="3" />
      <path d="M0,0 L24,16 M24,0 L0,16" stroke="#cf142b" strokeWidth="1" />
      <path d="M12,0 V16 M0,8 H24" stroke="#fff" strokeWidth="5" />
      <path d="M12,0 V16 M0,8 H24" stroke="#cf142b" strokeWidth="2" />
    </svg>
  );
}
