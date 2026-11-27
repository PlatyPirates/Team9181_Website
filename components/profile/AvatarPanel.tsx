"use client";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { removePhoto, saveAvatar, setAvatarMode, setPhoto } from "@/app/portal/profile/actions";
import { AVATAR_LABELS, AVATAR_OPTIONS, resolveAvatar, type AvatarConfig } from "@/lib/profile";
import { AvatarSvg } from "./Avatar";
import { btnCta, btnGhost, btnSmall, errorBox, hintBox, labelCls, muted } from "./styles";

interface Props {
  subjectId: string;
  name: string;
  avatar: AvatarConfig | null;
  mode: "avatar" | "photo";
  photoStatus: "none" | "pending" | "approved" | "rejected";
  photoUrl: string | null;         // approved photo
  pendingPhotoUrl: string | null;  // waiting or rejected, visible to editors
  canEdit: boolean;
  size?: number;
}

const SWATCH_KEYS = new Set(["bg", "skin", "hairColor", "shirt"]);
const NICE: Record<string, string> = {
  none: "None", short: "Short", long: "Long", curly: "Curly", bun: "Bun", spiky: "Spiky",
  round: "Round", happy: "Happy", wink: "Wink", sleepy: "Sleepy",
  smile: "Smile", grin: "Grin", neutral: "Neutral", open: "Surprised",
  bandana: "Bandana", tricorn: "Tricorn", cap: "Team cap", beanie: "Beanie",
  eyepatch: "Eye patch", glasses: "Glasses", goggles: "Goggles", earring: "Earring",
};

/** Square-crops and shrinks a picture in the browser before upload. */
async function toSquareJpeg(file: File, size = 512): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, size, size);
  return await new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not read that image."))), "image/jpeg", 0.88),
  );
}

export default function AvatarPanel(p: Props) {
  const router = useRouter();
  const [building, setBuilding] = useState(false);
  const [draft, setDraft] = useState<Required<AvatarConfig>>(() => resolveAvatar(p.avatar, p.subjectId));
  const [error, setError] = useState<string | null>(null);
  const [busy, start] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);
  const size = p.size ?? 112;

  const showingPhoto = p.mode === "photo" && p.photoUrl;
  const run = (fn: () => Promise<{ error?: string } | void>) =>
    start(async () => {
      setError(null);
      const r = await fn();
      if (r && r.error) setError(r.error);
      else router.refresh();
    });

  async function onFile(file: File | undefined) {
    if (!file) return;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return setError("Use a JPG, PNG or WebP picture.");
    if (file.size > 5 * 1024 * 1024) return setError("That picture is over 5 MB.");
    run(async () => {
      const blob = await toSquareJpeg(file);
      const path = `${p.subjectId}/${Date.now()}.jpg`;
      const { error: upErr } = await createClient().storage.from("avatars").upload(path, blob, { contentType: "image/jpeg" });
      if (upErr) return { error: upErr.message };
      return await setPhoto(p.subjectId, path);
    });
  }

  return (
    <div className="flex flex-col items-center gap-2">
      {building ? (
        <AvatarSvg seed={p.subjectId} config={draft} size={size} label="Avatar preview" />
      ) : showingPhoto ? (
        // eslint-disable-next-line @next/next/no-img-element -- signed Supabase URL
        <img src={p.photoUrl!} alt={`${p.name}'s photo`} width={size} height={size} className="rounded-full object-cover" style={{ width: size, height: size }} />
      ) : (
        <AvatarSvg seed={p.subjectId} config={p.avatar} size={size} label={`${p.name}'s avatar`} />
      )}

      {p.canEdit && !building ? (
        <div className="flex flex-wrap justify-center gap-1.5">
          <button type="button" className={btnSmall} onClick={() => setBuilding(true)} disabled={busy}>
            Edit avatar
          </button>
          <button type="button" className={btnSmall} onClick={() => fileRef.current?.click()} disabled={busy}>
            {p.photoStatus === "none" ? "Upload photo" : "New photo"}
          </button>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => onFile(e.target.files?.[0])} />
        </div>
      ) : null}

      {p.canEdit && !building && p.photoStatus !== "none" ? (
        <div className="max-w-[16rem] space-y-1.5 text-center text-xs">
          {p.photoStatus === "pending" ? (
            <p className={hintBox}>
              {p.pendingPhotoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- signed Supabase URL
                <img src={p.pendingPhotoUrl} alt="Photo waiting for approval" width={40} height={40} className="mx-auto mb-1 h-10 w-10 rounded-full object-cover" />
              ) : null}
              Your photo is waiting for a Lead&apos;s OK. Everyone sees your avatar until then.
            </p>
          ) : null}
          {p.photoStatus === "rejected" ? (
            <p className={errorBox}>A Lead didn&apos;t approve this photo. Try a different one, or keep your avatar.</p>
          ) : null}
          {p.photoStatus === "approved" ? (
            <label className="flex items-center justify-center gap-1.5">
              <input
                type="checkbox"
                checked={p.mode === "photo"}
                disabled={busy}
                onChange={(e) => run(() => setAvatarMode(p.subjectId, e.target.checked ? "photo" : "avatar"))}
              />
              Show my photo instead of my avatar
            </label>
          ) : null}
          <button type="button" className={`underline ${muted}`} disabled={busy} onClick={() => run(() => removePhoto(p.subjectId))}>
            Remove photo
          </button>
        </div>
      ) : null}

      {building ? (
        <div className="w-full max-w-md space-y-3 text-left">
          {(Object.keys(AVATAR_OPTIONS) as (keyof typeof AVATAR_OPTIONS)[]).map((k) => (
            <div key={k}>
              <div className={labelCls}>{AVATAR_LABELS[k]}</div>
              <div className="flex flex-wrap gap-1.5">
                {AVATAR_OPTIONS[k].map((opt) =>
                  SWATCH_KEYS.has(k) ? (
                    <button
                      key={opt}
                      type="button"
                      aria-label={`${AVATAR_LABELS[k]} ${opt}`}
                      aria-pressed={draft[k] === opt}
                      onClick={() => setDraft({ ...draft, [k]: opt })}
                      className={`h-7 w-7 rounded-full border-2 ${draft[k] === opt ? "border-[color:var(--p-accent)] ring-2 ring-[color:var(--p-accent)]" : "border-[color:var(--p-border)]"}`}
                      style={{ background: opt }}
                    />
                  ) : (
                    <button
                      key={opt}
                      type="button"
                      aria-pressed={draft[k] === opt}
                      onClick={() => setDraft({ ...draft, [k]: opt })}
                      className={`rounded-full border px-2.5 py-1 text-xs ${draft[k] === opt ? "border-[color:var(--p-accent)] bg-[color:var(--p-hint-bg)] font-semibold text-[color:var(--p-text)]" : "border-[color:var(--p-border)] text-[color:var(--p-text-muted)]"}`}
                    >
                      {NICE[opt] ?? opt}
                    </button>
                  ),
                )}
              </div>
            </div>
          ))}
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              className={btnCta}
              disabled={busy}
              onClick={() =>
                run(async () => {
                  const r = await saveAvatar(p.subjectId, draft);
                  if (!r.error) setBuilding(false);
                  return r;
                })
              }
            >
              {busy ? "Saving…" : "Save avatar"}
            </button>
            <button type="button" className={btnGhost} onClick={() => { setDraft(resolveAvatar(p.avatar, p.subjectId)); setBuilding(false); }}>
              Cancel
            </button>
            <button
              type="button"
              className={`text-xs underline ${muted}`}
              onClick={() => {
                const keys = Object.keys(AVATAR_OPTIONS) as (keyof typeof AVATAR_OPTIONS)[];
                const r = {} as Required<AvatarConfig>;
                for (const k of keys) r[k] = AVATAR_OPTIONS[k][Math.floor(Math.random() * AVATAR_OPTIONS[k].length)];
                setDraft(r);
              }}
            >
              Surprise me
            </button>
          </div>
          {p.mode === "photo" && p.photoUrl ? <p className={`text-xs ${muted}`}>Saving the avatar switches the profile picture back from the photo to the avatar.</p> : null}
        </div>
      ) : null}

      {error ? <p className={`${errorBox} max-w-[16rem] text-xs`}>{error}</p> : null}
    </div>
  );
}
