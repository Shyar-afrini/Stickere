const EARTH_RADIUS_METERS = 6_371_000;

type Coordinate = { latitude: number; longitude: number };

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

/** Great-circle distance in meters (haversine). */
export function distanceMeters(a: Coordinate, b: Coordinate) {
  const dLat = toRadians(b.latitude - a.latitude);
  const dLon = toRadians(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(a.latitude)) * Math.cos(toRadians(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Latitude/longitude box that contains every point within `meters` of `center`. */
export function boundingBox(center: Coordinate, meters: number) {
  const dLat = (meters / EARTH_RADIUS_METERS) * (180 / Math.PI);
  const cosLat = Math.max(Math.cos(toRadians(center.latitude)), 0.01);
  const dLon = dLat / cosLat;
  return {
    minLat: center.latitude - dLat,
    maxLat: center.latitude + dLat,
    minLon: center.longitude - dLon,
    maxLon: center.longitude + dLon,
  };
}
