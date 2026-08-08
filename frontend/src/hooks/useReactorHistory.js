import { useEffect, useState } from "react";
import { getReactorHistory } from "../services/api";

// Shared history-fetch + live-append hook.
//   reactorId    : reactor to load history for
//   format       : optional (d, i) => point mapper (e.g. timestamp -> time)
//   liveReactor  : when set, append a live reading on every change
//   maxPoints    : cap history length (used with liveReactor)
function useReactorHistory(reactorId, { format, liveReactor, maxPoints } = {}) {
  const [history, setHistory] = useState([]);

  useEffect(() => {
    let cancelled = false;
    const fetchHistory = async () => {
      try {
        const data = await getReactorHistory(reactorId);
        if (cancelled) return;
        const reversed = data.reverse();
        setHistory(format ? reversed.map((d, i) => format(d, i)) : reversed);
      } catch (err) {
        // history not yet available — stream data will populate it
      }
    };
    fetchHistory();
    return () => {
      cancelled = true;
    };
  }, [reactorId, format]);

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
