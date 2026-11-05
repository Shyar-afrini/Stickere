import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";

import { findNearbyStickers, type NearbySticker } from "@/lib/nearby";

/** Stickers tagged near the user's current position; refreshed when the screen is focused. */
export function useNearbyStickers() {
  const [nearby, setNearby] = useState<NearbySticker[]>([]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      findNearbyStickers()
        .then((result) => active && setNearby(result))
        .catch(() => active && setNearby([]));
      return () => {
        active = false;
      };
    }, []),
  );

  return nearby;
}
