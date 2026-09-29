import { useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { type Interval, mergeIntervals } from '~/lib/time';
import { myBusyQuery } from '~/queries/participation';
import { saveMyBusy } from '~/server/participation';

interface DraftState {
  draft: Interval[] | null;
  past: Interval[][];
  future: Interval[][];
}

const emptyState: DraftState = { draft: null, past: [], future: [] };

function sameIntervals(a: Interval[], b: Interval[]) {
  return a.length === b.length && a.every((x, i) => x.start === b[i]?.start && x.end === b[i]?.end);
}

export function useScheduleDraft(token: string) {
  const queryClient = useQueryClient();
  const { data: saved } = useSuspenseQuery(myBusyQuery(token));
  const [state, setState] = useState<DraftState>(emptyState);

  const current = state.draft ?? saved;
  const isDirty = state.draft !== null && !sameIntervals(state.draft, saved);

  const apply = (next: Interval[]) => {
    const merged = mergeIntervals(next);
    setState((s) => {
      const previous = s.draft ?? saved;
      if (sameIntervals(previous, merged)) return s;
      return { draft: merged, past: [...s.past, previous], future: [] };
    });
  };

  const undo = () =>
    setState((s) => {
      const previous = s.past.at(-1);
      if (!previous) return s;
      return {
        draft: previous,
        past: s.past.slice(0, -1),
        future: [s.draft ?? saved, ...s.future],
      };
    });

  const redo = () =>
    setState((s) => {
      const [next, ...future] = s.future;
      if (!next) return s;
      return { draft: next, past: [...s.past, s.draft ?? saved], future };
    });

  const save = useMutation({
    mutationFn: () => saveMyBusy({ data: { token, blocks: current } }),
    onSuccess: async (blocks) => {
      queryClient.setQueryData(myBusyQuery(token).queryKey, blocks);
      setState(emptyState);
      await queryClient.invalidateQueries({ queryKey: ['event', token] });
    },
  });

  return {
    blocks: current,
    isDirty,
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
    apply,
    undo,
    redo,
    discard: () => setState(emptyState),
    save,
  };
}

export type ScheduleDraft = ReturnType<typeof useScheduleDraft>;
