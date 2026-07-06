"use client";

import { useEffect, useRef, useState } from "react";

// Generic debounced autocomplete input for the intake form. Fetches options
// as the clinician types (min 2 chars, 250 ms debounce); arrow keys +
// Enter/click select; Escape closes; free text always remains possible via
// onFreeText (Enter with nothing highlighted) — the picker helps, never traps.

export interface AutocompleteOption {
  id: string;
  primary: string; // main label
  secondary?: string; // e.g. the ICD-10 code
}

export function AutocompleteInput({
  placeholder,
  fetchOptions,
  onSelect,
  onFreeText,
}: {
  placeholder: string;
  fetchOptions: (term: string) => Promise<AutocompleteOption[]>;
  onSelect: (option: AutocompleteOption) => void;
  onFreeText: (text: string) => void;
}) {
  const [term, setTerm] = useState("");
  const [options, setOptions] = useState<AutocompleteOption[]>([]);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestSeq = useRef(0);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (term.trim().length < 2) {
      setOptions([]);
      setOpen(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      const seq = ++requestSeq.current;
      try {
        const result = await fetchOptions(term);
        // Stale-response guard: only the latest request may render.
        if (seq !== requestSeq.current) return;
        setOptions(result);
        setOpen(result.length > 0);
        setHighlight(result.length > 0 ? 0 : -1);
      } catch {
        if (seq === requestSeq.current) setOpen(false);
      }
    }, 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [term]);

  function choose(option: AutocompleteOption) {
    onSelect(option);
    setTerm("");
    setOptions([]);
    setOpen(false);
    setHighlight(-1);
  }

  function submitFreeText() {
    const text = term.trim();
    if (!text) return;
    onFreeText(text);
    setTerm("");
    setOptions([]);
    setOpen(false);
    setHighlight(-1);
  }

  return (
    <div className="relative">
      <input
        value={term}
        onChange={(e) => setTerm(e.target.value)}
        placeholder={placeholder}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" && open) {
            e.preventDefault();
            setHighlight((h) => Math.min(h + 1, options.length - 1));
          } else if (e.key === "ArrowUp" && open) {
            e.preventDefault();
            setHighlight((h) => Math.max(h - 1, 0));
          } else if (e.key === "Enter") {
            e.preventDefault();
            if (open && highlight >= 0 && options[highlight]) choose(options[highlight]);
            else submitFreeText();
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className="mt-1 w-full rounded-md border border-[#E6E4DB] px-3 py-2 text-sm focus:border-clinical focus:outline-none"
      />
      {open && (
        <ul className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-md border border-[#E6E4DB] bg-white py-1 shadow-lg">
          {options.map((o, i) => (
            <li key={o.id}>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault(); // beat the input's onBlur
                  choose(o);
                }}
                onMouseEnter={() => setHighlight(i)}
                className={`flex w-full items-baseline gap-2 px-3 py-1.5 text-left text-sm ${
                  i === highlight ? "bg-[#F1F0EB]" : ""
                }`}
              >
                <span className="text-ink">{o.primary}</span>
                {o.secondary && <span className="font-mono text-xs text-[#bcb7a9]">{o.secondary}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
