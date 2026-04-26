"use client";

import { useEffect, useRef, useState } from "react";
import { formatDistanceToNow, parseISO } from "date-fns";
import { toast } from "sonner";
import { Avatar } from "@/components/ui/avatar";
import { CommentHtml } from "@/components/ui/comment-html";
import { Icon } from "@/components/icons";
import { PEOPLE } from "@/lib/data";
import { friendlyError } from "@/lib/api-client";

function safeDistance(iso) {
  try {
    return formatDistanceToNow(parseISO(iso), { addSuffix: true });
  } catch {
    return "—";
  }
}

export function ActivityItem({ activity, onEdit }) {
  const author = activity.author ? PEOPLE[activity.author] : null;
  const isComment = activity.kind === "comment";
  // Author-or-permitted users get an inline edit affordance; OP exposes
  // `_links.update` per-activity, surfaced via activity.permissions.update.
  const canEdit = isComment && !!activity.permissions?.update && !!onEdit;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(activity.comment || "");
  const [saving, setSaving] = useState(false);
  const taRef = useRef(null);

  useEffect(() => {
    if (editing && taRef.current) {
      taRef.current.focus();
      const len = taRef.current.value.length;
      taRef.current.setSelectionRange(len, len);
    }
  }, [editing]);

  const startEdit = () => {
    setDraft(activity.comment || "");
    setEditing(true);
  };
  const cancelEdit = () => {
    setEditing(false);
    setDraft(activity.comment || "");
  };
  const saveEdit = async () => {
    const text = draft.trim();
    if (!text || text === (activity.comment || "")) {
      cancelEdit();
      return;
    }
    setSaving(true);
    try {
      await onEdit(activity.id, text);
      setEditing(false);
    } catch (e) {
      toast.error(friendlyError(e, "Couldn't update the comment — please try again."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={`flex gap-2.5 py-2 ${isComment ? "" : "py-1.5"}`}>
      <Avatar
        user={
          author ||
          (activity.authorName
            ? {
                initials: activity.authorName.slice(0, 2).toUpperCase(),
                name: activity.authorName,
                color: "#6b7384",
              }
            : null)
        }
        size="sm"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 mb-1">
          <span className="font-semibold text-[13px] text-fg">
            {author?.name || activity.authorName || "Someone"}
          </span>
          <span className="text-[11px] text-fg-subtle">
            {activity.createdAt ? safeDistance(activity.createdAt) : ""}
          </span>
          {canEdit && !editing && (
            <button
              type="button"
              onClick={startEdit}
              className="ml-auto inline-flex items-center gap-1 text-[11px] text-fg-subtle hover:text-fg cursor-pointer"
              title="Edit comment"
            >
              <Icon name="edit" size={11} aria-hidden="true" />
              Edit
            </button>
          )}
        </div>
        {isComment ? (
          editing ? (
            <div className="rounded-lg border border-border bg-white px-3 py-2.5 focus-within:border-accent focus-within:shadow-[0_0_0_3px_var(--accent-100)] transition-colors">
              <textarea
                ref={taRef}
                rows={3}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                disabled={saving}
                onKeyDown={(e) => {
                  if (e.key === "Escape") cancelEdit();
                  if ((e.metaKey || e.ctrlKey) && e.key === "Enter") saveEdit();
                }}
                className="w-full bg-transparent border-0 outline-none resize-y text-[13px] text-fg leading-relaxed disabled:opacity-50"
              />
              <div className="flex items-center gap-2 justify-end mt-2">
                <button
                  type="button"
                  onClick={cancelEdit}
                  disabled={saving}
                  className="inline-flex items-center h-7 px-2.5 rounded-md border border-border bg-white text-fg text-xs font-medium hover:bg-surface-subtle hover:border-border-strong disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveEdit}
                  disabled={saving || !draft.trim() || draft === (activity.comment || "")}
                  className="inline-flex items-center h-7 px-2.5 rounded-md border border-accent bg-accent text-white text-xs font-semibold hover:bg-accent-600 hover:border-accent-600 disabled:opacity-50"
                >
                  {saving ? "Saving…" : "Save"}
                </button>
              </div>
            </div>
          ) : activity.commentHtml ? (
            <CommentHtml
              html={activity.commentHtml}
              className="op-html text-[13px] text-fg leading-relaxed bg-surface-app border border-border-soft rounded-lg px-3 py-2.5"
            />
          ) : (
            <div className="text-[13px] text-fg leading-relaxed bg-surface-app border border-border-soft rounded-lg px-3 py-2.5 whitespace-pre-wrap wrap-break-word">
              {activity.comment}
            </div>
          )
        ) : (
          <div className="text-[13px] text-fg-muted leading-relaxed">
            {activity.details.length > 0
              ? activity.details.map((d, i) => (
                  <CommentHtml key={i} html={d} className="op-html" />
                ))
              : "made a change"}
          </div>
        )}
      </div>
    </div>
  );
}
