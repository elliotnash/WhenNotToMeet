import { Button } from '@/components/ui/button';
import { DateRangePicker, DateRangePickerTrigger } from '@/components/ui/date-range-picker';
import { Description, FieldError, Label } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Loader } from '@/components/ui/loader';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectLabel,
  SelectTrigger,
} from '@/components/ui/select';
import { TextField } from '@/components/ui/text-field';
import { Textarea } from '@/components/ui/textarea';
import { parseDate, today } from '@internationalized/date';
import { useEffect, useState } from 'react';
import { TimeZoneSelect } from '~/components/time-zone-select';
import { type EventInput, eventInputSchema } from '~/lib/event-schema';
import { DAY_MINUTES, SLOT_MINUTES, browserTimeZone, formatMinute } from '~/lib/time';

const timeOptions = Array.from({ length: DAY_MINUTES / SLOT_MINUTES + 1 }, (_, i) => {
  const minute = i * SLOT_MINUTES;
  return { id: minute, label: minute === DAY_MINUTES ? '12am (midnight)' : formatMinute(minute) };
});

function defaultValues(): EventInput {
  const start = today('UTC').add({ days: 1 }).toString();
  return {
    title: '',
    description: '',
    timezone: 'UTC',
    startDate: start,
    endDate: start,
    dayStartMinute: 9 * 60,
    dayEndMinute: 17 * 60,
  };
}

type FieldErrors = Partial<Record<keyof EventInput, string>>;

export function EventForm({
  initial,
  submitLabel,
  pendingLabel,
  onSubmit,
  isPending,
  error,
  onCancel,
}: {
  initial?: EventInput;
  submitLabel: string;
  pendingLabel: string;
  onSubmit: (values: EventInput) => void;
  isPending: boolean;
  error?: string | null;
  onCancel?: () => void;
}) {
  const [values, setValues] = useState<EventInput>(() => initial ?? defaultValues());
  const [errors, setErrors] = useState<FieldErrors>({});

  useEffect(() => {
    if (!initial) setValues((v) => ({ ...v, timezone: browserTimeZone() }));
  }, [initial]);

  const set = <K extends keyof EventInput>(key: K, value: EventInput[K]) => {
    setValues((v) => ({ ...v, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const parsed = eventInputSchema.safeParse(values);
    if (!parsed.success) {
      const next: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof EventInput;
        next[key] ??= issue.message;
      }
      setErrors(next);
      return;
    }
    onSubmit(parsed.data);
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-6">
      <TextField
        isRequired
        value={values.title}
        onChange={(v) => set('title', v)}
        isInvalid={!!errors.title}
        maxLength={100}
      >
        <Label>Title</Label>
        <Input placeholder="Team offsite planning" />
        <FieldError>{errors.title}</FieldError>
      </TextField>

      <TextField
        value={values.description ?? ''}
        onChange={(v) => set('description', v)}
        maxLength={1000}
      >
        <Label>Description</Label>
        <Textarea placeholder="Optional details for participants" />
      </TextField>

      <DateRangePicker
        isRequired
        value={{ start: parseDate(values.startDate), end: parseDate(values.endDate) }}
        onChange={(range) => {
          if (!range) return;
          setValues((v) => ({
            ...v,
            startDate: range.start.toString(),
            endDate: range.end.toString(),
          }));
          setErrors((e) => ({ ...e, startDate: undefined, endDate: undefined }));
        }}
        isInvalid={!!(errors.startDate || errors.endDate)}
      >
        <Label>Dates</Label>
        <Description>Pick a single day or a range of days.</Description>
        <DateRangePickerTrigger />
        <FieldError>{errors.startDate ?? errors.endDate}</FieldError>
      </DateRangePicker>

      <div className="grid gap-4 sm:grid-cols-2">
        <TimeSelect
          label="Earliest time"
          value={values.dayStartMinute}
          onChange={(v) => set('dayStartMinute', v)}
          options={timeOptions.slice(0, -1)}
          error={errors.dayStartMinute}
        />
        <TimeSelect
          label="Latest time"
          value={values.dayEndMinute}
          onChange={(v) => set('dayEndMinute', v)}
          options={timeOptions.slice(1)}
          error={errors.dayEndMinute}
        />
      </div>

      <div>
        <TimeZoneSelect value={values.timezone} onChange={(v) => set('timezone', v)} />
        <p className="mt-2 text-muted-fg text-sm/6">
          Participants see these hours converted to their own time zone.
        </p>
        {errors.timezone ? (
          <p className="text-danger-subtle-fg text-sm/6">{errors.timezone}</p>
        ) : null}
      </div>

      {error ? <p className="text-danger-subtle-fg text-sm">{error}</p> : null}

      <div className="flex justify-end gap-2">
        {onCancel ? (
          <Button intent="outline" onPress={onCancel}>
            Cancel
          </Button>
        ) : null}
        <Button type="submit" isPending={isPending}>
          {isPending ? (
            <>
              <Loader /> {pendingLabel}
            </>
          ) : (
            submitLabel
          )}
        </Button>
      </div>
    </form>
  );
}

function TimeSelect({
  label,
  value,
  onChange,
  options,
  error,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  options: { id: number; label: string }[];
  error?: string;
}) {
  return (
    <Select
      value={value}
      onChange={(key) => {
        if (key != null) onChange(Number(key));
      }}
      isInvalid={!!error}
    >
      <Label>{label}</Label>
      <SelectTrigger />
      <SelectContent items={options}>
        {(item) => (
          <SelectItem id={item.id} textValue={item.label}>
            <SelectLabel>{item.label}</SelectLabel>
          </SelectItem>
        )}
      </SelectContent>
      <FieldError>{error}</FieldError>
    </Select>
  );
}
