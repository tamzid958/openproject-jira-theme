"use client";

import { useState } from "react";
import Image from "next/image";
import { PEOPLE } from "@/lib/data";

const SIZE_PX = { sm: 20, md: 24, lg: 32, xl: 40 };
const SIZE_CLASS = {
  sm: "w-5 h-5 text-[9px]",
  md: "w-6 h-6 text-[10px]",
  lg: "w-8 h-8 text-xs",
  xl: "w-10 h-10 text-sm",
};

const BASE =
  "inline-grid place-items-center rounded-full text-white font-semibold flex-shrink-0 border-[1.5px] border-white overflow-hidden leading-none";

// Person silhouette glyph used as the universal fallback. We render at
// 60% of the avatar size so it doesn't crash into the circle border at
// the smaller (sm/md) sizes.
function PersonGlyph({ size = 12 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="9" r="3" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </svg>
  );
}

export function Avatar({ user, size = "md", tooltip }) {
  const [broken, setBroken] = useState(false);
  const px = SIZE_PX[size] ?? SIZE_PX.md;
  const sizeCls = SIZE_CLASS[size] || SIZE_CLASS.md;
  // Glyph at ~55% of the bounding-box size so it sits comfortably inside
  // the circle on every preset (12 / 14 / 18 / 24 px).
  const glyphPx = Math.max(10, Math.round(px * 0.55));

  if (!user) {
    return (
      <span
        className={`${BASE} ${sizeCls}`}
        title={tooltip || "Unassigned"}
        style={{ background: "#e4e6eb", color: "#8b94a4" }}
      >
        <PersonGlyph size={glyphPx} />
      </span>
    );
  }

  let p = null;
  if (typeof user === "string") {
    p = PEOPLE[user] || {
      id: user,
      name: `User ${user}`,
      color: "#6b7384",
      avatar: `/api/openproject/users/${user}/avatar`,
    };
  } else if (user && typeof user === "object") {
    p = user;
    if (!p.avatar && p.image) p = { ...p, avatar: p.image };
    if (!p.avatar && p.id) p = { ...p, avatar: `/api/openproject/users/${p.id}/avatar` };
  }
  if (!p) return null;
  // Derive initials from `name` when the upstream record didn't include a
  // pre-computed `initials` field — covers next-auth session users (top-bar
  // menu) and any ad-hoc {name, …} object passed by activity items.
  if (!p.initials && p.name) {
    const derived = p.name
      .split(/\s+/)
      .map((w) => w[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase();
    if (derived) p = { ...p, initials: derived };
  }
  if (!p.color) {
    // Stable hue from id/name so re-renders don't flicker the fallback bg.
    const seed = String(p.id ?? p.name ?? "");
    let hash = 0;
    for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
    p = { ...p, color: `hsl(${Math.abs(hash) % 360} 55% 45%)` };
  }

  const showImg = p.avatar && !broken;
  // When the image fails *or* the user has no `initials` to fall back to,
  // render the same silhouette glyph as the unassigned case but tinted on
  // the user's identity colour. That keeps every member with some visual
  // weight even when their OP profile photo is missing — no more lone
  // empty bubble or stray "?" in the corner of a card.
  const showInitials = !showImg && p.initials && p.initials !== "?";
  return (
    <span
      className={`${BASE} ${sizeCls}`}
      style={{
        background: showImg ? "#e4e6eb" : p.color || "#6b7384",
        color: "#ffffff",
      }}
      title={tooltip || p.name}
    >
      {showImg ? (
        <Image
          src={p.avatar}
          alt=""
          width={px}
          height={px}
          unoptimized
          className="block w-full h-full object-cover"
          onError={() => setBroken(true)}
        />
      ) : showInitials ? (
        p.initials
      ) : (
        <PersonGlyph size={glyphPx} />
      )}
    </span>
  );
}

export function AvatarStack({ users, max = 3, size = "md" }) {
  const shown = users.slice(0, max);
  const rest = users.length - max;
  const sizeCls = SIZE_CLASS[size] || SIZE_CLASS.md;
  return (
    <span className="inline-flex">
      {shown.map((u, i) => (
        <span key={typeof u === "string" ? u : u.id} className={i === 0 ? "" : "-ml-1.5"}>
          <Avatar user={u} size={size} />
        </span>
      ))}
      {rest > 0 && (
        <span
          className={`${BASE} ${sizeCls} -ml-1.5`}
          style={{ background: "#e4e6eb", color: "#45526b" }}
        >
          +{rest}
        </span>
      )}
    </span>
  );
}
