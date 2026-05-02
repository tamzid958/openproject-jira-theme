// Normalises a patch where status / priority / type may have been passed as
// either a bare id (numeric or string) or already as `*Id`. We accept both
// shapes for ergonomic call sites — `patch.status = "12"` becomes
// `patch.statusId = "12"` when the id matches a real entry in the supplied
// list. There is no bucket-name fallback: API ids only.

const isExistingId = (list, value) =>
  Array.isArray(list) && list.some((x) => String(x.id) === String(value));

export function resolveApiPatch(patch, { statuses, priorities, types } = {}) {
  const next = { ...patch };
  if (patch.status && !patch.statusId && isExistingId(statuses, patch.status)) {
    next.statusId = patch.status;
  }
  if (patch.priority && !patch.priorityId && isExistingId(priorities, patch.priority)) {
    next.priorityId = patch.priority;
  }
  if (patch.type && !patch.typeId && isExistingId(types, patch.type)) {
    next.typeId = patch.type;
  }
  return next;
}

// Concurrent-batch runner for bulk work-package patches. Returns the
// success/gone/failed counts so callers can render a precise toast.
export async function runBatched(ids, mutateAsync, patchFor, batchSize = 8) {
  let ok = 0;
  let gone = 0;
  let failed = 0;
  for (let i = 0; i < ids.length; i += batchSize) {
    const slice = ids.slice(i, i + batchSize);
    await Promise.all(
      slice.map(async (id) => {
        try {
          await mutateAsync(id, patchFor(id));
          ok += 1;
        } catch (err) {
          if (err?.status === 404) gone += 1;
          else failed += 1;
        }
      }),
    );
  }
  return { ok, gone, failed };
}
