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
        {a.hair === "ponytail" && <path d="M66 30 Q92 40 84 76 Q80 62 70 50 Z" fill={a.hairColor} />}

        {/* shirt + neck */}
        <path d="M14 100 Q16 78 50 76 Q84 78 86 100 Z" fill={a.shirt} />
        <path d="M42 76 L50 86 L58 76" fill="none" stroke="#000" strokeOpacity="0.15" strokeWidth="2" />
        <rect x="43" y="64" width="14" height="14" rx="5" fill={a.skin} />
        {a.hair === "braids" && (
          <g fill={a.hairColor}>
            {[52, 59, 66, 73, 80].map((y) => (
              <g key={y}>
                <ellipse cx="27" cy={y} rx="4.2" ry="4" />
                <ellipse cx="73" cy={y} rx="4.2" ry="4" />
              </g>
            ))}
          </g>
        )}

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
        {(a.hair === "ponytail" || a.hair === "braids") && (
          <path d="M26 46 Q24 21 50 21 Q76 21 74 46 Q68 30 50 30 Q32 30 26 46 Z" fill={a.hairColor} />
        )}
        {a.hair === "buzz" && (
          <path d="M28 41 Q28 25 50 25 Q72 25 72 41 Q64 31 50 31 Q36 31 28 41 Z" fill={a.hairColor} opacity="0.8" />
        )}
        {a.hair === "mohawk" && (
          <path d="M44 32 L41 20 L46 22 L45 12 L50 17 L52 7 L54 17 L59 12 L57 22 L61 20 L56 32 Z" fill={a.hairColor} />
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

        {a.eyes === "wide" && (
          <g>
            <circle cx="41" cy="49" r="5" fill="#fff" />
            <circle cx="59" cy="49" r="5" fill="#fff" />
            <circle cx="41.5" cy="49.5" r="2.8" fill={dark} />
            <circle cx="59.5" cy="49.5" r="2.8" fill={dark} />
            <circle cx="42.5" cy="48.3" r="0.9" fill="#fff" />
            <circle cx="60.5" cy="48.3" r="0.9" fill="#fff" />
          </g>
        )}
        {a.eyes === "determined" && (
          <g>
            <circle cx="41" cy="50" r="2.8" fill={dark} />
            <circle cx="59" cy="50" r="2.8" fill={dark} />
            <path d="M35 42 L46 45 M65 42 L54 45" stroke={dark} strokeWidth="2.4" strokeLinecap="round" />
          </g>
        )}

        {/* cheeks + mouth */}
        <circle cx="35" cy="58" r="3.5" fill="#e11d48" opacity="0.12" />
        <circle cx="65" cy="58" r="3.5" fill="#e11d48" opacity="0.12" />
        {a.extra === "freckles" && (
          <g fill="#8b5a3c" opacity="0.55">
            {[[33, 56], [36, 59], [38, 55], [67, 56], [64, 59], [62, 55]].map(([x, y]) => (
              <circle key={`${x}-${y}`} cx={x} cy={y} r="0.9" />
            ))}
          </g>
        )}
        {a.facialHair === "stubble" && (
          <path d="M31 55 Q33 75 50 75 Q67 75 69 55 Q62 67 50 67 Q38 67 31 55 Z" fill={a.hairColor} opacity="0.3" />
        )}
        {a.facialHair === "beard" && (
          <path d="M27 48 Q27 82 50 82 Q73 82 73 48 Q69 64 59 66.5 Q50 69 41 66.5 Q31 64 27 48 Z" fill={a.hairColor} />
        )}
        {a.facialHair === "goatee" && <path d="M44 66 Q50 76 56 66 Q50 69 44 66 Z" fill={a.hairColor} />}
        {a.mouth === "smile" && <path d="M42 60 Q50 67 58 60" fill="none" stroke={dark} strokeWidth="2.4" strokeLinecap="round" />}
        {a.mouth === "grin" && <path d="M41 59 Q50 70 59 59 Z" fill={dark} />}
        {a.mouth === "neutral" && <path d="M44 62 L56 62" stroke={dark} strokeWidth="2.4" strokeLinecap="round" />}
        {a.mouth === "open" && <ellipse cx="50" cy="62" rx="4" ry="4.5" fill={dark} />}
        {a.mouth === "tongue" && (
          <g>
            <path d="M42 60 Q50 69 58 60 Z" fill={dark} />
            <ellipse cx="51" cy="65" rx="3.5" ry="2.6" fill="#f87171" />
          </g>
        )}
        {a.mouth === "smirk" && <path d="M43 62 Q52 64.5 58 58.5" fill="none" stroke={dark} strokeWidth="2.4" strokeLinecap="round" />}
        {(a.facialHair === "mustache" || a.facialHair === "beard") && (
          <path d="M40 59.5 Q45 54.5 50 57.5 Q55 54.5 60 59.5 Q55 61.5 50 59.8 Q45 61.5 40 59.5 Z" fill={a.hairColor} />
        )}

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

        {a.extra === "headset" && (
          <g fill="none" stroke="#1f2937" strokeLinecap="round">
            <path d="M25 48 Q25 15 50 15 Q75 15 75 48" strokeWidth="3" />
            <rect x="20" y="42" width="8" height="13" rx="3" fill="#374151" strokeWidth="1.5" />
            <rect x="72" y="42" width="8" height="13" rx="3" fill="#374151" strokeWidth="1.5" />
            <path d="M25 54 Q29 66 40 65" strokeWidth="2" />
            <circle cx="41" cy="65" r="2.4" fill="#1f2937" stroke="none" />
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
        {a.hat === "hardhat" && (
          <g>
            <path d="M25 38 Q25 14 50 14 Q75 14 75 38 Z" fill="#facc15" />
            <rect x="47" y="14.5" width="6" height="22" rx="2" fill="#fde047" />
            <rect x="19" y="35" width="62" height="6" rx="3" fill="#eab308" />
          </g>
        )}
        {a.hat === "crown" && (
          <g>
            <path d="M30 32 L29 15 L38 23 L44 11 L50 21 L56 11 L62 23 L71 15 L70 32 Z" fill="#e8c15a" stroke="#b8860b" strokeWidth="1.2" strokeLinejoin="round" />
            <circle cx="40" cy="28" r="2" fill="#dc2626" />
            <circle cx="50" cy="28" r="2" fill="#2563eb" />
            <circle cx="60" cy="28" r="2" fill="#16a34a" />
          </g>
        )}
        {a.hat === "headband" && (
          <g>
            <path d="M26 36 Q50 28 74 36 L74 42 Q50 34 26 42 Z" fill="#dc2626" />
            <path d="M26 39 Q50 31 74 39" fill="none" stroke="#fff" strokeOpacity="0.7" strokeWidth="1" />
          </g>
        )}

        {/* shoulder sidekick */}
        {a.sidekick === "parrot" && (
          <g>
            <path d="M74 92 L70 100 L78 100 Z" fill="#1d4ed8" />
            <ellipse cx="79" cy="82" rx="7.5" ry="10" fill="#dc2626" />
            <path d="M74 78 Q70 88 76 92 Q80 86 78 78 Z" fill="#facc15" />
            <circle cx="81" cy="69" r="6.5" fill="#ef4444" />
            <path d="M86 67 Q92 69 87 74 Z" fill="#f5f5f4" stroke="#1f1a17" strokeWidth="0.8" />
            <circle cx="82.5" cy="67.5" r="1.3" fill="#111" />
          </g>
        )}
        {a.sidekick === "robot" && (
          <g>
            <path d="M80 60 L80 55" stroke="#4b5563" strokeWidth="1.5" />
            <circle cx="80" cy="54" r="2" fill="#ef4444" />
            <rect x="71" y="60" width="18" height="14" rx="3" fill="#9ca3af" stroke="#4b5563" strokeWidth="1.2" />
            <circle cx="76" cy="67" r="2.2" fill="#22d3ee" />
            <circle cx="84" cy="67" r="2.2" fill="#22d3ee" />
            <rect x="73" y="76" width="14" height="13" rx="2" fill="#6b7280" stroke="#4b5563" strokeWidth="1.2" />
            <rect x="77" y="79" width="6" height="3" rx="1" fill="#c9a24b" />
          </g>
        )}
      </g>
    </svg>
  );
}
