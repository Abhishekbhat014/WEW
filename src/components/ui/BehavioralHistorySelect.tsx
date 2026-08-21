import * as React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './Select';
import { cn } from '../../utils/cn';

export interface HistoryOption {
  value: string;
  label: string;
}

export interface BehavioralHistorySelectProps {
  options: HistoryOption[];
  value?: string;
  label?: string;
  placeholder?: string;
  onChange?: (value: string) => void;
  defaultValue?: string;
  className?: string;
  triggerClassName?: string;
}

/**
 * Simple reusable Select dropdown.
 */
export const BehavioralHistorySelect: React.FC<BehavioralHistorySelectProps> = ({
  options,
  value,
  placeholder = 'Select...',
  onChange,
  defaultValue,
  className,
  triggerClassName,
}) => {
  const [internal, setInternal] = React.useState(defaultValue ?? value ?? '');

  React.useEffect(() => {
    if (value !== undefined) setInternal(value);
  }, [value]);

  const handleChange = (val: string) => {
    if (value === undefined) setInternal(val);
    onChange?.(val);
  };

  const currentValue = value !== undefined ? value : internal;

  return (
    <div className={cn('flex flex-col', className)}>
      <Select value={currentValue} onValueChange={handleChange}>
        <SelectTrigger className={cn('w-full', triggerClassName)}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
