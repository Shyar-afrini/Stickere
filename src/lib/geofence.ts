import * as Location from "expo-location";
import * as Notifications from "expo-notifications";
import * as TaskManager from "expo-task-manager";
import Storage from "expo-sqlite/kv-store";
import { and, between, isNotNull } from "drizzle-orm";

import { db } from "@/db";
import { inOpenPack } from "@/db/filters";
import { stickers } from "@/db/schema";
import { boundingBox, distanceMeters } from "@/lib/geo";
import { shortPlace } from "@/lib/location";
import { getArrivalReminders, setArrivalReminders } from "@/lib/settings";

const GEOFENCE_TASK = "stickere-arrival-reminders";

// iOS can monitor at most 20 regions at once.
const MAX_REGIONS = 20;
const MIN_REGION_METERS = 100;
const MAX_REGION_METERS = 1000;

// iOS reports "entered" for every region you are already inside whenever the regions are registered, so
// a place only notifies once per cooldown, and regions are only registered again when they changed.
const COOLDOWN_MS = 6 * 60 * 60 * 1000;
const NOTIFIED_KEY = "geofenceNotified";
const REGIONS_KEY = "geofenceRegions";

function readNotified(): Record<string, number> {
  try {
    return JSON.parse(Storage.getItemSync(NOTIFIED_KEY) ?? "{}");
  } catch {
    return {};
  }
}

const writeNotified = (notified: Record<string, number>) =>
  Storage.setItemSync(NOTIFIED_KEY, JSON.stringify(notified));

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

// Background tasks have to be defined at the top level of a module that is
// imported when the app starts (see `src/app/_layout.tsx`).
TaskManager.defineTask<{
  eventType: Location.GeofencingEventType;
  region: Location.LocationRegion;
}>(GEOFENCE_TASK, async ({ data, error }) => {
  if (error || !data || data.eventType !== Location.GeofencingEventType.Enter)
    return;

  const { latitude, longitude, radius, identifier } = data.region;
  const notified = readNotified();
  const key = identifier ?? `${latitude},${longitude}`;
  if (Date.now() - (notified[key] ?? 0) < COOLDOWN_MS) return;
  const box = boundingBox({ latitude, longitude }, radius);
  const here = db
    .select()
    .from(stickers)
    .where(
      and(
        inOpenPack(),
        isNotNull(stickers.latitude),
        isNotNull(stickers.longitude),
        between(stickers.latitude, box.minLat, box.maxLat),
        between(stickers.longitude, box.minLon, box.maxLon),
      ),
    )
    .all();
  if (here.length === 0) return;

  writeNotified({ ...notified, [key]: Date.now() });
  const place =
    shortPlace(here[0].locality, here[0].placeName) ?? "a place you saved";
  await Notifications.scheduleNotificationAsync({
    content: {
      title: `You’re near ${place}`,
      body:
        here.length === 1
          ? "1 sticker from here."
          : `${here.length} stickers from here.`,
    },
    trigger: null,
  });
});

type Region = Location.LocationRegion;

/** Groups tagged stickers into places and keeps the nearest ones as regions. */
async function buildRegions(): Promise<Region[]> {
  const tagged = db
    .select()
    .from(stickers)
    .where(
      and(
        inOpenPack(),
        isNotNull(stickers.latitude),
        isNotNull(stickers.longitude),
      ),
    )
    .all();

  const places = new Map<string, Region>();
  for (const sticker of tagged) {
    // Roughly 100 m cells, so stickers from one spot share a region.
    const key = `${sticker.latitude!.toFixed(3)},${sticker.longitude!.toFixed(3)}`;
    const radius = Math.min(
      Math.max(sticker.radiusMeters ?? 0, MIN_REGION_METERS),
      MAX_REGION_METERS,
    );
    const existing = places.get(key);
    if (!existing || existing.radius < radius) {
      places.set(key, {
        identifier: key,
        latitude: sticker.latitude!,
        longitude: sticker.longitude!,
        radius,
        notifyOnEnter: true,
        notifyOnExit: false,
      });
    }
  }

  const regions = [...places.values()];
  if (regions.length <= MAX_REGIONS) return regions;

  const position = await Location.getLastKnownPositionAsync();
  if (!position) return regions.slice(0, MAX_REGIONS);
  return regions
    .sort(
      (a, b) =>
        distanceMeters(position.coords, a) - distanceMeters(position.coords, b),
    )
    .slice(0, MAX_REGIONS);
}

/** Re-registers the monitored places. Safe to call often; does nothing when reminders are off. */
export async function syncGeofences() {
  try {
    const started = await Location.hasStartedGeofencingAsync(GEOFENCE_TASK);

    if (!getArrivalReminders()) {
      if (started) await Location.stopGeofencingAsync(GEOFENCE_TASK);
      return;
    }

    const regions = await buildRegions();
    if (regions.length === 0) {
      if (started) await Location.stopGeofencingAsync(GEOFENCE_TASK);
      return;
    }

    // Nothing moved: leave the monitoring alone, so iOS doesn't report every place you are in again.
    const signature = JSON.stringify(
      regions.map((region) => [region.identifier, region.radius]).sort(),
    );
    if (started && Storage.getItemSync(REGIONS_KEY) === signature) return;

    // A place you are standing in right now is not news: start its cooldown.
    const position = await Location.getLastKnownPositionAsync();
    if (position) {
      const notified = readNotified();
      for (const region of regions) {
        if (distanceMeters(position.coords, region) <= region.radius) {
          notified[region.identifier!] ??= Date.now();
        }
      }
      writeNotified(notified);
    }

    await Location.startGeofencingAsync(GEOFENCE_TASK, regions);
    Storage.setItemSync(REGIONS_KEY, signature);
  } catch {
    // Missing permissions or an unsupported device: reminders simply stay off.
  }
}

export type ReminderResult =
  "enabled" | "location-denied" | "notifications-denied";

/** Turns reminders on, asking for the permissions they need in order. */
export async function enableArrivalReminders(): Promise<ReminderResult> {
  const foreground = await Location.requestForegroundPermissionsAsync();
  if (!foreground.granted) return "location-denied";

  const background = await Location.requestBackgroundPermissionsAsync();
  if (!background.granted) return "location-denied";

  const notifications = await Notifications.requestPermissionsAsync();
  if (!notifications.granted) return "notifications-denied";

  setArrivalReminders(true);
  await syncGeofences();
  return "enabled";
}

export async function disableArrivalReminders() {
  setArrivalReminders(false);
  await syncGeofences();
}
