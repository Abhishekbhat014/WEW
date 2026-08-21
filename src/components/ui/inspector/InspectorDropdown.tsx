import React from 'react';
import { BehavioralHistorySelect } from '../BehavioralHistorySelect';

interface Option {
  /** The key/value used in onChange and the current value comparison */
  id: string;
  label: string;
}

interface InspectorDropdownProps {
  label: React.ReactNode;
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  /** Extra Tailwind class for the trigger width, e.g. 'w-32' */
  triggerWidth?: string;
}

/**
 * Reusable label + smart dropdown row for inspector panels.
 * Accepts { id, label }[] options — maps id → value for BehavioralHistorySelect.
 */
export const InspectorDropdown: React.FC<InspectorDropdownProps> = ({
  label,
  value,
  options,
  onChange,
  triggerWidth = 'w-32',
}) => {
  // Map { id, label } → { value, label } for BehavioralHistorySelect
  const mappedOptions = options.map((o) => ({ value: o.id, label: o.label }));

  return (
    <div className="flex items-center justify-between gap-2">
      <span className="shrink-0 text-xs font-medium text-text-primary">{label}</span>
      <BehavioralHistorySelect
        value={value}
        options={mappedOptions}
        onChange={onChange}
        triggerClassName={triggerWidth}
        className="min-w-0"
      />
    </div>
  );
};
