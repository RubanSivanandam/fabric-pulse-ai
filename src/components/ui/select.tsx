import React from 'react';
import './select.css';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  value: string | null;
  onValueChange: (value: string | null) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  loading?: boolean;
  emptyMessage?: string;
  className?: string;
}

export const Select: React.FC<SelectProps> = ({
  value,
  onValueChange,
  options,
  placeholder = 'Select an option...',
  disabled = false,
  loading = false,
  emptyMessage = 'No options available',
  className = '',
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newValue = e.target.value;
    onValueChange(newValue === '' ? null : newValue);
  };

  return (
    <div className={`select-wrapper ${className}`}>
      <select
        value={value || ''}
        onChange={handleChange}
        disabled={disabled || loading}
        className={`select ${loading ? 'loading' : ''}`}
      >
        <option value="">
          {loading ? 'Loading...' : placeholder}
        </option>
        {options.length === 0 && !loading && (
          <option value="" disabled>
            {emptyMessage}
          </option>
        )}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {loading && <div className="select-spinner">⟳</div>}
    </div>
  );
};

export const SelectValue: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <span className="select-value">{children}</span>;
};

export const SelectItem: React.FC<{ value: string; children: React.ReactNode }> = ({ 
  children 
}) => {
  return <>{children}</>;
};

export const SelectContent: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <>{children}</>;
};

export const SelectTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, children, ...props }, ref) => (
  <button
    ref={ref}
    className={`select-trigger ${className || ''}`}
    {...props}
  >
    {children}
  </button>
));

SelectTrigger.displayName = 'SelectTrigger';
