import type { ReactNode, RefObject } from 'react';
import {
  type Interval,
  formatDateKeyLabel,
  formatMinute,
  subtractIntervals,
  todayKey,
} from '~/lib/time';
import { cn } from '~/lib/utils';
import { type CalendarLayout, gridHeight, minuteToPx } from './layout';

export function CalendarFrame({
  layout,
  days,
  scrollRef,
  children,
}: {
  layout: CalendarLayout;
  days: string[];
  scrollRef?: RefObject<HTMLDivElement | null>;
  children?: ReactNode;
}) {
  const today = todayKey(layout.timeZone);
  const height = gridHeight(layout);
  const hours: number[] = [];
  for (let m = layout.minMinute; m <= layout.maxMinute; m += 60) hours.push(m);
  const columns = { gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` };

  return (
    <div className="overflow-x-auto rounded-xl border bg-bg">
      <div className={cn('flex flex-col', days.length > 1 && 'min-w-[44rem]')}>
        <div className="flex border-b">
          <div className="w-14 shrink-0" />
          <div className="grid flex-1" style={columns}>
            {days.map((day) => {
              const enabled = layout.windowsByDay.has(day);
              const isToday = day === today;
              return (
                <div
                  key={day}
                  className={cn(
                    'flex flex-col items-center gap-0.5 border-l py-2',
                    !enabled && 'text-muted-fg/60',
                  )}
                >
                  <span className="font-medium text-muted-fg text-xs uppercase tracking-wide">
                    {formatDateKeyLabel(day, { weekday: layout.isSingleDay ? 'long' : 'short' })}
                  </span>
                  <span
                    className={cn(
                      'grid h-8 min-w-8 place-content-center rounded-full px-1.5 font-semibold text-lg tabular-nums',
                      isToday && 'bg-primary text-primary-fg',
                    )}
                  >
                    {layout.isSingleDay
                      ? formatDateKeyLabel(day, { month: 'short', day: 'numeric' })
                      : formatDateKeyLabel(day, { day: 'numeric' })}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div ref={scrollRef} className="max-h-[70vh] overflow-y-auto">
          <div className="flex py-3">
            <div className="relative w-14 shrink-0" style={{ height }}>
              {hours.map((minute) => (
                <span
                  key={minute}
                  className="absolute right-2 -translate-y-1/2 text-muted-fg text-xs tabular-nums"
                  style={{ top: minuteToPx(layout, minute) }}
                >
                  {formatMinute(minute)}
                </span>
              ))}
            </div>
            <div className="relative flex-1" style={{ height }}>
              <div className="absolute inset-0 grid" style={columns}>
                {days.map((day) => (
                  <DayBackground
                    key={day}
                    layout={layout}
                    windows={layout.windowsByDay.get(day) ?? []}
                  />
                ))}
              </div>
              {hours.map((minute) => (
                <div
                  key={minute}
                  className="pointer-events-none absolute inset-x-0 border-border/70 border-t"
                  style={{ top: minuteToPx(layout, minute) }}
                />
              ))}
              {hours.slice(0, -1).map((minute) => (
                <div
                  key={minute}
                  className="pointer-events-none absolute inset-x-0 border-border/40 border-t border-dashed"
                  style={{ top: minuteToPx(layout, minute + 30) }}
                />
              ))}
              <div className="absolute inset-0">{children}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DayBackground({ layout, windows }: { layout: CalendarLayout; windows: Interval[] }) {
  const disabled = subtractIntervals([{ start: layout.minMinute, end: layout.maxMinute }], windows);
  return (
    <div className="relative border-l">
      {disabled.map((range) => (
        <div
          key={range.start}
          className="absolute inset-x-0 bg-[repeating-linear-gradient(135deg,var(--color-muted)_0_5px,transparent_5px_10px)] opacity-70"
          style={{
            top: minuteToPx(layout, range.start),
            height: minuteToPx(layout, range.end) - minuteToPx(layout, range.start),
          }}
        />
      ))}
    </div>
  );
}
