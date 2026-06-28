import { useState, useEffect } from 'react';

export function useCountdown(deadline: string | undefined) {
  const remaining = () => {
    if (!deadline) return null;
    const ms = new Date(deadline).getTime() - Date.now();
    return ms > 0 ? Math.ceil(ms / 1000) : 0;
  };
  const [seconds, setSeconds] = useState<number | null>(null);
  useEffect(() => {
    setSeconds(remaining());
    if (!deadline) return;
    const id = setInterval(() => {
      const rem = remaining();
      setSeconds(rem);
      if (rem === 0) clearInterval(id);
    }, 1000);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deadline]);
  return seconds;
}

export function parsePenaltyReason(reason?: string) {
  if (!reason) return null;
  const m = reason.match(/Regular time:\s*(\d+)[-–](\d+).*?Penalties:\s*(\d+)[-–](\d+)/i);
  if (!m) return null;
  return { rt1: Number(m[1]), rt2: Number(m[2]), pen1: Number(m[3]), pen2: Number(m[4]) };
}
