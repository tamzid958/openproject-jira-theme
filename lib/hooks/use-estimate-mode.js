"use client";

import { useMemo } from "react";
import { useTasks } from "@/lib/hooks/use-openproject";
import { useWpSchema } from "@/lib/hooks/use-openproject-detail";

const FIELD =
  process.env.NEXT_PUBLIC_OPENPROJECT_STORY_POINTS_FIELD || "storyPoints";

// Auto-detect a project's estimation mode from its OP schema.
//
//   schema.fields[FIELD].type === "CustomOption"      → "tshirt"
//   schema.fields[FIELD].type ∈ {"Float","Integer"}   → "numeric"
//   schema.fields[FIELD] is undefined / null          → "duration"
//
// Falls back to "tshirt" (fail-safe) if the schema fetch fails but the
// project's existing tasks carry pointsRaw labels — that's a strong signal
// the field is in use as a CustomOption regardless of what the schema endpoint
// returned. Falls back to "duration" only if there's no points signal at all.
//
// One schema is read per project (any task in the project shares it), and
// React-Query memoizes the result so every consumer pays once.
export function useEstimateMode(projectId) {
  // Pull a single task to discover the schema href + sample pointsRaw values.
  const tasksQ = useTasks(projectId, null, !!projectId);
  const tasks = tasksQ.data || [];
  const schemaHref = useMemo(() => {
    for (const t of tasks) {
      if (t.schemaHref) return t.schemaHref;
    }
    return null;
  }, [tasks]);
  const schemaQ = useWpSchema(schemaHref, !!schemaHref);

  return useMemo(() => {
    const isLoading =
      tasksQ.isLoading || (schemaHref ? schemaQ.isLoading : false);
    const hasPointsRawSignal = tasks.some(
      (t) => t.pointsRaw != null && t.pointsRaw !== "",
    );
    const hasPointsNumericSignal = tasks.some(
      (t) => typeof t.points === "number" && Number.isFinite(t.points),
    );

    const fieldDef = schemaQ.data?.fields?.[FIELD];
    if (fieldDef?.type === "CustomOption") {
      return { mode: "tshirt", isLoading: false, source: "schema" };
    }
    if (fieldDef?.type === "Float" || fieldDef?.type === "Integer") {
      return { mode: "numeric", isLoading: false, source: "schema" };
    }
    if (fieldDef === undefined && !schemaQ.isLoading) {
      // Schema loaded successfully but the configured field isn't on it —
      // strong signal this project doesn't size with the configured field.
      // Use the dataset as a tiebreak: if there's any pointsRaw present
      // anyway, the schema endpoint must be unreliable on this install.
      if (hasPointsRawSignal) {
        return { mode: "tshirt", isLoading: false, source: "data" };
      }
      if (hasPointsNumericSignal) {
        return { mode: "numeric", isLoading: false, source: "data" };
      }
      return { mode: "duration", isLoading: false, source: "schema" };
    }

    // Schema fetch failed — last-resort heuristic from data alone.
    if (schemaQ.isError) {
      if (hasPointsRawSignal) {
        return { mode: "tshirt", isLoading: false, source: "data-fallback" };
      }
      if (hasPointsNumericSignal) {
        return { mode: "numeric", isLoading: false, source: "data-fallback" };
      }
      return { mode: "duration", isLoading: false, source: "data-fallback" };
    }

    return { mode: "tshirt", isLoading, source: "loading" };
  }, [
    tasks,
    tasksQ.isLoading,
    schemaHref,
    schemaQ.isLoading,
    schemaQ.data,
    schemaQ.isError,
  ]);
}
