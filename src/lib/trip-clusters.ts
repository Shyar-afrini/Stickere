import { distanceMeters } from "./geo";

export type LocatedPhoto = {
  id: string;
  /** Capture time in milliseconds. */
  time: number;
  latitude: number;
  longitude: number;
};

export type Trip<T extends LocatedPhoto> = {
  /** Newest photos first. */
  photos: T[];
  latitude: number;
  longitude: number;
  newest: number;
  oldest: number;
};

// Consecutive photos belong to the same trip when they were taken close
// together in space and time.
const MAX_DISTANCE_METERS = 1500;
const MAX_GAP_MS = 36 * 60 * 60 * 1000;
const MAX_PHOTOS_PER_TRIP = 12;

/**
 * Groups photos into trips. Photos are walked from newest to oldest, so trips
 * come back newest first, and so do the photos inside each trip.
 */
export function clusterPhotos<T extends LocatedPhoto>(photos: T[]): Trip<T>[] {
  const sorted = [...photos].sort((a, b) => b.time - a.time);
  const groups: T[][] = [];

  for (const photo of sorted) {
    const group = groups.find((candidate) => {
      const last = candidate[candidate.length - 1];
      return (
        last.time - photo.time <= MAX_GAP_MS &&
        distanceMeters(last, photo) <= MAX_DISTANCE_METERS
      );
    });
    if (group) group.push(photo);
    else groups.push([photo]);
  }

  return groups
    .map((group) => ({
      photos: group.slice(0, MAX_PHOTOS_PER_TRIP),
      latitude: group.reduce((sum, p) => sum + p.latitude, 0) / group.length,
      longitude: group.reduce((sum, p) => sum + p.longitude, 0) / group.length,
      newest: group[0].time,
      oldest: group[group.length - 1].time,
    }))
    .sort((a, b) => b.newest - a.newest);
}
