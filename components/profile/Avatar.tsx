// Member picture: an approved photo, or the member's customizable pirate avatar.
// Pure SVG, so it renders on the server and in the avatar builder alike.
import { resolveAvatar, type AvatarConfig } from "@/lib/profile";

interface Props {
  seed: string;
  config?: AvatarConfig | null;
  photoUrl?: string | null;
  size?: number;
  name?: string;
  className?: string;
}

export default function Avatar({ seed, config, photoUrl, size = 64, name, className }: Props) {
  const label = name ? `${name}'s picture` : "Member picture";
  if (photoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- signed Supabase URL, sized by the caller
      <img
        src={photoUrl}
        alt={label}
        width={size}
        height={size}
        className={`shrink-0 rounded-full object-cover ${className ?? ""}`}
        style={{ width: size, height: size }}
      />
    );
  }
  return <AvatarSvg seed={seed} config={config} size={size} label={label} className={className} />;
}

export function AvatarSvg({
  seed,
  config,
  size = 64,
  label = "Avatar",
  className,
}: {
  seed: string;
  config?: AvatarConfig | null;
  size?: number;
  label?: string;
  className?: string;
}) {
  const a = resolveAvatar(config, seed);
  const id = `av-${seed.replace(/[^a-z0-9]/gi, "").slice(0, 12)}`;
  const dark = "#2b1a12";
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      role="img"
      aria-label={label}
      className={`shrink-0 rounded-full ${className ?? ""}`}
    >
      <defs>
        <clipPath id={id}>
          <circle cx="50" cy="50" r="50" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${id})`}>
        <rect width="100" height="100" fill={a.bg} />
        <circle cx="20" cy="18" r="22" fill="#fff" opacity="0.08" />

        {/* long hair sits behind the head */}
        {a.hair === "long" && <path d="M24 46 Q22 86 34 92 L66 92 Q78 86 76 46 Z" fill={a.hairColor} />}

        {/* shirt + neck */}
        <path d="M14 100 Q16 78 50 76 Q84 78 86 100 Z" fill={a.shirt} />
        <path d="M42 76 L50 86 L58 76" fill="none" stroke="#000" strokeOpacity="0.15" strokeWidth="2" />
        <rect x="43" y="64" width="14" height="14" rx="5" fill={a.skin} />

        {/* head + ears */}
        <circle cx="27" cy="50" r="5" fill={a.skin} />
        <circle cx="73" cy="50" r="5" fill={a.skin} />
        <ellipse cx="50" cy="48" rx="23" ry="25" fill={a.skin} />
        {a.extra === "earring" && <circle cx="73" cy="57" r="2.4" fill="none" stroke="#e8c15a" strokeWidth="1.6" />}

        {/* hair */}
        {a.hair === "short" && <path d="M27 44 Q26 22 50 22 Q74 22 73 44 Q66 32 50 32 Q36 32 27 44 Z" fill={a.hairColor} />}
        {a.hair === "long" && <path d="M26 48 Q24 21 50 21 Q76 21 74 48 Q70 31 50 31 Q32 31 26 48 Z" fill={a.hairColor} />}
        {a.hair === "curly" && (
          <g fill={a.hairColor}>
            {[30, 38, 46, 54, 62, 70].map((x, i) => (
              <circle key={x} cx={x} cy={i % 2 ? 26 : 29} r="7.5" />
            ))}
            <circle cx="27" cy="38" r="6" />
            <circle cx="73" cy="38" r="6" />
          </g>
        )}
        {a.hair === "bun" && (
          <g fill={a.hairColor}>
            {a.hat === "none" ? <circle cx="50" cy="17" r="8" /> : null}
            <path d="M27 44 Q26 23 50 23 Q74 23 73 44 Q66 31 50 31 Q36 31 27 44 Z" />
          </g>
        )}
        {a.hair === "spiky" && (
          <path d="M27 42 L30 24 L37 31 L42 19 L48 29 L54 18 L59 29 L65 21 L68 31 L73 26 L73 42 Q64 32 50 32 Q36 32 27 42 Z" fill={a.hairColor} />
        )}

        {/* eyes */}
        {a.eyes === "round" && (
          <g fill={dark}>
            <circle cx="41" cy="49" r="3" />
            <circle cx="59" cy="49" r="3" />
          </g>
        )}
        {a.eyes === "happy" && (
          <g fill="none" stroke={dark} strokeWidth="2.4" strokeLinecap="round">
            <path d="M37 50 Q41 45 45 50" />
            <path d="M55 50 Q59 45 63 50" />
          </g>
        )}
        {a.eyes === "wink" && (
          <g stroke={dark} strokeWidth="2.4" strokeLinecap="round" fill={dark}>
            <circle cx="41" cy="49" r="3" stroke="none" />
            <path d="M55 49 L63 49" fill="none" />
          </g>
        )}
        {a.eyes === "sleepy" && (
          <g fill="none" stroke={dark} strokeWidth="2.4" strokeLinecap="round">
            <path d="M37 48 Q41 52 45 48" />
            <path d="M55 48 Q59 52 63 48" />
          </g>
        )}

        {/* cheeks + mouth */}
        <circle cx="35" cy="58" r="3.5" fill="#e11d48" opacity="0.12" />
        <circle cx="65" cy="58" r="3.5" fill="#e11d48" opacity="0.12" />
        {a.mouth === "smile" && <path d="M42 60 Q50 67 58 60" fill="none" stroke={dark} strokeWidth="2.4" strokeLinecap="round" />}
        {a.mouth === "grin" && <path d="M41 59 Q50 70 59 59 Z" fill={dark} />}
        {a.mouth === "neutral" && <path d="M44 62 L56 62" stroke={dark} strokeWidth="2.4" strokeLinecap="round" />}
        {a.mouth === "open" && <ellipse cx="50" cy="62" rx="4" ry="4.5" fill={dark} />}

        {/* gear */}
        {a.extra === "eyepatch" && (
          <g>
            <path d="M28 38 L72 56" stroke="#111" strokeWidth="1.8" />
            <ellipse cx="59" cy="49" rx="6.5" ry="5.5" fill="#111" />
          </g>
        )}
        {a.extra === "glasses" && (
          <g fill="none" stroke="#111" strokeWidth="1.8">
            <circle cx="41" cy="49" r="6.5" />
            <circle cx="59" cy="49" r="6.5" />
            <path d="M47.5 49 L52.5 49" />
          </g>
        )}
        {a.extra === "goggles" && (
          <g>
            <rect x="26" y="34" width="48" height="5" fill="#5a3a22" />
            <circle cx="40" cy="36.5" r="7" fill="#c9a24b" stroke="#5a3a22" strokeWidth="2" />
            <circle cx="60" cy="36.5" r="7" fill="#c9a24b" stroke="#5a3a22" strokeWidth="2" />
            <circle cx="40" cy="36.5" r="4" fill="#bfe3f2" />
            <circle cx="60" cy="36.5" r="4" fill="#bfe3f2" />
          </g>
        )}

        {/* headwear */}
        {a.hat === "bandana" && (
          <g>
            <path d="M26 40 Q27 20 50 20 Q73 20 74 40 Q62 34 50 34 Q38 34 26 40 Z" fill="#b91c1c" />
            <g fill="#fff" opacity="0.85">
              <circle cx="40" cy="27" r="1.6" />
              <circle cx="52" cy="25" r="1.6" />
              <circle cx="63" cy="29" r="1.6" />
            </g>
            <path d="M73 36 L84 42 L78 46 Z" fill="#991b1b" />
          </g>
        )}
        {a.hat === "tricorn" && (
          <g>
            <path d="M14 36 Q50 4 86 36 Q68 28 50 30 Q32 28 14 36 Z" fill="#1f1a17" />
            <path d="M16 36 Q50 22 84 36" fill="none" stroke="#c9a24b" strokeWidth="2" />
            <g transform="translate(50 22)">
              <circle r="4.5" fill="#f5f5f4" />
              <path d="M-2.5 -1 L2.5 -1 M-2 2 L2 2" stroke="#1f1a17" strokeWidth="1.2" />
            </g>
          </g>
        )}
        {a.hat === "cap" && (
          <g>
            <path d="M26 38 Q27 18 50 18 Q73 18 74 38 Z" fill="#6b1e2a" />
            <path d="M26 38 Q50 34 80 40 Q70 44 50 42 Q36 42 26 38 Z" fill="#4a1520" />
            <text x="50" y="33" textAnchor="middle" fontSize="9" fontWeight="800" fill="#c9a24b" fontFamily="system-ui, sans-serif">
              9181
            </text>
          </g>
        )}
        {a.hat === "beanie" && (
          <g>
            <path d="M25 40 Q25 14 50 14 Q75 14 75 40 Z" fill="#0f766e" />
            <rect x="24" y="34" width="52" height="8" rx="3" fill="#115e59" />
            <circle cx="50" cy="12" r="5" fill="#f5f5f4" />
          </g>
        )}
      </g>
    </svg>
  );
}
