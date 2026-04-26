"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const STYLES = `
  .twk-toggle-btn{position:fixed;right:16px;bottom:16px;z-index:2147483645;
    width:40px;height:40px;border-radius:50%;border:0;background:#1f2937;color:#fff;
    box-shadow:0 8px 24px rgba(0,0,0,.18);cursor:pointer;display:grid;place-items:center;
    font-size:18px;line-height:1}
  .twk-toggle-btn:hover{background:#111827}
  .twk-panel{position:fixed;right:16px;bottom:16px;z-index:2147483646;width:280px;
    max-height:calc(100vh - 32px);display:flex;flex-direction:column;
    background:rgba(250,249,247,.92);color:#29261b;
    -webkit-backdrop-filter:blur(24px) saturate(160%);backdrop-filter:blur(24px) saturate(160%);
    border:.5px solid rgba(0,0,0,.08);border-radius:14px;
    box-shadow:0 1px 0 rgba(255,255,255,.5) inset,0 12px 40px rgba(0,0,0,.18);
    font:11.5px/1.4 ui-sans-serif,system-ui,-apple-system,sans-serif;overflow:hidden}
  .twk-hd{display:flex;align-items:center;justify-content:space-between;
    padding:10px 8px 10px 14px;user-select:none}
  .twk-hd b{font-size:12px;font-weight:600;letter-spacing:.01em}
  .twk-x{appearance:none;border:0;background:transparent;color:rgba(41,38,27,.55);
    width:22px;height:22px;border-radius:6px;cursor:pointer;font-size:13px;line-height:1}
  .twk-x:hover{background:rgba(0,0,0,.06);color:#29261b}
  .twk-body{padding:2px 14px 14px;display:flex;flex-direction:column;gap:10px;
    overflow-y:auto;overflow-x:hidden;min-height:0}
  .twk-row{display:flex;flex-direction:column;gap:5px}
  .twk-row-h{flex-direction:row;align-items:center;justify-content:space-between;gap:10px}
  .twk-lbl{display:flex;justify-content:space-between;align-items:baseline;color:rgba(41,38,27,.72)}
  .twk-lbl>span:first-child{font-weight:500}
  .twk-sect{font-size:10px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;
    color:rgba(41,38,27,.45);padding:10px 0 0}
  .twk-sect:first-child{padding-top:0}
  .twk-seg{position:relative;display:grid;grid-auto-flow:column;grid-auto-columns:1fr;
    background:rgba(0,0,0,.06);border-radius:8px;padding:2px;height:28px}
  .twk-seg button{appearance:none;border:0;background:transparent;font:inherit;color:inherit;
    cursor:pointer;border-radius:6px;position:relative;z-index:1}
  .twk-seg-thumb{position:absolute;top:2px;bottom:2px;background:#fff;border-radius:6px;
    box-shadow:0 1px 2px rgba(0,0,0,.1);transition:left .15s ease}
  .twk-swatch{width:30px;height:18px;padding:0;border:0;border-radius:6px;cursor:pointer;
    background:transparent;flex-shrink:0}
  .twk-swatch::-webkit-color-swatch-wrapper{padding:0}
  .twk-swatch::-webkit-color-swatch{border:0;border-radius:5.5px}
  .twk-btn{appearance:none;width:100%;padding:7px 10px;border:.5px solid rgba(0,0,0,.12);
    border-radius:7px;background:#fff;color:inherit;font:inherit;cursor:pointer;
    text-align:left}
  .twk-btn:hover{background:rgba(0,0,0,.04)}
`;

export function useTweaks(defaults) {
  const [values, setValues] = useState(defaults);
  const setTweak = useCallback((keyOrEdits, val) => {
    const edits =
      typeof keyOrEdits === "object" && keyOrEdits !== null
        ? keyOrEdits
        : { [keyOrEdits]: val };
    setValues((prev) => ({ ...prev, ...edits }));
  }, []);
  return [values, setTweak];
}

export function TweaksPanel({ title = "Tweaks", children }) {
  const [open, setOpen] = useState(false);
  const styleInjected = useRef(false);

  useEffect(() => {
    if (styleInjected.current) return;
    const tag = document.createElement("style");
    tag.textContent = STYLES;
    document.head.appendChild(tag);
    styleInjected.current = true;
  }, []);

  if (!open) {
    return (
      <button className="twk-toggle-btn" aria-label="Open tweaks" onClick={() => setOpen(true)}>
        ✎
      </button>
    );
  }
  return (
    <div className="twk-panel">
      <div className="twk-hd">
        <b>{title}</b>
        <button className="twk-x" aria-label="Close tweaks" onClick={() => setOpen(false)}>
          ✕
        </button>
      </div>
      <div className="twk-body">{children}</div>
    </div>
  );
}

export function TweakSection({ label, title, children }) {
  return (
    <>
      <div className="twk-sect">{label || title}</div>
      {children}
    </>
  );
}

export function TweakRadio({ label, value, options, onChange }) {
  const opts = options.map((o) => (typeof o === "object" ? o : { value: o, label: o }));
  const idx = Math.max(0, opts.findIndex((o) => o.value === value));
  const n = opts.length;
  return (
    <div className="twk-row">
      <div className="twk-lbl">
        <span>{label}</span>
      </div>
      <div role="radiogroup" className="twk-seg">
        <div
          className="twk-seg-thumb"
          style={{
            left: `calc(2px + ${idx} * (100% - 4px) / ${n})`,
            width: `calc((100% - 4px) / ${n})`,
          }}
        />
        {opts.map((o) => (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={o.value === value}
            onClick={() => onChange(o.value)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function TweakColor({ label, value, onChange, swatches }) {
  return (
    <div className="twk-row twk-row-h">
      <div className="twk-lbl">
        <span>{label}</span>
      </div>
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        {swatches?.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onChange(s)}
            aria-label={s}
            style={{
              width: 18,
              height: 18,
              padding: 0,
              border: value === s ? "2px solid #29261b" : "0.5px solid rgba(0,0,0,.15)",
              borderRadius: 5,
              background: s,
              cursor: "pointer",
            }}
          />
        ))}
        <input
          type="color"
          className="twk-swatch"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    </div>
  );
}

export function TweakButton({ label, onClick, children }) {
  return (
    <button type="button" className="twk-btn" onClick={onClick}>
      {label || children}
    </button>
  );
}
