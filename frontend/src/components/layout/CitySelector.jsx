import { useEffect, useRef, useState } from "react";
import { MapPin, ChevronDown } from "lucide-react";
import { useMeta } from "../../utils/useMeta";

/** Selector kota (kota-kota besar Indonesia) — pilihan tersimpan di localStorage. */
export default function CitySelector({ onChange }) {
  const { cities } = useMeta();
  const [open, setOpen] = useState(false);
  const [city, setCity] = useState(() => localStorage.getItem("selectedCity") || "");
  const boxRef = useRef(null);

  useEffect(() => {
    function onClickOutside(e) {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function pick(value) {
    setCity(value);
    localStorage.setItem("selectedCity", value);
    setOpen(false);
    onChange?.(value);
  }

  return (
    <div className="relative hidden md:block" ref={boxRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-200 dark:bg-surface-high/60 dark:text-slate-200 dark:hover:bg-surface-high"
      >
        <MapPin size={15} className="text-brand-600 dark:text-brand-400" />
        <span>{city || "Semua Kota"}</span>
        <ChevronDown size={14} className="text-slate-400" />
      </button>

      {open && (
        <div className="absolute left-0 z-40 mt-2 max-h-72 w-56 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg dark:border-white/10 dark:bg-surface-container">
          <button
            onClick={() => pick("")}
            className={`block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-surface-high ${!city ? "font-semibold text-brand-600 dark:text-brand-400" : ""}`}
          >
            Semua Kota
          </button>
          {cities.map((c) => (
            <button
              key={c}
              onClick={() => pick(c)}
              className={`block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-surface-high ${city === c ? "font-semibold text-brand-600 dark:text-brand-400" : ""}`}
            >
              {c}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
