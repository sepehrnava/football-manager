import { useEffect, useState } from 'react';

import { visibleOffers } from '../game/market';
import { useCareer } from '../state/GameContext';

/**
 * Offers that have arrived, refreshed every second while some are still on their way
 * (bids for a player listed during a window arrive after a short delay).
 */
export function useOffers() {
  const { state } = useCareer();
  const timed = state.offers.some((o) => o.at);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!timed) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [timed]);
  const offers = visibleOffers(state, now);
  return { offers, pending: state.offers.filter((o) => !offers.includes(o)) };
}
