import { useEffect, useState } from "react";
import api from "../api";

let cachedMeta = null;
let inFlight = null;

/** Ambil daftar kategori event & kota Indonesia dari backend (di-cache di memori). */
export function useMeta() {
  const [meta, setMeta] = useState(cachedMeta);

  useEffect(() => {
    if (cachedMeta) return;
    if (!inFlight) {
      inFlight = api.get("/events/meta").then((res) => {
        cachedMeta = res.data;
        return cachedMeta;
      }).catch(() => {
        cachedMeta = { categories: [], cities: [] };
        return cachedMeta;
      });
    }
    inFlight.then(setMeta);
  }, []);

  return meta || { categories: [], cities: [] };
}
