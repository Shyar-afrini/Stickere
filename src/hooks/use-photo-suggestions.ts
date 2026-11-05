import { useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";

import { db } from "@/db";
import { suggestionAssets } from "@/db/schema";
import {
  getPhotoAccess,
  loadTripSuggestions,
  type PhotoAccess,
  type SuggestedTrip,
} from "@/lib/photo-library";

type State = {
  access: PhotoAccess | null;
  trips: SuggestedTrip[];
  isLoading: boolean;
  error: string | null;
};

/** Trip-based sticker ideas from the photo library, newest first. */
export function usePhotoSuggestions() {
  const [state, setState] = useState<State>({
    access: null,
    trips: [],
    isLoading: true,
    error: null,
  });
  const requested = useRef(false);

  const load = useCallback(async (askForAccess = false) => {
    setState((current) => ({ ...current, isLoading: true, error: null }));
    try {
      const access = await getPhotoAccess(askForAccess);
      if (access === "denied") {
        setState({ access, trips: [], isLoading: false, error: null });
        return;
      }
      const excluded = new Set(
        db
          .select({ assetId: suggestionAssets.assetId })
          .from(suggestionAssets)
          .all()
          .map((row) => row.assetId),
      );
      const trips = await loadTripSuggestions(excluded);
      setState({ access, trips, isLoading: false, error: null });
    } catch (error) {
      setState((current) => ({
        ...current,
        isLoading: false,
        error: error instanceof Error ? error.message : "Something went wrong.",
      }));
    }
  }, []);

  // Reload whenever the screen is shown again, e.g. after making a sticker.
  useFocusEffect(
    useCallback(() => {
      void load(!requested.current);
      requested.current = true;
    }, [load]),
  );

  const removePhoto = useCallback((assetId: string) => {
    setState((current) => ({
      ...current,
      trips: current.trips
        .map((trip) => ({
          ...trip,
          photos: trip.photos.filter((photo) => photo.id !== assetId),
        }))
        .filter((trip) => trip.photos.length > 0),
    }));
  }, []);

  return { ...state, reload: load, removePhoto };
}
