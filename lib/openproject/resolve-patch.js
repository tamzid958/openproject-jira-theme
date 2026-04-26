// Map a friendly bucket-keyed patch ({ status: "todo" }) onto an OpenProject
// id-keyed patch ({ statusId: 12 }) by looking up the live API option lists.
// Used by every page that triggers a work-package PATCH.
//
// Status / priority / type values are accepted in two shapes: a bucket name
// (e.g. "todo", "medium", "bug") or a unique OP id. Pickers that show the
// raw API records pass an id; legacy quick actions still pass a bucket.
// The resolver only writes its `*Id` counterpart when the caller hasn't
// already supplied one.

const findIdForBucket = (list, bucket) =>
  list?.find((x) => x.bucket === bucket)?.id ?? null;

const isExistingId = (list, value) =>
  Array.isArray(list) && list.some((x) => String(x.id) === String(value));

function resolveOne(list, value) {
  if (value == null) return null;
  if (isExistingId(list, value)) return value;
  return findIdForBucket(list, value);
}

export function resolveApiPatch(patch, { statuses, priorities, types } = {}) {
  const next = { ...patch };
  if (patch.status && !patch.statusId) {
    const id = resolveOne(statuses, patch.status);
    if (id) next.statusId = id;
  }
  if (patch.priority && !patch.priorityId) {
    const id = resolveOne(priorities, patch.priority);
    if (id) next.priorityId = id;
  }
  if (patch.type && !patch.typeId) {
    const id = resolveOne(types, patch.type);
    if (id) next.typeId = id;
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
