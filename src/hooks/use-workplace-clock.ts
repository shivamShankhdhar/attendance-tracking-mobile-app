import { useEffect, useState } from 'react';

// Refresh date-dependent views at minute boundaries, including across midnight.
export function useWorkplaceClock() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    // Check every 10 minutes to handle date/midnight transitions without constant re-renders
    const timer = setInterval(() => setNow(Date.now()), 10 * 60 * 1000);
    return () => clearInterval(timer);
  }, []);
  return now;
}
