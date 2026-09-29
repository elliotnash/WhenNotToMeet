import {
  ComboBox,
  ComboBoxContent,
  ComboBoxInput,
  ComboBoxItem,
  ComboBoxLabel,
} from '@/components/ui/combo-box';
import { Label } from '@/components/ui/field';
import { useEffect, useMemo, useState } from 'react';
import { timeZoneLabel } from '~/lib/time';

function allTimeZones(current: string) {
  const zones = Intl.supportedValuesOf('timeZone');
  if (!zones.includes(current)) zones.unshift(current);
  if (!zones.includes('UTC')) zones.push('UTC');
  return zones.map((id) => ({ id, label: timeZoneLabel(id) }));
}

export function TimeZoneSelect({
  value,
  onChange,
  label = 'Time zone',
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  label?: string | null;
  className?: string;
}) {
  const items = useMemo(() => allTimeZones(value), [value]);
  const [inputValue, setInputValue] = useState(() => timeZoneLabel(value));

  useEffect(() => setInputValue(timeZoneLabel(value)), [value]);

  return (
    <ComboBox
      aria-label={label ?? 'Time zone'}
      className={className}
      value={value}
      onChange={(key) => {
        if (key != null) onChange(String(key));
      }}
      inputValue={inputValue}
      onInputChange={setInputValue}
      defaultItems={items}
      menuTrigger="focus"
    >
      {label ? <Label>{label}</Label> : null}
      <ComboBoxInput />
      <ComboBoxContent popover={{ className: 'min-w-72' }}>
        {(item: { id: string; label: string }) => (
          <ComboBoxItem id={item.id} textValue={item.label}>
            <ComboBoxLabel>{item.label}</ComboBoxLabel>
          </ComboBoxItem>
        )}
      </ComboBoxContent>
    </ComboBox>
  );
}
