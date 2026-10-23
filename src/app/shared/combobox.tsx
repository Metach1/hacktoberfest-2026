"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";

/**
 * An accessible, type-to-filter combobox (single select). The user types to
 * filter `options` by case-insensitive substring; a listbox shows the matches.
 * Selection is restricted to values that exist in `options`, so parent/child
 * cascades (region -> province -> city) can never go inconsistent.
 *
 * Controlled: the parent owns `value` and gets updates via `onChange`. The
 * internal text query is UI-only and resets to the selected value's label
 * whenever the field loses focus or closes without a new selection.
 *
 * Options may be plain strings or { value, label } pairs so a field can store a
 * code while displaying a name (e.g. a region code vs its display name).
 */
export interface ComboboxOption {
  value: string;
  label: string;
}

export interface ComboboxProps {
  options: Array<string | ComboboxOption>;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  /** Accessible name for the input when there is no visible <label htmlFor>. */
  ariaLabel?: string;
  /** id for the input, so an external <label htmlFor> can point at it. */
  id?: string;
  className?: string;
}

function normalizeOptions(
  options: Array<string | ComboboxOption>,
): ComboboxOption[] {
  return options.map((option) =>
    typeof option === "string" ? { value: option, label: option } : option,
  );
}

export function Combobox({
  options,
  value,
  onChange,
  placeholder,
  disabled = false,
  required = false,
  ariaLabel,
  id,
  className,
}: ComboboxProps) {
  const reactId = useId();
  const inputId = id ?? `combobox-${reactId}`;
  const listboxId = `${inputId}-listbox`;

  const normalized = useMemo(() => normalizeOptions(options), [options]);
  const selectedLabel = useMemo(
    () => normalized.find((option) => option.value === value)?.label ?? "",
    [normalized, value],
  );

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // When closed, the input shows the selected label. While open, it shows the
  // live query the user is typing (which starts empty so all options show).
  const inputValue = open ? query : selectedLabel;

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return normalized;
    return normalized.filter((option) => option.label.toLowerCase().includes(q));
  }, [normalized, query]);

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setActiveIndex(-1);
  }, []);

  const select = useCallback(
    (option: ComboboxOption) => {
      onChange(option.value);
      close();
    },
    [onChange, close],
  );

  // Outside click + Escape close the listbox without changing the value.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) {
        close();
      }
    };
    window.addEventListener("mousedown", onPointerDown);
    return () => window.removeEventListener("mousedown", onPointerDown);
  }, [open, close]);

  const openList = useCallback(() => {
    if (disabled) return;
    setOpen(true);
    setQuery("");
    // Preselect the current value in the list, if present.
    setActiveIndex(normalized.findIndex((option) => option.value === value));
  }, [disabled, normalized, value]);

  // Clamp the active index to the current match list at render time (rather
  // than writing state in an effect, which can cascade renders). The stored
  // activeIndex is a hint; this derived value is what the UI/keyboard uses.
  const clampedActiveIndex =
    matches.length === 0 ? -1 : Math.min(Math.max(activeIndex, 0), matches.length - 1);

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        if (!open) {
          openList();
          return;
        }
        setActiveIndex((index) => Math.min(index + 1, matches.length - 1));
        break;
      case "ArrowUp":
        event.preventDefault();
        if (!open) return;
        setActiveIndex((index) => Math.max(index - 1, 0));
        break;
      case "Enter":
        if (open && clampedActiveIndex >= 0 && clampedActiveIndex < matches.length) {
          event.preventDefault();
          select(matches[clampedActiveIndex]);
        }
        break;
      case "Escape":
        if (open) {
          event.preventDefault();
          close();
        }
        break;
      case "Tab":
        if (open) close();
        break;
      default:
        break;
    }
  };

  const activeOptionId =
    open && clampedActiveIndex >= 0 && clampedActiveIndex < matches.length
      ? `${inputId}-option-${clampedActiveIndex}`
      : undefined;

  return (
    <div className={className ? `combobox ${className}` : "combobox"} ref={wrapRef}>
      <input
        id={inputId}
        ref={inputRef}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-autocomplete="list"
        aria-activedescendant={activeOptionId}
        aria-label={ariaLabel}
        autoComplete="off"
        className="combobox-input"
        placeholder={placeholder}
        disabled={disabled}
        // Required is enforced against the committed value, not the UI text.
        required={required}
        value={inputValue}
        onChange={(event) => {
          if (!open) setOpen(true);
          setQuery(event.target.value);
        }}
        onFocus={openList}
        onClick={openList}
        onKeyDown={onKeyDown}
      />
      {/* Mirror the committed value so native required-validation and form reads
          see the actual selection, independent of the free-typed query. */}
      {required && (
        <input
          tabIndex={-1}
          aria-hidden="true"
          className="combobox-sentinel"
          style={{ display: "none" }}
          value={value}
          required
          onChange={() => {}}
        />
      )}
      {open && (
        <ul className="combobox-list" role="listbox" id={listboxId}>
          {matches.length === 0 ? (
            <li className="combobox-empty" role="presentation">No matches</li>
          ) : (
            matches.map((option, index) => (
              <li
                key={option.value}
                id={`${inputId}-option-${index}`}
                role="option"
                aria-selected={option.value === value}
                className={
                  index === clampedActiveIndex ? "combobox-option active" : "combobox-option"
                }
                onMouseDown={(event) => {
                  // Prevent the input blur before the click registers.
                  event.preventDefault();
                  select(option);
                }}
                onMouseEnter={() => setActiveIndex(index)}
              >
                {option.label}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
