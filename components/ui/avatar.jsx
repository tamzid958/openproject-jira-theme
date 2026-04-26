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

export function Avatar({ user, size = "md", tooltip }) {
  const [broken, setBroken] = useState(false);
  const px = SIZE_PX[size] ?? SIZE_PX.md;
  const sizeCls = SIZE_CLASS[size] || SIZE_CLASS.md;

  if (!user) {
    return (
      <span
        className={`${BASE} ${sizeCls}`}
        title={tooltip || "Unassigned"}
        style={{ background: "#e4e6eb", color: "#8b94a4" }}
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="12" cy="9" r="3" />
          <path d="M4 21a8 8 0 0 1 16 0" />
        </svg>
      </span>
    );
  }

  let p = null;
  if (typeof user === "string") {
    p = PEOPLE[user] || {
      id: user,
      name: `User ${user}`,
      initials: "?",
      color: "#6b7384",
      avatar: `/api/openproject/users/${user}/avatar`,
    };
  } else if (user && typeof user === "object") {
    p = user;
    if (!p.avatar && p.id) p = { ...p, avatar: `/api/openproject/users/${p.id}/avatar` };
  }
  if (!p) return null;

  const showImg = p.avatar && !broken;
  return (
    <span
      className={`${BASE} ${sizeCls}`}
      style={{ background: showImg ? "#e4e6eb" : p.color }}
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
      ) : (
        p.initials
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
