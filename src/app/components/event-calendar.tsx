import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/20/solid';
import { useEffect, useRef, useState } from 'react';
import { CalendarFrame } from '~/components/calendar/calendar-frame';
import { initialWeekIndex, useCalendarLayout } from '~/components/calendar/layout';
import { TimeZoneSelect } from '~/components/time-zone-select';
import { browserTimeZone, formatDateRange } from '~/lib/time';
import type { PublicEvent } from '~/queries/participation';

type Mode = 'edit' | 'availability';

export function EventCalendar({ token, event }: { token: string; event: PublicEvent }) {
  const [timeZone, setTimeZone] = useState<string | null>(null);

  useEffect(() => setTimeZone(browserTimeZone()), []);

  if (!timeZone) {
    return <div className="h-[32rem] animate-pulse rounded-xl border bg-muted/40" />;
  }
  return (
    <EventCalendarView
      token={token}
      event={event}
      timeZone={timeZone}
      onTimeZoneChange={setTimeZone}
    />
  );
}

function EventCalendarView({
  event,
  timeZone,
  onTimeZoneChange,
}: {
  token: string;
  event: PublicEvent;
  timeZone: string;
  onTimeZoneChange: (timeZone: string) => void;
}) {
  const layout = useCalendarLayout(event, timeZone);
  const [mode, setMode] = useState<Mode>('edit');
  const [weekIndex, setWeekIndex] = useState(() => initialWeekIndex(layout));
  const scrollRef = useRef<HTMLDivElement>(null);

  const week = Math.min(weekIndex, layout.weeks.length - 1);
  const days = layout.weeks[week] ?? [];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ToggleGroup
          size="sm"
          selectionMode="single"
          disallowEmptySelection
          selectedKeys={[mode]}
          onSelectionChange={(keys) => {
            const [next] = [...keys];
            if (next) setMode(next as Mode);
          }}
        >
          <ToggleGroupItem id="edit">Edit my schedule</ToggleGroupItem>
          <ToggleGroupItem id="availability">Group availability</ToggleGroupItem>
        </ToggleGroup>
        <div className="flex flex-wrap items-center gap-3">
          {layout.isSingleDay ? null : (
            <div className="flex items-center gap-1">
              <Button
                intent="outline"
                size="sq-sm"
                aria-label="Previous week"
                isDisabled={week === 0}
                onPress={() => setWeekIndex(week - 1)}
              >
                <ChevronLeftIcon />
              </Button>
              <span className="min-w-36 text-center font-medium text-sm tabular-nums">
                {formatDateRange(days[0] as string, days.at(-1) as string)}
              </span>
              <Button
                intent="outline"
                size="sq-sm"
                aria-label="Next week"
                isDisabled={week === layout.weeks.length - 1}
                onPress={() => setWeekIndex(week + 1)}
              >
                <ChevronRightIcon />
              </Button>
            </div>
          )}
          <TimeZoneSelect
            label={null}
            value={timeZone}
            onChange={onTimeZoneChange}
            className="w-64"
          />
        </div>
      </div>

      <CalendarFrame layout={layout} days={days} scrollRef={scrollRef} />
    </div>
  );
}
