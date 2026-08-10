import { useEffect, useRef, useState } from "react";
import { getReactorHistory } from "../services/api";

// Shared history-fetch + live-append hook.
//   reactorId    : reactor to load history for
//   format       : optional (d, i) => point mapper (e.g. timestamp -> time)
//   liveReactor  : when set, append a live reading on every change
//   maxPoints    : cap history length (used with liveReactor)
function useReactorHistory(reactorId, { format, liveReactor, maxPoints } = {}) {
  const [history, setHistory] = useState([]);
  // format is a pure mapper — keep the latest one in a ref so its identity
  // doesn't trigger the fetch effect on every parent render (callers often
  // pass an inline arrow). The fetch should only fire when the reactorId changes.
  const formatRef = useRef(format);
  formatRef.current = format;

  useEffect(() => {
    let cancelled = false;
    const fetchHistory = async () => {
      try {
        const data = await getReactorHistory(reactorId);
        if (cancelled) return;
        const reversed = data.reverse();
        const fmt = formatRef.current;
        setHistory(fmt ? reversed.map((d, i) => fmt(d, i)) : reversed);
      } catch (err) {
        // history not yet available — stream data will populate it
      }
    };
    fetchHistory();
    return () => {
      cancelled = true;
    };
  }, [reactorId]);

  useEffect(() => {
    if (liveReactor) {
      setHistory((prev) => {
        const updated = [
          ...prev,
          { ...liveReactor, time: new Date().toLocaleTimeString() },
        ];
        return maxPoints ? updated.slice(-maxPoints) : updated;
      });
    }
  }, [liveReactor, maxPoints]);

  return { history };
}

export default useReactorHistory;
