import { Button } from '@/components/ui/button';
import { Loader } from '@/components/ui/loader';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  ArrowUturnLeftIcon,
  ArrowUturnRightIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@heroicons/react/20/solid';
import { useBlocker } from '@tanstack/react-router';
import { Suspense, useEffect, useRef, useState } from 'react';
import { CalendarFrame } from '~/components/calendar/calendar-frame';
import { initialWeekIndex, useCalendarLayout } from '~/components/calendar/layout';
import { ScheduleEditor } from '~/components/calendar/schedule-editor';
import { type ScheduleDraft, useScheduleDraft } from '~/components/calendar/use-schedule-draft';
import { ConfirmModal } from '~/components/confirm-modal';
import { TimeZoneSelect } from '~/components/time-zone-select';
import { browserTimeZone, formatDateRange } from '~/lib/time';
import type { PublicEvent } from '~/queries/participation';

type Mode = 'edit' | 'availability';

function CalendarSkeleton() {
  return <div className="h-[32rem] animate-pulse rounded-xl border bg-muted/40" />;
}

interface EventCalendarProps {
  token: string;
  event: PublicEvent;
  hasResponded: boolean;
  onDirtyChange: (isDirty: boolean) => void;
}

export function EventCalendar(props: EventCalendarProps) {
  const [timeZone, setTimeZone] = useState<string | null>(null);

  useEffect(() => setTimeZone(browserTimeZone()), []);

  if (!timeZone) return <CalendarSkeleton />;
  return (
    <Suspense fallback={<CalendarSkeleton />}>
      <EventCalendarView {...props} timeZone={timeZone} onTimeZoneChange={setTimeZone} />
    </Suspense>
  );
}

function EventCalendarView({
  token,
  event,
  hasResponded,
  onDirtyChange,
  timeZone,
  onTimeZoneChange,
}: EventCalendarProps & { timeZone: string; onTimeZoneChange: (timeZone: string) => void }) {
  const layout = useCalendarLayout(event, timeZone);
  const draft = useScheduleDraft(token);
  const [mode, setMode] = useState<Mode>('edit');
  const [weekIndex, setWeekIndex] = useState(() => initialWeekIndex(layout));
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => onDirtyChange(draft.isDirty), [draft.isDirty, onDirtyChange]);

  const blocker = useBlocker({
    shouldBlockFn: () => draft.isDirty,
    enableBeforeUnload: () => draft.isDirty,
    withResolver: true,
  });

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

      {mode === 'edit' ? <EditToolbar draft={draft} hasResponded={hasResponded} /> : null}

      <CalendarFrame layout={layout} days={days} scrollRef={scrollRef}>
        {mode === 'edit' ? (
          <ScheduleEditor
            layout={layout}
            days={days}
            blocks={draft.blocks}
            onChange={draft.apply}
            onUndo={draft.undo}
            onRedo={draft.redo}
            scrollRef={scrollRef}
          />
        ) : null}
      </CalendarFrame>

      <ConfirmModal
        isOpen={blocker.status === 'blocked'}
        onOpenChange={(open) => {
          if (!open) blocker.reset?.();
        }}
        title="Discard unsaved changes?"
        description="Your schedule changes haven't been saved."
        confirmLabel="Discard changes"
        onConfirm={() => blocker.proceed?.()}
      />
    </div>
  );
}

function EditToolbar({ draft, hasResponded }: { draft: ScheduleDraft; hasResponded: boolean }) {
  const status = draft.isDirty
    ? 'Unsaved changes'
    : hasResponded
      ? 'All changes saved'
      : 'Drag on the calendar to mark when you’re busy, then save';

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-muted/30 px-3 py-2">
      <p
        className={
          draft.isDirty ? 'font-medium text-sm text-warning-subtle-fg' : 'text-muted-fg text-sm'
        }
      >
        {status}
        {draft.save.error ? (
          <span className="ml-2 text-danger-subtle-fg">{draft.save.error.message}</span>
        ) : null}
      </p>
      <div className="flex items-center gap-2">
        <Button
          intent="plain"
          size="sq-sm"
          aria-label="Undo"
          isDisabled={!draft.canUndo}
          onPress={draft.undo}
        >
          <ArrowUturnLeftIcon />
        </Button>
        <Button
          intent="plain"
          size="sq-sm"
          aria-label="Redo"
          isDisabled={!draft.canRedo}
          onPress={draft.redo}
        >
          <ArrowUturnRightIcon />
        </Button>
        <Button intent="outline" size="sm" isDisabled={!draft.isDirty} onPress={draft.discard}>
          Discard
        </Button>
        <Button
          size="sm"
          isDisabled={!draft.isDirty && hasResponded}
          isPending={draft.save.isPending}
          onPress={() => draft.save.mutate()}
        >
          {draft.save.isPending ? <Loader /> : null}
          Save
        </Button>
      </div>
    </div>
  );
}
