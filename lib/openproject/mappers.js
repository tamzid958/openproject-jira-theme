// HAL+JSON → prototype shape mappers.
// The prototype components were built around a flat shape (see lib/data.js);
// these functions translate OpenProject's HAL responses into that shape so
// no component code has to change when the data source switches.

import { fromIsoDuration } from "./duration";

const PALETTE = ["#2563eb", "#7c3aed", "#0891b2", "#db2777", "#16a34a", "#ea580c", "#0d9488", "#b91c1c", "#f97316"];

export function hashIndex(s, mod) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h) % mod;
}

function colorFor(seed) {
  return PALETTE[hashIndex(String(seed || ""), PALETTE.length)];
}

export function initialsOf(name) {
  if (!name) return "?";
  const parts = name.split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] || "") + (parts[1]?.[0] || "")).toUpperCase() || "?";
}

export function idFromHref(href) {
  if (!href) return null;
  const m = String(href).match(/\/(\d+|[\w-]+)\/?$/);
  return m ? m[1] : null;
}

export function linkTitle(link) {
  const t = link?.title;
  if (typeof t !== "string") return t ?? null;
  const trimmed = t.trim();
  return trimmed.length > 0 ? trimmed : null;
}

// HAL responses include only those `_links` for actions the current user
// can perform on the resource — so checking link presence is the canonical
// way to mirror OpenProject's per-resource permission decisions.
function hasLink(links, name) {
  return !!(links && links[name]);
}

// ── Status mapping ────────────────────────────────────────────────────────
// OpenProject statuses are configurable per workflow; we map by name with
// sensible fallbacks so the Kanban columns light up correctly out of the box.
export const STATUS_KEYWORDS = {
  todo: ["new", "to do", "todo", "open", "backlog"],
  progress: ["in progress", "doing", "active", "started"],
  review: ["in review", "review", "qa", "testing"],
  done: ["done", "closed", "resolved", "completed", "finished"],
};

export function classifyStatus(name) {
  if (!name) return "todo";
  const n = name.toLowerCase();
  for (const [bucket, words] of Object.entries(STATUS_KEYWORDS)) {
    if (words.some((w) => n.includes(w))) return bucket;
  }
  return "todo";
}

const PRIORITY_KEYWORDS = {
  highest: ["immediate", "highest"],
  high: ["high", "urgent"],
  medium: ["normal", "medium"],
  low: ["low"],
  lowest: ["lowest", "trivial"],
};

export function classifyPriority(name) {
  if (!name) return "medium";
  const n = name.toLowerCase();
  for (const [bucket, words] of Object.entries(PRIORITY_KEYWORDS)) {
    if (words.some((w) => n === w || n.includes(w))) return bucket;
  }
  return "medium";
}

const TYPE_KEYWORDS = {
  bug: ["bug", "defect"],
  story: ["story", "user story", "feature"],
  task: ["task"],
  epic: ["epic"],
  subtask: ["sub-task", "subtask"],
};

export function classifyType(name) {
  if (!name) return "task";
  const n = name.toLowerCase();
  for (const [bucket, words] of Object.entries(TYPE_KEYWORDS)) {
    if (words.some((w) => n.includes(w))) return bucket;
  }
  return "task";
}

// ── Entities ──────────────────────────────────────────────────────────────

export function mapUser(opUser) {
  if (!opUser) return null;
  const id = String(opUser.id);
  const name = opUser.name || [opUser.firstName, opUser.lastName].filter(Boolean).join(" ") || opUser.login || id;
  return {
    id,
    name,
    initials: initialsOf(name),
    color: colorFor(id),
    // Always proxy through our route so the browser can load the image
    // without needing the OpenProject session cookie or bearer token.
    avatar: `/api/openproject/users/${id}/avatar`,
  };
}

export function mapProject(p) {
  const identifier = p.identifier || String(p.id);
  const links = p._links || {};
  return {
    id: identifier,
    key: (identifier.match(/[A-Za-z]/g) || [identifier[0]]).slice(0, 2).join("").toUpperCase() || "PR",
    name: p.name,
    color: colorFor(identifier),
    desc: p.description?.raw || "",
    lead: idFromHref(p._links?.responsible?.href),
    open: 0,
    sprint: linkTitle(p._links?.defaultVersion) || "—",
    progress: 0,
    permissions: {
      update: hasLink(links, "update") || hasLink(links, "updateImmediately"),
      delete: hasLink(links, "delete"),
      addWorkPackages: hasLink(links, "createWorkPackage") || hasLink(links, "workPackages"),
      manageVersions: hasLink(links, "versions") || hasLink(links, "createVersion"),
      manageCategories: hasLink(links, "categories"),
      manageMembers: hasLink(links, "memberships"),
    },
  };
}

function dayDiff(fromIso, toIso) {
  if (!fromIso || !toIso) return null;
  const from = new Date(fromIso);
  const to = new Date(toIso);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return null;
  // Use UTC midnight to avoid timezone-induced off-by-ones.
  const fromUtc = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
  const toUtc = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((toUtc - fromUtc) / 86_400_000);
}

export function mapVersionToSprint(v) {
  // Total span (inclusive) and days elapsed since start, computed from the
  // real version dates. Falls back to nulls when either bound is missing —
  // the UI omits "day X of Y" copy in that case rather than showing dummy
  // numbers.
  const startIso = v.startDate || null;
  const endIso = v.endDate || null;
  const todayIso = new Date().toISOString().slice(0, 10);
  let days = null;
  let dayIn = null;
  if (startIso && endIso) {
    const total = dayDiff(startIso, endIso);
    if (total != null) days = total + 1;
    const elapsed = dayDiff(startIso, todayIso);
    if (elapsed != null && days != null) {
      dayIn = Math.max(0, Math.min(days, elapsed + 1));
    }
  }
  // OpenProject versions have three native status values per the v3 spec:
  // `open` (accepting changes), `locked` (running, no edits), `closed`
  // (finished). We surface the raw status for UI badges + lock/unlock/
  // reopen actions, *and* a derived `state` ("planned" | "active" |
  // "closed") that drives the backlog/board flow chrome:
  //   - planned: status=open, kickoff hasn't happened yet (no start date,
  //     or start date is still in the future). Offer "Start sprint".
  //   - active:  status=open|locked, kickoff has happened. Show day counter.
  //   - closed:  status=closed. Archive look, offer "Reopen".
  const status = v.status || "open";
  let state;
  if (status === "closed") {
    state = "closed";
  } else if (status === "open" && (!startIso || startIso > todayIso)) {
    state = "planned";
  } else {
    state = "active";
  }
  return {
    id: String(v.id),
    name: v.name,
    state,
    status,
    start: startIso || "—",
    end: endIso || "—",
    goal: v.description?.raw || "",
    days,
    dayIn,
  };
}

export function mapStatus(s) {
  return {
    id: String(s.id),
    name: s.name,
    bucket: classifyStatus(s.name),
    isClosed: !!s.isClosed,
    color: s.color || null,
    position: typeof s.position === "number" ? s.position : null,
    isDefault: !!s.isDefault,
    isReadonly: !!s.isReadonly,
  };
}

export function mapType(t) {
  return {
    id: String(t.id),
    name: t.name,
    bucket: classifyType(t.name),
    position: typeof t.position === "number" ? t.position : null,
    color: t.color || null,
    isDefault: !!t.isDefault,
  };
}

export function mapPriority(p) {
  return {
    id: String(p.id),
    name: p.name,
    bucket: classifyPriority(p.name),
    position: typeof p.position === "number" ? p.position : null,
    color: p.color || null,
    isDefault: !!p.isDefault,
  };
}

// ── Work packages ─────────────────────────────────────────────────────────

const STORY_POINTS_FIELD =
  process.env.NEXT_PUBLIC_OPENPROJECT_STORY_POINTS_FIELD || "storyPoints";

// T-shirt sizing → story points (Fibonacci-ish). Used when the configured
// field is a CustomOption HAL link with values like "S", "M", "L", "XL".
const T_SHIRT_TO_POINTS = {
  XS: 1,
  S: 2,
  M: 3,
  L: 5,
  XL: 8,
  XXL: 13,
};

function parseStoryPointValue(raw) {
  if (raw == null) return null;
  if (typeof raw === "number" && !Number.isNaN(raw)) return raw;
  const str = String(raw).trim();
  if (!str) return null;
  const upper = str.toUpperCase();
  if (T_SHIRT_TO_POINTS[upper] != null) return T_SHIRT_TO_POINTS[upper];
  const n = Number(str);
  return Number.isNaN(n) ? null : n;
}

function pickStoryPoints(wp) {
  // 1. Configured field as a top-level value (numeric custom field or native).
  if (wp[STORY_POINTS_FIELD] != null) {
    const v = parseStoryPointValue(wp[STORY_POINTS_FIELD]);
    if (v != null) return v;
  }
  // 2. Configured field as a HAL link (CustomOption like Size: S/M/L/XL).
  const link = wp._links?.[STORY_POINTS_FIELD];
  if (link?.title) {
    const v = parseStoryPointValue(link.title);
    if (v != null) return v;
  }
  // 3. Heuristic: any top-level key matching "storyPoint*".
  for (const k of Object.keys(wp)) {
    if (k.toLowerCase().includes("storypoint")) {
      const v = parseStoryPointValue(wp[k]);
      if (v != null) return v;
    }
  }
  // 4. estimatedTime — ISO 8601 duration like "PT3H30M"; round to whole hours.
  const hours = fromIsoDuration(wp.estimatedTime);
  if (hours != null) return Math.round(hours);
  return null;
}

// projectIndex: identifier (string) → projectKey (e.g. "WA")
// Without it, the prototype "key" becomes "WP-<id>".
export function mapWorkPackage(wp, opts = {}) {
  const { projectKeyByHref = {} } = opts;
  const projectHref = wp._links?.project?.href;
  const pKey = projectKeyByHref[projectHref] || "WP";
  const statusName = linkTitle(wp._links?.status);
  const priorityName = linkTitle(wp._links?.priority);
  const typeName = linkTitle(wp._links?.type);
  // Per the OP v3 spec, a work package has at most ONE category, exposed
  // as `_links.category` (singular). We surface it through `labels` as a
  // 0-or-1 element array so the existing UI (TagPill rendering, filter
  // chip) keeps working unchanged. `categoryId` carries the bare id so
  // patch builders can target it directly.
  const categoryLink = wp._links?.category;
  const categoryHref = categoryLink?.href || null;
  const categoryId = idFromHref(categoryHref);
  const categoryName = linkTitle(categoryLink);
  const labels = categoryName ? [categoryName] : [];
  return {
    id: `wp-${wp.id}`,
    nativeId: wp.id,
    lockVersion: wp.lockVersion ?? 0,
    key: `${pKey}-${wp.id}`,
    type: classifyType(typeName),
    typeId: idFromHref(wp._links?.type?.href),
    typeName,
    title: (wp.subject || "").trim(),
    description: wp.description?.raw || "",
    status: classifyStatus(statusName),
    statusId: idFromHref(wp._links?.status?.href),
    statusName,
    priority: classifyPriority(priorityName),
    priorityId: idFromHref(wp._links?.priority?.href),
    priorityName,
    assignee: idFromHref(wp._links?.assignee?.href),
    assigneeName: linkTitle(wp._links?.assignee),
    reporter: idFromHref(wp._links?.author?.href),
    reporterName: linkTitle(wp._links?.author),
    points: pickStoryPoints(wp),
    pointsRaw: linkTitle(wp._links?.[STORY_POINTS_FIELD]) ?? wp[STORY_POINTS_FIELD] ?? null,
    sprint: idFromHref(wp._links?.version?.href),
    sprintName: linkTitle(wp._links?.version),
    epic: idFromHref(wp._links?.parent?.href),
    epicName: linkTitle(wp._links?.parent),
    labels,
    categoryId,
    categoryName,
    comments: 0,
    attachments: 0,
    projectHref,
    schemaHref: wp._links?.schema?.href || null,
    createdAt: wp.createdAt || null,
    updatedAt: wp.updatedAt || null,
    startDate: wp.startDate || null,
    dueDate: wp.dueDate || null,
    duration: wp.duration || null,
    percentageDone: wp.percentageDone ?? null,
    childrenIds: (wp._embedded?.children || []).map((c) => c.id),
    watchersCount: (wp._embedded?.watchers?.length) || 0,
    attachmentsCount: (wp._embedded?.attachments?.length) || 0,
    permissions: {
      update: hasLink(wp._links, "update") || hasLink(wp._links, "updateImmediately"),
      updateImmediately: hasLink(wp._links, "updateImmediately"),
      delete: hasLink(wp._links, "delete"),
      addComment: hasLink(wp._links, "addComment"),
      addAttachment: hasLink(wp._links, "addAttachment"),
      addWatcher: hasLink(wp._links, "addWatcher"),
      removeWatcher: hasLink(wp._links, "removeWatcher"),
      addRelation: hasLink(wp._links, "addRelation"),
      logTime: hasLink(wp._links, "logTime"),
      move: hasLink(wp._links, "move"),
    },
  };
}

// Reverse — prototype patch → OpenProject PATCH body. Always include
// lockVersion (required for optimistic locking).
export function buildPatchBody(patch, opts) {
  const { lockVersion } = opts;
  const body = { lockVersion };
  const links = {};
  if (patch.title != null) body.subject = patch.title;
  if (patch.description != null) body.description = { raw: patch.description };
  if (patch.statusId != null) links.status = { href: `/api/v3/statuses/${patch.statusId}` };
  if (patch.priorityId != null) links.priority = { href: `/api/v3/priorities/${patch.priorityId}` };
  if (patch.typeId != null) links.type = { href: `/api/v3/types/${patch.typeId}` };
  if (patch.assignee !== undefined)
    links.assignee = patch.assignee ? { href: `/api/v3/users/${patch.assignee}` } : { href: null };
  if (patch.sprint !== undefined)
    links.version = patch.sprint ? { href: `/api/v3/versions/${patch.sprint}` } : { href: null };
  if (patch.parent !== undefined)
    links.parent = patch.parent ? { href: `/api/v3/work_packages/${patch.parent}` } : { href: null };
  if (patch.dueDate !== undefined) body.dueDate = patch.dueDate;
  if (patch.startDate !== undefined) body.startDate = patch.startDate;
  // Story points. Two shapes:
  //   - Numeric field ("storyPoints"): caller passes `points: <number|null>`.
  //   - CustomOption field ("customField7"): caller passes `pointsHref` (the
  //     resolved option href, or null to clear) — that takes precedence.
  if (patch.pointsHref !== undefined) {
    links[STORY_POINTS_FIELD] = patch.pointsHref ? { href: patch.pointsHref } : { href: null };
  } else if (patch.points !== undefined) {
    body[STORY_POINTS_FIELD] = patch.points;
  }
  // Category (per OP v3 spec, `_links.category` is a single Link — a WP
  // has at most one category, not many). We accept either:
  //   - `categoryId` (preferred, explicit) — string id or null to clear.
  //   - `categoryIds` (legacy from the multi-select UI) — first id wins,
  //     empty array clears.
  const wantsCategoryClear =
    patch.categoryId === null ||
    (Array.isArray(patch.categoryIds) && patch.categoryIds.length === 0);
  const wantsCategorySet =
    (patch.categoryId !== undefined && patch.categoryId !== null) ||
    (Array.isArray(patch.categoryIds) && patch.categoryIds.length > 0);
  if (wantsCategorySet) {
    const id =
      patch.categoryId != null ? patch.categoryId : patch.categoryIds[0];
    links.category = { href: `/api/v3/categories/${id}` };
  } else if (wantsCategoryClear) {
    links.category = { href: null };
  }
  if (Object.keys(links).length > 0) body._links = links;
  return body;
}

export function buildCreateBody(data, opts) {
  const { projectId } = opts;
  const body = {
    subject: data.title,
    description: { raw: data.description || "" },
    _links: {
      project: { href: `/api/v3/projects/${projectId}` },
    },
  };
  if (data.typeId) body._links.type = { href: `/api/v3/types/${data.typeId}` };
  if (data.statusId) body._links.status = { href: `/api/v3/statuses/${data.statusId}` };
  if (data.priorityId) body._links.priority = { href: `/api/v3/priorities/${data.priorityId}` };
  if (data.assignee) body._links.assignee = { href: `/api/v3/users/${data.assignee}` };
  if (data.sprint) body._links.version = { href: `/api/v3/versions/${data.sprint}` };
  if (data.parent) body._links.parent = { href: `/api/v3/work_packages/${data.parent}` };
  if (data.dueDate) body.dueDate = data.dueDate;
  if (data.startDate) body.startDate = data.startDate;
  // Single category per OP spec. Accept either `categoryId` or the
  // legacy first-of-`categoryIds` for back-compat with create-task UI.
  const createCatId =
    data.categoryId != null
      ? data.categoryId
      : Array.isArray(data.categoryIds) && data.categoryIds.length > 0
      ? data.categoryIds[0]
      : null;
  if (createCatId != null) {
    body._links.category = { href: `/api/v3/categories/${createCatId}` };
  }
  // Story points on create. CustomOption installs need a resolved href
  // (which requires a schema fetch we can't do from this pure builder) — so
  // for those we only persist points when the caller has done the lookup
  // and supplied `pointsHref`. For native numeric `storyPoints` we write
  // the number directly.
  if (data.pointsHref !== undefined) {
    body._links[STORY_POINTS_FIELD] = data.pointsHref ? { href: data.pointsHref } : { href: null };
  } else if (data.points != null && STORY_POINTS_FIELD === "storyPoints") {
    body[STORY_POINTS_FIELD] = data.points;
  }
  return body;
}

export function elementsOf(hal) {
  return hal?._embedded?.elements || [];
}

// ── Activities (comments + history) ───────────────────────────────────────

export function mapActivity(a) {
  const isComment = a._type === "Activity::Comment" || a.comment?.raw;
  // Author name resolution falls through:
  //   1. _links.user.title (canonical for hal+json),
  //   2. _embedded.user (full user object — present on some activity types),
  //   3. constructed firstName + lastName from the embedded user,
  //   4. the embedded login (worst case but better than "Someone").
  const linkUser = a._links?.user;
  const embeddedUser = a._embedded?.user;
  const embeddedFullName =
    embeddedUser?.name ||
    [embeddedUser?.firstName, embeddedUser?.lastName].filter(Boolean).join(" ") ||
    embeddedUser?.login ||
    null;
  const authorName = linkTitle(linkUser) || embeddedFullName || null;
  const author = idFromHref(linkUser?.href) || (embeddedUser?.id ? String(embeddedUser.id) : null);
  return {
    id: String(a.id),
    kind: isComment ? "comment" : "change",
    author,
    authorName,
    authorAvatar: embeddedUser?.avatar || null,
    createdAt: a.createdAt || null,
    version: a.version,
    comment: a.comment?.raw || "",
    // OP renders the markdown server-side and wraps it in `<p class="op-uc-p">`,
    // with mentions emitted as `<mention class="mention" data-id=… data-type=…>`.
    // We render this HTML in the comment bubble so user @-mentions and links
    // appear properly instead of raw markdown source.
    commentHtml: a.comment?.html || "",
    details: (a.details || []).map((d) => d.raw || d.html || ""),
    permissions: {
      // OP exposes `_links.update` per-activity when the viewer is the
      // author or holds the edit_work_package_notes permission.
      update: hasLink(a._links, "update"),
    },
  };
}

export function buildCommentBody(text) {
  return { comment: { raw: text } };
}

// ── Attachments ──────────────────────────────────────────────────────────

export function mapAttachment(a) {
  return {
    id: String(a.id),
    fileName: a.fileName,
    fileSize: a.fileSize,
    contentType: a.contentType,
    description: a.description?.raw || "",
    createdAt: a.createdAt || null,
    author: idFromHref(a._links?.author?.href),
    authorName: linkTitle(a._links?.author),
    downloadUrl: `/api/openproject/attachments/${a.id}/content`,
    permissions: {
      delete: hasLink(a._links, "delete") || hasLink(a._links, "deleteAttachment"),
    },
  };
}

export function buildAttachmentMetadata({ fileName, description }) {
  return {
    fileName,
    description: description ? { raw: description } : undefined,
  };
}

// ── Watchers ─────────────────────────────────────────────────────────────

export function mapWatcher(u) {
  return mapUser(u);
}

// ── Time entries ─────────────────────────────────────────────────────────

export function mapTimeEntry(t) {
  return {
    id: String(t.id),
    spentOn: t.spentOn,
    hoursIso: t.hours,
    comment: t.comment?.raw || "",
    user: idFromHref(t._links?.user?.href),
    userName: linkTitle(t._links?.user),
    activityId: idFromHref(t._links?.activity?.href),
    activityName: linkTitle(t._links?.activity),
    workPackageId: idFromHref(t._links?.workPackage?.href),
    createdAt: t.createdAt || null,
    permissions: {
      update: hasLink(t._links, "update") || hasLink(t._links, "updateImmediately"),
      delete: hasLink(t._links, "delete"),
    },
  };
}

export function buildTimeEntryBody({ workPackageId, hoursIso, spentOn, comment, activityId }) {
  const body = {
    hours: hoursIso,
    spentOn: spentOn || new Date().toISOString().slice(0, 10),
    _links: {
      workPackage: { href: `/api/v3/work_packages/${workPackageId}` },
    },
  };
  if (comment) body.comment = { raw: comment };
  if (activityId)
    body._links.activity = { href: `/api/v3/time_entries/activities/${activityId}` };
  return body;
}

// ── Categories (labels) ──────────────────────────────────────────────────

export function mapCategory(c) {
  return {
    id: String(c.id),
    name: c.name,
    defaultAssignee: idFromHref(c._links?.defaultAssignee?.href),
    defaultAssigneeName: linkTitle(c._links?.defaultAssignee) || null,
  };
}

// ── Notifications ─────────────────────────────────────────────────────────

export function mapNotification(n) {
  return {
    id: String(n.id),
    reason: n.reason || null,
    readIAN: !!n.readIAN,
    createdAt: n.createdAt || null,
    updatedAt: n.updatedAt || null,
    subject: linkTitle(n._links?.resource) || n.subject || "Notification",
    workPackageId: idFromHref(n._links?.resource?.href),
    projectId: idFromHref(n._links?.project?.href),
    projectName: linkTitle(n._links?.project),
    actorId: idFromHref(n._links?.actor?.href),
    actorName: linkTitle(n._links?.actor),
  };
}

// ── Versions (sprints) ───────────────────────────────────────────────────

export function mapVersionFull(v) {
  return {
    ...mapVersionToSprint(v),
    description: v.description?.raw || "",
    projectId: idFromHref(v._links?.definingProject?.href),
    projectName: linkTitle(v._links?.definingProject),
    permissions: {
      update: hasLink(v._links, "update") || hasLink(v._links, "updateImmediately"),
      delete: hasLink(v._links, "delete"),
    },
  };
}

export function buildVersionPatchBody({ name, description, status, startDate, endDate }) {
  const body = {};
  if (name !== undefined) body.name = name;
  if (description !== undefined) body.description = { raw: description };
  if (status !== undefined) body.status = status;
  if (startDate !== undefined) body.startDate = startDate;
  if (endDate !== undefined) body.endDate = endDate;
  return body;
}

// ── Documents (Confluence-style project knowledge) ────────────────────

export function mapDocument(d) {
  if (!d) return null;
  const links = d._links || {};
  const projectHref = links.project?.href || null;
  return {
    id: String(d.id),
    title: d.title || linkTitle(links.self) || "Untitled",
    description: d.description?.raw || "",
    descriptionHtml: d.description?.html || "",
    descriptionFormat: d.description?.format || "markdown",
    projectId: idFromHref(projectHref),
    projectName: linkTitle(links.project),
    projectHref,
    createdAt: d.createdAt || null,
    attachmentsHref: links.attachments?.href || null,
    permissions: {
      // Per the v3 spec, the only writeable bit on a document is title
      // and description — surfaced when the embedded `_links.update` is
      // present. There is no DELETE on documents in the API.
      update: hasLink(links, "update") || hasLink(links, "updateImmediately"),
      addAttachment: hasLink(links, "addAttachment"),
    },
  };
}

// ── Memberships & roles ──────────────────────────────────────────────────
//
// /api/v3/memberships responses embed role + project; the role's permission
// list lives on the individual /api/v3/roles/{id} resource. The mapped
// shape is consumed in two places, so it carries fields for both:
//
//   - Permission resolution ([lib/openproject/permissions.js]): needs
//     `isUser`, `projectId`, `roleIds`.
//   - Members page (UI): needs `principalName`, `principalType`,
//     `principalEmail`, `roles[]`, `permissions.update / .delete`,
//     `createdAt`, `avatar`.

export function mapRole(r) {
  return {
    id: String(r.id),
    name: r.name,
    permissions: Array.isArray(r.permissions) ? r.permissions : [],
  };
}

export function mapMembership(m) {
  if (!m) return null;
  const links = m._links || {};
  const principal = m._embedded?.principal || null;
  const principalHref = links.principal?.href || null;
  const principalId = idFromHref(principalHref);
  // Distinguish users vs groups so the UI can render differently — OP
  // returns `_type: "User"` / `"Group"` on the embedded principal, with
  // a fallback to the href shape (`/api/v3/users/<id>` vs
  // `/api/v3/groups/<id>`).
  const principalType = principal?._type
    ? String(principal._type).toLowerCase()
    : principalHref?.includes("/groups/")
    ? "group"
    : "user";
  const name =
    principal?.name ||
    [principal?.firstName, principal?.lastName].filter(Boolean).join(" ") ||
    linkTitle(links.principal) ||
    "Unknown";
  const rolesEmbedded = Array.isArray(m._embedded?.roles)
    ? m._embedded.roles.map(mapRole)
    : [];
  const rolesFromLinks = Array.isArray(links.roles)
    ? links.roles
        .map((r) => ({ id: idFromHref(r.href), name: r.title || "Role" }))
        .filter((r) => r.id)
    : [];
  const roles = rolesEmbedded.length > 0 ? rolesEmbedded : rolesFromLinks;
  return {
    id: String(m.id),
    // Legacy fields used by permission resolution.
    isUser: principalType === "user",
    projectId: idFromHref(links.project?.href),
    projectHref: links.project?.href || null,
    // UI fields for the Members page.
    principalId,
    principalName: name,
    principalType, // "user" | "group"
    principalEmail: principal?.email || null,
    avatar: principalId
      ? `/api/openproject/users/${principalId}/avatar`
      : null,
    roleIds: roles.map((r) => String(r.id)),
    roleNames: roles.map((r) => r.name),
    roles,
    createdAt: m.createdAt || null,
    updatedAt: m.updatedAt || null,
    permissions: {
      update:
        hasLink(links, "update") || hasLink(links, "updateImmediately"),
      delete: hasLink(links, "delete"),
    },
  };
}

export function buildMembershipCreateBody({ projectId, principalId, roleIds, sendNotification = true, message }) {
  const body = {
    _links: {
      principal: { href: `/api/v3/users/${principalId}` },
      roles: (roleIds || []).map((id) => ({ href: `/api/v3/roles/${id}` })),
    },
  };
  if (projectId) {
    body._links.project = { href: `/api/v3/projects/${projectId}` };
  }
  if (sendNotification === false) {
    body._meta = { sendNotification: false };
  } else if (message) {
    body._meta = { notificationMessage: { raw: message } };
  }
  return body;
}

export function buildMembershipPatchBody({ roleIds, sendNotification, message }) {
  const body = {
    _links: {
      roles: (roleIds || []).map((id) => ({ href: `/api/v3/roles/${id}` })),
    },
  };
  if (sendNotification === false) {
    body._meta = { sendNotification: false };
  } else if (message) {
    body._meta = { notificationMessage: { raw: message } };
  }
  return body;
}

export function buildVersionCreateBody({ projectId, name, description, status, startDate, endDate }) {
  const body = {
    name,
    status: status || "open",
    _links: {
      definingProject: { href: `/api/v3/projects/${projectId}` },
    },
  };
  if (description) body.description = { raw: description };
  if (startDate) body.startDate = startDate;
  if (endDate) body.endDate = endDate;
  return body;
}
