import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { TIME_RANGE_PRESETS } from '@/components/analytics/types/dashboard';

interface TimeRangeFilterProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function TimeRangeFilter({
  value,
  onChange,
  className,
}: TimeRangeFilterProps) {
  // Find the label for the current value
  const selectedPreset = TIME_RANGE_PRESETS.find((p) => p.value === value);

  return (
    <Select value={value} onValueChange={(v) => onChange(v ?? '')}>
      <SelectTrigger className={cn('h-8 w-40', className)}>
        <SelectValue>{selectedPreset?.label || 'Select time range'}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {TIME_RANGE_PRESETS.map((preset) => (
          <SelectItem key={preset.value} value={preset.value}>
            {preset.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
