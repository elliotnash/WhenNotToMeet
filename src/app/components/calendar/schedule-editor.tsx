import { XMarkIcon } from '@heroicons/react/16/solid';
import { type RefObject, useEffect, useMemo, useRef, useState } from 'react';
import {
  type DaySegment,
  type Interval,
  SLOT_MINUTES,
  formatMinuteRange,
  intersectIntervals,
  subtractIntervals,
  toDaySegments,
  toMs,
} from '~/lib/time';
import { cn } from '~/lib/utils';
import { type CalendarLayout, minuteToPx, nearestWindow, windowContaining } from './layout';

type Drag =
  | { kind: 'create'; window: Interval; anchor: number; preview: DaySegment }
  | { kind: 'move'; origin: DaySegment; offset: number; preview: DaySegment }
  | {
      kind: 'resize-start' | 'resize-end';
      origin: DaySegment;
      window: Interval;
      preview: DaySegment;
    };

interface DragState {
  drag: Drag;
  pointerId: number;
  startX: number;
  startY: number;
  moved: boolean;
}

const DEFAULT_BLOCK_MINUTES = 60;

const segmentKey = (s: DaySegment) => `${s.day}:${s.start}`;
const snap = (minute: number) => Math.round(minute / SLOT_MINUTES) * SLOT_MINUTES;
const snapDown = (minute: number) => Math.floor(minute / SLOT_MINUTES) * SLOT_MINUTES;
const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

function isEditableTarget(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
  );
}

export function ScheduleEditor({
  layout,
  days,
  blocks,
  onChange,
  onUndo,
  onRedo,
  scrollRef,
}: {
  layout: CalendarLayout;
  days: string[];
  blocks: Interval[];
  onChange: (blocks: Interval[]) => void;
  onUndo: () => void;
  onRedo: () => void;
  scrollRef: RefObject<HTMLDivElement | null>;
}) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const tz = layout.timeZone;

  const segments = useMemo(
    () =>
      toDaySegments(intersectIntervals(blocks, layout.windows), tz).filter((s) =>
        days.includes(s.day),
      ),
    [blocks, layout.windows, tz, days],
  );

  const toInterval = (s: DaySegment): Interval => ({
    start: toMs(s.day, s.start, tz),
    end: toMs(s.day, s.end, tz),
  });

  const removeSegment = (segment: DaySegment) => {
    onChange(subtractIntervals(blocks, [toInterval(segment)]));
    setSelected(null);
  };

  const latest = useRef({ dragState, selected, segments, removeSegment, onUndo, onRedo });
  latest.current = { dragState, selected, segments, removeSegment, onUndo, onRedo };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isEditableTarget(e.target)) return;
      const { dragState, selected, segments, removeSegment, onUndo, onRedo } = latest.current;
      if (e.key === 'Escape') {
        if (dragState) {
          overlayRef.current?.releasePointerCapture(dragState.pointerId);
          setDragState(null);
        } else {
          setSelected(null);
        }
        return;
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selected && !dragState) {
        const segment = segments.find((s) => segmentKey(s) === selected);
        if (segment) {
          e.preventDefault();
          removeSegment(segment);
        }
        return;
      }
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) onRedo();
        else onUndo();
      } else if (mod && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        onRedo();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const pointAt = (clientX: number, clientY: number) => {
    const rect = (overlayRef.current as HTMLDivElement).getBoundingClientRect();
    const col = clamp(
      Math.floor(((clientX - rect.left) / rect.width) * days.length),
      0,
      days.length - 1,
    );
    const minute = layout.minMinute + ((clientY - rect.top) / layout.slotPx) * SLOT_MINUTES;
    return { day: days[col] as string, minute };
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 || dragState) return;
    const target = e.target as HTMLElement;
    if (target.closest('[data-delete]')) return;
    const point = pointAt(e.clientX, e.clientY);
    const segmentEl = target.closest<HTMLElement>('[data-segment]');
    let drag: Drag | null = null;

    if (segmentEl) {
      const origin = segments.find((s) => segmentKey(s) === segmentEl.dataset.segment);
      if (!origin) return;
      const handle = target.closest<HTMLElement>('[data-handle]')?.dataset.handle;
      const range = windowContaining(layout, origin.day, origin.start);
      if (handle && range) {
        drag = {
          kind: handle === 'start' ? 'resize-start' : 'resize-end',
          origin,
          window: range,
          preview: origin,
        };
      } else {
        drag = { kind: 'move', origin, offset: point.minute - origin.start, preview: origin };
      }
    } else {
      const range = windowContaining(layout, point.day, point.minute);
      if (!range) {
        setSelected(null);
        return;
      }
      const anchor = snapDown(point.minute);
      drag = {
        kind: 'create',
        window: range,
        anchor,
        preview: { day: point.day, start: anchor, end: anchor + SLOT_MINUTES },
      };
      setSelected(null);
    }

    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragState({
      drag,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      moved: false,
    });
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragState || e.pointerId !== dragState.pointerId) return;
    const scroller = scrollRef.current;
    if (scroller) {
      const rect = scroller.getBoundingClientRect();
      if (e.clientY < rect.top + 32) scroller.scrollBy({ top: -12 });
      else if (e.clientY > rect.bottom - 32) scroller.scrollBy({ top: 12 });
    }
    const moved =
      dragState.moved || Math.hypot(e.clientX - dragState.startX, e.clientY - dragState.startY) > 4;
    const point = pointAt(e.clientX, e.clientY);
    const { drag } = dragState;
    let preview = drag.preview;

    if (drag.kind === 'create') {
      const current = snap(point.minute);
      const start = current > drag.anchor ? drag.anchor : current;
      const end = current > drag.anchor ? current : drag.anchor + SLOT_MINUTES;
      preview = {
        day: drag.preview.day,
        start: Math.max(start, drag.window.start),
        end: Math.min(Math.max(end, start + SLOT_MINUTES), drag.window.end),
      };
    } else if (drag.kind === 'move') {
      const day = layout.windowsByDay.has(point.day) ? point.day : drag.preview.day;
      const duration = drag.origin.end - drag.origin.start;
      const desired = snap(point.minute - drag.offset);
      const range = nearestWindow(layout, day, desired + duration / 2);
      if (range) {
        const length = Math.min(duration, range.end - range.start);
        const start = clamp(desired, range.start, range.end - length);
        preview = { day, start, end: start + length };
      }
    } else if (drag.kind === 'resize-start') {
      const start = clamp(snap(point.minute), drag.window.start, drag.origin.end - SLOT_MINUTES);
      preview = { ...drag.origin, start };
    } else {
      const end = clamp(snap(point.minute), drag.origin.start + SLOT_MINUTES, drag.window.end);
      preview = { ...drag.origin, end };
    }

    setDragState({ ...dragState, moved, drag: { ...drag, preview } as Drag });
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragState || e.pointerId !== dragState.pointerId) return;
    const { drag, moved } = dragState;
    setDragState(null);

    if (drag.kind === 'create') {
      const segment = moved
        ? drag.preview
        : {
            ...drag.preview,
            end: Math.min(drag.anchor + DEFAULT_BLOCK_MINUTES, drag.window.end),
          };
      onChange([...blocks, toInterval(segment)]);
      setSelected(segmentKey(segment));
      return;
    }
    if (!moved) {
      setSelected(segmentKey(drag.origin));
      return;
    }
    onChange([...subtractIntervals(blocks, [toInterval(drag.origin)]), toInterval(drag.preview)]);
    setSelected(segmentKey(drag.preview));
  };

  const activeDrag = dragState?.moved || dragState?.drag.kind === 'create' ? dragState.drag : null;
  const hiddenKey =
    activeDrag && activeDrag.kind !== 'create' ? segmentKey(activeDrag.origin) : null;

  return (
    <div
      ref={overlayRef}
      className={cn(
        'absolute inset-0 touch-none select-none',
        dragState?.moved && activeDrag?.kind === 'move' ? 'cursor-grabbing' : 'cursor-cell',
      )}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={() => setDragState(null)}
    >
      {segments
        .filter((s) => segmentKey(s) !== hiddenKey)
        .map((segment) => (
          <BusyBlock
            key={segmentKey(segment)}
            layout={layout}
            days={days}
            segment={segment}
            isSelected={selected === segmentKey(segment)}
            onDelete={() => removeSegment(segment)}
          />
        ))}
      {activeDrag ? (
        <BusyBlock layout={layout} days={days} segment={activeDrag.preview} isPreview />
      ) : null}
    </div>
  );
}

function BusyBlock({
  layout,
  days,
  segment,
  isSelected,
  isPreview,
  onDelete,
}: {
  layout: CalendarLayout;
  days: string[];
  segment: DaySegment;
  isSelected?: boolean;
  isPreview?: boolean;
  onDelete?: () => void;
}) {
  const col = days.indexOf(segment.day);
  if (col === -1) return null;
  const top = minuteToPx(layout, segment.start);
  const height = minuteToPx(layout, segment.end) - top;
  const slots = (segment.end - segment.start) / SLOT_MINUTES;

  return (
    <div
      data-segment={isPreview ? undefined : segmentKey(segment)}
      className={cn('absolute px-0.5 py-px', isPreview && 'pointer-events-none z-10')}
      style={{
        top,
        height,
        left: `calc(${col} * 100% / ${days.length})`,
        width: `calc(100% / ${days.length})`,
      }}
    >
      <div
        className={cn(
          'group relative h-full cursor-grab overflow-hidden rounded-md border border-primary bg-primary/85 text-primary-fg shadow-xs',
          isSelected && 'ring-2 ring-fg ring-offset-1 ring-offset-bg',
          isPreview && 'bg-primary/70 shadow-lg ring-2 ring-primary/40',
        )}
      >
        <div
          className={cn(
            'px-1.5 font-medium text-[11px] leading-tight',
            slots >= 2 ? 'pt-1' : 'truncate pt-px',
          )}
        >
          {slots >= 2 ? <div className="font-semibold">Busy</div> : null}
          <span className="tabular-nums">{formatMinuteRange(segment.start, segment.end)}</span>
        </div>
        {isPreview ? null : (
          <>
            <div data-handle="start" className="absolute inset-x-0 top-0 h-1.5 cursor-ns-resize" />
            <div data-handle="end" className="absolute inset-x-0 bottom-0 h-1.5 cursor-ns-resize" />
            <button
              type="button"
              data-delete
              aria-label="Remove busy time"
              onClick={onDelete}
              className={cn(
                'absolute top-0.5 right-0.5 hidden rounded-sm bg-primary-fg/20 p-0.5 hover:bg-primary-fg/35 group-hover:block',
                isSelected && 'block',
              )}
            >
              <XMarkIcon className="size-3" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
