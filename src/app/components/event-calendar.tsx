import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/field';
import { Loader } from '@/components/ui/loader';
import { Slider, SliderOutput, SliderTrack } from '@/components/ui/slider';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  ArrowUturnLeftIcon,
  ArrowUturnRightIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@heroicons/react/20/solid';
import { useQuery } from '@tanstack/react-query';
import { useBlocker } from '@tanstack/react-router';
import { Suspense, useEffect, useRef, useState } from 'react';
import { AvailabilityOverlay } from '~/components/calendar/availability-overlay';
import { CalendarFrame } from '~/components/calendar/calendar-frame';
import { initialWeekIndex, useCalendarLayout } from '~/components/calendar/layout';
import { ScheduleEditor } from '~/components/calendar/schedule-editor';
import { type ScheduleDraft, useScheduleDraft } from '~/components/calendar/use-schedule-draft';
import { ConfirmModal } from '~/components/confirm-modal';
import { TimeZoneSelect } from '~/components/time-zone-select';
import { browserTimeZone, formatDateRange } from '~/lib/time';
import { type Availability, type PublicEvent, availabilityQuery } from '~/queries/participation';

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
  const availability = useQuery({
    ...availabilityQuery(token),
    enabled: mode === 'availability',
  });
  const [minPeople, setMinPeople] = useState(1);
  const total = availability.data?.participants.length ?? 0;
  const effectiveMin = Math.min(Math.max(minPeople, 1), Math.max(total, 1));

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

      {mode === 'edit' ? (
        <EditToolbar draft={draft} hasResponded={hasResponded} />
      ) : (
        <AvailabilityToolbar
          data={availability.data}
          minPeople={effectiveMin}
          onMinPeopleChange={setMinPeople}
          hasUnsavedChanges={draft.isDirty}
        />
      )}

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
        ) : availability.data ? (
          <AvailabilityOverlay
            layout={layout}
            days={days}
            data={availability.data}
            minPeople={effectiveMin}
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

function AvailabilityToolbar({
  data,
  minPeople,
  onMinPeopleChange,
  hasUnsavedChanges,
}: {
  data: Availability | undefined;
  minPeople: number;
  onMinPeopleChange: (value: number) => void;
  hasUnsavedChanges: boolean;
}) {
  const total = data?.participants.length ?? 0;

  return (
    <div className="flex min-h-12 flex-wrap items-center justify-between gap-x-6 gap-y-3 rounded-xl border bg-muted/30 px-3 py-2">
      {!data ? (
        <p className="flex items-center gap-2 text-muted-fg text-sm">
          <Loader /> Loading availability…
        </p>
      ) : total === 0 ? (
        <p className="text-muted-fg text-sm">No one has saved their schedule yet.</p>
      ) : (
        <>
          <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2">
            <Slider
              className="w-56"
              minValue={1}
              maxValue={Math.max(total, 2)}
              step={1}
              value={minPeople}
              isDisabled={total < 2}
              onChange={(value) => onMinPeopleChange(value as number)}
            >
              <div className="flex items-center justify-between gap-2">
                <Label>Minimum available</Label>
                <SliderOutput className="tabular-nums">
                  {({ state }) => `${state.getThumbValue(0)} of ${total}`}
                </SliderOutput>
              </div>
              <SliderTrack />
            </Slider>
            <div className="flex items-center gap-2 text-muted-fg text-xs tabular-nums">
              <span>{minPeople}</span>
              <span
                aria-hidden
                className="h-2.5 w-28 rounded-full border bg-linear-to-r from-transparent to-primary"
              />
              <span>{total} available</span>
            </div>
          </div>
          <p className="text-muted-fg text-sm">
            {hasUnsavedChanges
              ? 'Save your schedule to include your changes.'
              : `${total} ${total === 1 ? 'response' : 'responses'} · hover a block for names`}
          </p>
        </>
      )}
    </div>
  );
}
