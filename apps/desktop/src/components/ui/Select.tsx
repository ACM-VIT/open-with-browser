/* global Node, MouseEvent, EventListener, HTMLButtonElement, HTMLDivElement, HTMLInputElement */

import {
  type KeyboardEvent,
  type ReactNode,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';

type BaseOption = {
  value: string;
  label: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
};

export type SelectOption = BaseOption;

export type SelectProps = {
  options: SelectOption[];
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  name?: string;
  className?: string;
};

function findNextEnabled(options: SelectOption[], start: number, step: 1 | -1) {
  const total = options.length;
  let index = start;
  for (let i = 0; i < total; i += 1) {
    const option = options[index];
    if (option && !option.disabled) return index;
    index = (index + step + total) % total;
  }
  return -1;
}

export function Select({
  options,
  value,
  defaultValue,
  onChange,
  placeholder = 'Select…',
  disabled = false,
  name,
  className = '',
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const fallbackValue =
    defaultValue ?? options.find(option => !option.disabled)?.value;
  const selectedValue = value ?? fallbackValue ?? '';
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const listboxId = useId();
  const buttonId = useId();

  const activeOptionIndex = useMemo(() => {
    if (!selectedValue) return findNextEnabled(options, 0, 1);
    const index = options.findIndex(option => option.value === selectedValue);
    if (index === -1) return findNextEnabled(options, 0, 1);
    return index;
  }, [options, selectedValue]);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (
        event.target instanceof Node &&
        !triggerRef.current?.contains(event.target) &&
        !listRef.current?.contains(event.target)
      ) {
        setOpen(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener(
      'keydown',
      handleEscape as unknown as EventListener
    );
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener(
        'keydown',
        handleEscape as unknown as EventListener
      );
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const firstFocusable = listRef.current?.querySelector<HTMLButtonElement>(
      '[data-select-option]:not([disabled])'
    );
    firstFocusable?.focus();
  }, [open, activeOptionIndex]);

  const selectAt = (index: number) => {
    const option = options[index];
    if (!option || option.disabled) return;
    onChange?.(option.value);
    setOpen(false);
    triggerRef.current?.focus();
  };

  const handleTriggerKey = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;
    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowUp': {
        event.preventDefault();
        if (!open) {
          setOpen(true);
          return;
        }
        const step = event.key === 'ArrowDown' ? 1 : -1;
        const nextIndex = findNextEnabled(
          options,
          (activeOptionIndex + step + options.length) % options.length,
          step
        );
        if (nextIndex >= 0) {
          selectAt(nextIndex);
        }
        break;
      }
      case ' ':
      case 'Enter':
        event.preventDefault();
        setOpen(prev => !prev);
        break;
      default:
    }
  };

  const handleOptionKey = (
    event: KeyboardEvent<HTMLButtonElement>,
    index: number
  ) => {
    switch (event.key) {
      case 'Tab':
        setOpen(false);
        break;
      case 'Escape':
        event.preventDefault();
        setOpen(false);
        triggerRef.current?.focus();
        break;
      case 'ArrowDown': {
        event.preventDefault();
        const next = findNextEnabled(options, (index + 1) % options.length, 1);
        if (next >= 0) {
          const button = listRef.current?.querySelector<HTMLButtonElement>(
            `[data-select-index="${next}"]`
          );
          button?.focus();
        }
        break;
      }
      case 'ArrowUp': {
        event.preventDefault();
        const prev = findNextEnabled(
          options,
          (index - 1 + options.length) % options.length,
          -1
        );
        if (prev >= 0) {
          const button = listRef.current?.querySelector<HTMLButtonElement>(
            `[data-select-index="${prev}"]`
          );
          button?.focus();
        }
        break;
      }
      case 'Enter':
      case ' ': {
        event.preventDefault();
        selectAt(index);
        break;
      }
      default:
    }
  };

  const displayLabel =
    options.find(option => option.value === selectedValue)?.label ??
    placeholder;

  return (
    <div className={`relative ${className}`}>
      <button
        id={buttonId}
        type='button'
        aria-controls={listboxId}
        aria-expanded={open}
        aria-haspopup='listbox'
        disabled={disabled}
        ref={triggerRef}
        onClick={() => {
          if (!disabled) setOpen(prev => !prev);
        }}
        onKeyDown={handleTriggerKey}
        className='flex w-full items-center justify-between rounded-[14px] border border-white/10 bg-black/40 px-3 py-2 text-left text-sm text-zinc-100 shadow-soft-sm transition focus:border-emerald-300/60 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50'
      >
        <span className='truncate'>{displayLabel}</span>
        <span className='ml-3 text-xs text-zinc-500'>{open ? '▴' : '▾'}</span>
      </button>
      {name ? <input type='hidden' name={name} value={selectedValue} /> : null}
      {open ? (
        <div
          id={listboxId}
          ref={listRef}
          role='listbox'
          aria-labelledby={buttonId}
          className='absolute z-30 mt-2 max-h-60 w-full overflow-auto rounded-[14px] border border-white/10 bg-zinc-950/95 p-1 shadow-soft-sm backdrop-blur'
        >
          {options.map((option, index) => {
            const isSelected = option.value === selectedValue;
            return (
              <button
                key={option.value}
                type='button'
                role='option'
                aria-selected={isSelected}
                disabled={option.disabled}
                data-select-option
                data-select-index={index}
                tabIndex={isSelected ? 0 : -1}
                onClick={() => selectAt(index)}
                onKeyDown={event => handleOptionKey(event, index)}
                className={`flex w-full flex-col items-start gap-1 rounded-[10px] px-3 py-2 text-left text-sm transition ${
                  isSelected
                    ? 'bg-emerald-500/10 text-emerald-200'
                    : 'text-zinc-200 hover:bg-white/5'
                } ${option.disabled ? 'opacity-40' : ''}`}
              >
                <span className='truncate'>{option.label}</span>
                {option.description ? (
                  <span className='text-xs text-zinc-500'>
                    {option.description}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export type ComboboxOption = {
  value: string;
  label: string;
  badge?: string | null;
};

type ComboboxProps = {
  options: ComboboxOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  allowCustom?: boolean;
  disabled?: boolean;
  emptyLabel?: string;
  className?: string;
};

export function Combobox({
  options,
  value,
  onChange,
  placeholder = 'Search…',
  allowCustom = true,
  disabled = false,
  emptyLabel = 'No matches',
  className = '',
}: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const listboxId = useId();
  const buttonId = useId();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(option => option.label.toLowerCase().includes(q));
  }, [options, query]);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (
        event.target instanceof Node &&
        !triggerRef.current?.contains(event.target) &&
        !listRef.current?.contains(event.target)
      ) {
        setOpen(false);
      }
    };
    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener(
      'keydown',
      handleKeydown as unknown as EventListener
    );
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener(
        'keydown',
        handleKeydown as unknown as EventListener
      );
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
  }, [open]);

  const commitValue = (next: string) => {
    onChange(next);
    setOpen(false);
    setQuery('');
    setActiveIndex(-1);
    triggerRef.current?.focus();
  };

  const handleSelect = (option: ComboboxOption) => {
    commitValue(option.label);
  };

  const handleSubmitCustom = () => {
    const trimmed = query.trim();
    if (!allowCustom || !trimmed) return;
    commitValue(trimmed);
  };

  const currentLabel = value || '';

  const handleTriggerKey = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;
    if (
      event.key === 'ArrowDown' ||
      event.key === 'Enter' ||
      event.key === ' '
    ) {
      event.preventDefault();
      setOpen(true);
    }
  };

  const handleOptionKey = (
    event: KeyboardEvent<HTMLButtonElement>,
    index: number
  ) => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        if (index < filtered.length - 1) {
          const next = listRef.current?.querySelector<HTMLButtonElement>(
            `[data-combobox-index="${index + 1}"]`
          );
          next?.focus();
          setActiveIndex(index + 1);
        }
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (index > 0) {
          const prev = listRef.current?.querySelector<HTMLButtonElement>(
            `[data-combobox-index="${index - 1}"]`
          );
          prev?.focus();
          setActiveIndex(index - 1);
        } else {
          inputRef.current?.focus();
          setActiveIndex(-1);
        }
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        handleSelect(filtered[index]);
        break;
      default:
    }
  };

  return (
    <div className={`relative ${className}`}>
      <button
        id={buttonId}
        ref={triggerRef}
        type='button'
        role='combobox'
        aria-haspopup='listbox'
        aria-expanded={open}
        aria-controls={listboxId}
        disabled={disabled}
        onClick={() => {
          if (!disabled) setOpen(prev => !prev);
        }}
        onKeyDown={handleTriggerKey}
        className='flex w-full items-center justify-between rounded-[14px] border border-white/10 bg-black/40 px-3 py-2 text-left text-sm text-zinc-100 shadow-soft-sm transition focus:border-emerald-300/60 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50'
      >
        <span className='truncate'>{currentLabel || placeholder}</span>
        <span className='ml-3 text-xs text-zinc-500'>{open ? '▴' : '▾'}</span>
      </button>
      {open ? (
        <div
          id={listboxId}
          ref={listRef}
          className='absolute z-30 mt-2 w-full rounded-[16px] border border-white/10 bg-zinc-950/95 p-2 shadow-soft-sm backdrop-blur'
        >
          <input
            ref={inputRef}
            type='text'
            value={query}
            onChange={event => {
              setQuery(event.target.value);
              setActiveIndex(-1);
            }}
            onKeyDown={event => {
              if (event.key === 'Enter') {
                event.preventDefault();
                if (activeIndex >= 0 && filtered[activeIndex]) {
                  handleSelect(filtered[activeIndex]);
                } else {
                  handleSubmitCustom();
                }
              } else if (event.key === 'ArrowDown') {
                event.preventDefault();
                if (filtered.length > 0) {
                  const first =
                    listRef.current?.querySelector<HTMLButtonElement>(
                      '[data-combobox-index="0"]'
                    );
                  first?.focus();
                  setActiveIndex(0);
                }
              } else if (event.key === 'Escape') {
                setOpen(false);
                triggerRef.current?.focus();
              }
            }}
            placeholder={placeholder}
            className='mb-2 w-full rounded-[12px] border border-white/10 bg-black/40 px-3 py-2 text-sm text-zinc-100 shadow-soft-sm focus:border-emerald-300/60 focus:outline-none'
          />
          <div
            role='listbox'
            aria-labelledby={buttonId}
            className='max-h-60 overflow-auto'
          >
            {filtered.length === 0 ? (
              <div className='px-3 py-2 text-xs text-zinc-500'>
                {emptyLabel}
              </div>
            ) : (
              filtered.map((option, index) => (
                <button
                  key={`${option.value}-${index}`}
                  type='button'
                  role='option'
                  data-combobox-index={index}
                  onClick={() => handleSelect(option)}
                  onKeyDown={event => handleOptionKey(event, index)}
                  className={`flex w-full items-center justify-between gap-3 rounded-[12px] px-3 py-2 text-left text-sm transition ${
                    option.label === currentLabel
                      ? 'bg-emerald-500/15 text-emerald-200'
                      : 'text-zinc-200 hover:bg-white/5'
                  }`}
                >
                  <span className='truncate'>{option.label}</span>
                  {option.badge ? (
                    <span className='rounded-full border border-white/10 bg-black/40 px-2 py-[2px] text-[10px] uppercase tracking-[0.22em] text-zinc-500'>
                      {option.badge}
                    </span>
                  ) : null}
                </button>
              ))
            )}
            {allowCustom && query.trim() && (
              <button
                type='button'
                onClick={handleSubmitCustom}
                className='mt-2 w-full rounded-[12px] border border-dashed border-white/10 bg-black/30 px-3 py-2 text-left text-xs font-semibold uppercase tracking-[0.24em] text-zinc-400 hover:border-emerald-400/40 hover:text-emerald-200'
              >
                Use “{query.trim()}”
              </button>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
