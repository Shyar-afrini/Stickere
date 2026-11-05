import { and, isNotNull } from "drizzle-orm";
import { useLiveQuery } from "drizzle-orm/expo-sqlite";
import { Stack, useRouter } from "expo-router";
import { MapPin } from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import { BlurView } from "expo-blur";
import { StyleSheet, View } from "react-native";
import MapView, { Marker } from "react-native-maps";

import { StampMark } from "@/components/stamp";
import { Box, EmptyState, HScroll, Icon, Image, Pressable, Screen, Text } from "@/components/ui";
import { Shadows } from "@/constants/theme";
import { db } from "@/db";
import { inOpenPack } from "@/db/filters";
import { stickers, type Sticker } from "@/db/schema";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { TAB_BAR_SIDE_MARGIN, useTabBarInset } from "@/hooks/use-tab-bar-inset";
import { useTheme } from "@/hooks/use-theme";
import { getStickerUri } from "@/lib/sticker-storage";

type Spot = { key: string; latitude: number; longitude: number; stickers: Sticker[] };

const SHOWN = 3;
const WIDTHS = [66, 54, 48];
const PLACEMENT = [
  { x: 0, y: 0, rotate: "-4deg" },
  { x: 42, y: 22, rotate: "6deg" },
  { x: -8, y: 50, rotate: "-8deg" },
];

/** Stickers made from photos taken in the same ~100 m share one spot. */
function groupIntoSpots(list: Sticker[]): Spot[] {
  const spots = new Map<string, Spot>();
  for (const sticker of list) {
    const key = `${sticker.latitude!.toFixed(3)},${sticker.longitude!.toFixed(3)}`;
    const spot = spots.get(key);
    if (spot) spot.stickers.push(sticker);
    else
      spots.set(key, {
        key,
        latitude: sticker.latitude!,
        longitude: sticker.longitude!,
        stickers: [sticker],
      });
  }
  return [...spots.values()];
}

function SpotMarker({ spot }: { spot: Spot }) {
  const shown = spot.stickers.slice(0, SHOWN);
  const extra = spot.stickers.length - SHOWN;

  return (
    <View style={{ width: 120, height: 130 }}>
      {shown.map((sticker, index) => (
        <View
          key={sticker.id}
          style={{
            position: "absolute",
            left: PLACEMENT[index].x,
            top: PLACEMENT[index].y,
            transform: [{ rotate: PLACEMENT[index].rotate }],
            shadowColor: "#000",
            shadowOpacity: 0.25,
            shadowRadius: 3,
            shadowOffset: { width: 0, height: 2 },
          }}
        >
          <StampMark sticker={sticker} width={WIDTHS[index]} />
        </View>
      ))}
      {extra > 0 && (
        <Box
          center
          bg="systemBlue"
          radius="full"
          style={{ position: "absolute", right: 0, bottom: 0, minWidth: 26, height: 26, paddingHorizontal: 6 }}
        >
          <Text variant="caption1" weight="bold" color="onTint">
            +{extra}
          </Text>
        </Box>
      )}
    </View>
  );
}

/** Map of where each sticker's photo was taken. */
export default function StickerMap() {
  const router = useRouter();
  const tabInset = useTabBarInset();
  const theme = useTheme();
  const scheme = useColorScheme();
  const { data } = useLiveQuery(
    db
      .select()
      .from(stickers)
      .where(and(inOpenPack(), isNotNull(stickers.latitude), isNotNull(stickers.longitude))),
  );
  const spots = useMemo(() => groupIntoSpots(data), [data]);
  const [selectedKey, setSelectedKey] = useState<string>();
  const selected = spots.find((spot) => spot.key === selectedKey);

  // Custom markers are drawn once, then frozen: redrawing them every frame is slow on Android.
  const signature = spots.map((spot) => `${spot.key}:${spot.stickers.map((s) => s.id)}`).join("|");
  const [settled, setSettled] = useState("");
  const tracking = settled !== signature;
  useEffect(() => {
    const timer = setTimeout(() => setSettled(signature), 1500);
    return () => clearTimeout(timer);
  }, [signature]);

  const region = useMemo(() => {
    if (spots.length === 0) return undefined;
    const lats = spots.map((spot) => spot.latitude);
    const lons = spots.map((spot) => spot.longitude);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLon = Math.min(...lons);
    const maxLon = Math.max(...lons);
    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLon + maxLon) / 2,
      latitudeDelta: Math.max((maxLat - minLat) * 1.6, 0.01),
      longitudeDelta: Math.max((maxLon - minLon) * 1.6, 0.01),
    };
  }, [spots]);

  if (!region) {
    return (
      <Screen bg="systemGroupedBackground">
        <Stack.Screen options={{ title: "Map" }} />
        <EmptyState
          icon={MapPin}
          title="No Places Yet"
          description="Stickers made from photos with a location show up here."
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: "Map" }} />
      <MapView
        style={{ flex: 1 }}
        initialRegion={region}
        onPress={() => setSelectedKey(undefined)}
        showsPointsOfInterests={false}
      >
        {spots.map((spot) => (
          <Marker
            key={spot.key}
            coordinate={spot}
            anchor={{ x: 0.3, y: 0.3 }}
            tracksViewChanges={tracking}
            onPress={(event) => {
              event.stopPropagation();
              setSelectedKey(spot.key);
            }}
          >
            <SpotMarker spot={spot} />
          </Marker>
        ))}
      </MapView>

      {selected && (
        // Same frosted glass as the tab bar, so the stickers sit in a card instead of floating on the map.
        <View
          style={[
            {
              position: "absolute",
              left: TAB_BAR_SIDE_MARGIN,
              right: TAB_BAR_SIDE_MARGIN,
              bottom: tabInset + 8,
              borderRadius: 28,
            },
            Shadows.floating,
          ]}
        >
          <BlurView
            intensity={60}
            tint={scheme === "dark" ? "systemThickMaterialDark" : "systemThickMaterialLight"}
            style={{
              borderRadius: 28,
              overflow: "hidden",
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: theme.separator,
              paddingVertical: 14,
              gap: 10,
            }}
          >
            <Box row align="center" gap="sm" style={{ paddingHorizontal: 18 }}>
              <Icon icon={MapPin} size={16} color="secondaryLabel" />
              <Text variant="subheadline" weight="semibold" style={{ flex: 1 }} numberOfLines={1}>
                {selected.stickers[0].placeName ?? selected.stickers[0].locality ?? "Saved place"}
              </Text>
              <Text variant="footnote" color="secondaryLabel">
                {selected.stickers.length} {selected.stickers.length === 1 ? "sticker" : "stickers"}
              </Text>
            </Box>
            <HScroll>
              {selected.stickers.map((sticker) => (
                <Pressable
                  key={sticker.id}
                  feedback="scale"
                  accessibilityLabel={sticker.name}
                  onPress={() =>
                    router.push({
                      pathname: "/(pages)/(packs)/sticker",
                      params: { stickerId: sticker.id },
                    })
                  }
                >
                  <Image
                    source={{ uri: getStickerUri(sticker.path) }}
                    contentFit="contain"
                    style={{ width: 84, height: 84 }}
                  />
                </Pressable>
              ))}
            </HScroll>
          </BlurView>
        </View>
      )}
    </Screen>
  );
}
