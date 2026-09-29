import { CheckIcon, XMarkIcon } from '@heroicons/react/16/solid';
import { type RefObject, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { m } from '~/components/motion';
import {
  type Interval,
  SLOT_MINUTES,
  formatDateKeyLabel,
  formatMinuteRange,
  toMs,
} from '~/lib/time';
import { cn } from '~/lib/utils';
import type { Availability } from '~/queries/participation';
import { type CalendarLayout, minuteToPx } from './layout';

interface AvailabilityBlock {
  day: string;
  start: number;
  end: number;
  available: string[];
}

export function availabilityOpacity(count: number, total: number, minPeople: number) {
  if (count < minPeople || count === 0) return 0;
  const floor = minPeople - 1;
  return (count - floor) / (total - floor);
}

function computeBlocks(layout: CalendarLayout, days: string[], data: Availability) {
  const busy = new Map<string, Interval[]>(data.participants.map((p) => [p.id, []]));
  for (const b of data.busy) busy.get(b.participantId)?.push(b);

  const blocks: AvailabilityBlock[] = [];
  for (const day of days) {
    for (const range of layout.windowsByDay.get(day) ?? []) {
      let current: (AvailabilityBlock & { key: string }) | null = null;
      for (let minute = range.start; minute < range.end; minute += SLOT_MINUTES) {
        const start = toMs(day, minute, layout.timeZone);
        const end = toMs(day, minute + SLOT_MINUTES, layout.timeZone);
        const available = data.participants
          .filter((p) => !busy.get(p.id)?.some((b) => b.start < end && b.end > start))
          .map((p) => p.id);
        const key = available.join(',');
        if (current && current.key === key && current.end === minute) {
          current.end = minute + SLOT_MINUTES;
        } else {
          current = { day, start: minute, end: minute + SLOT_MINUTES, available, key };
          blocks.push(current);
        }
      }
    }
  }
  return blocks;
}

export function AvailabilityOverlay({
  layout,
  days,
  data,
  minPeople,
  scrollRef,
}: {
  layout: CalendarLayout;
  days: string[];
  data: Availability;
  minPeople: number;
  scrollRef: RefObject<HTMLDivElement | null>;
}) {
  const blocks = useMemo(() => computeBlocks(layout, days, data), [layout, days, data]);
  const [hovered, setHovered] = useState<{ block: AvailabilityBlock; rect: DOMRect } | null>(null);
  const total = data.participants.length;

  useEffect(() => {
    const scroller = scrollRef.current;
    const clear = () => setHovered(null);
    scroller?.addEventListener('scroll', clear, { passive: true });
    window.addEventListener('scroll', clear, { passive: true });
    return () => {
      scroller?.removeEventListener('scroll', clear);
      window.removeEventListener('scroll', clear);
    };
  }, [scrollRef]);

  return (
    <div className="absolute inset-0" onPointerLeave={() => setHovered(null)}>
      {blocks.map((block) => {
        const count = block.available.length;
        const opacity = availabilityOpacity(count, total, minPeople);
        if (opacity === 0) return null;
        const col = days.indexOf(block.day);
        const top = minuteToPx(layout, block.start);
        const height = minuteToPx(layout, block.end) - top;
        const isHovered = hovered?.block === block;
        return (
          <div
            key={`${block.day}:${block.start}`}
            className="absolute px-0.5 py-px"
            style={{
              top,
              height,
              left: `calc(${col} * 100% / ${days.length})`,
              width: `calc(100% / ${days.length})`,
            }}
            onPointerEnter={(e) =>
              setHovered({ block, rect: e.currentTarget.getBoundingClientRect() })
            }
          >
            <div
              className={cn(
                'h-full overflow-hidden rounded-sm px-1.5 transition-shadow',
                isHovered && 'ring-2 ring-fg/80',
                opacity > 0.55 ? 'text-primary-fg' : 'text-fg',
              )}
              style={{
                backgroundColor: `color-mix(in oklab, var(--color-primary) ${Math.round(opacity * 100)}%, transparent)`,
              }}
            >
              {height >= 20 ? (
                <span className="font-medium text-[11px] tabular-nums leading-5">
                  {count}/{total}
                </span>
              ) : null}
            </div>
          </div>
        );
      })}
      {hovered ? <HoverCard hovered={hovered} data={data} /> : null}
    </div>
  );
}

function HoverCard({
  hovered,
  data,
}: {
  hovered: { block: AvailabilityBlock; rect: DOMRect };
  data: Availability;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const { block, rect } = hovered;
  const available = data.participants.filter((p) => block.available.includes(p.id));
  const unavailable = data.participants.filter((p) => !block.available.includes(p.id));

  useLayoutEffect(() => {
    const card = ref.current;
    if (!card) return;
    const { width, height } = card.getBoundingClientRect();
    const gap = 8;
    const left =
      rect.right + gap + width <= window.innerWidth ? rect.right + gap : rect.left - gap - width;
    const top = Math.min(Math.max(rect.top, gap), window.innerHeight - height - gap);
    setPosition({ top, left: Math.max(gap, left) });
  }, [rect]);

  return createPortal(
    <m.div
      ref={ref}
      role="tooltip"
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.12 }}
      className="pointer-events-none fixed z-50 w-60 rounded-xl border bg-overlay p-3 text-overlay-fg shadow-lg"
      style={{
        top: position?.top ?? rect.top,
        left: position?.left ?? rect.right + 8,
        visibility: position ? 'visible' : 'hidden',
      }}
    >
      <p className="font-semibold text-sm">
        {formatDateKeyLabel(block.day, { weekday: 'short', month: 'short', day: 'numeric' })}
        <span className="font-normal text-muted-fg">
          {' · '}
          {formatMinuteRange(block.start, block.end)}
        </span>
      </p>
      <p className="mt-0.5 text-muted-fg text-xs">
        {available.length} of {data.participants.length} available
      </p>
      <ul className="mt-2 flex flex-col gap-1 text-sm">
        {available.map((p) => (
          <li key={p.id} className="flex items-center gap-1.5">
            <CheckIcon className="size-4 shrink-0 text-success" />
            <span className="truncate">{p.name}</span>
          </li>
        ))}
        {unavailable.map((p) => (
          <li key={p.id} className="flex items-center gap-1.5 text-muted-fg">
            <XMarkIcon className="size-4 shrink-0" />
            <span className="truncate line-through">{p.name}</span>
          </li>
        ))}
      </ul>
    </m.div>,
    document.body,
  );
}
