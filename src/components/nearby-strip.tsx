import { Link } from "expo-router";

import { HScroll, Image, Pressable, Text, VStack } from "@/components/ui";
import type { NearbySticker } from "@/lib/nearby";
import { getStickerUri } from "@/lib/sticker-storage";

const SIZE = 84;

/** Stickers tagged where the user is right now. */
export function NearbyStrip({ stickers }: { stickers: NearbySticker[] }) {
  if (stickers.length === 0) return null;

  const place = stickers[0].locality ?? stickers[0].placeName;

  return (
    <VStack
      gap="sm"
      align="stretch"
      style={{ marginHorizontal: -16, marginBottom: 20 }}
    >
      <VStack style={{ paddingHorizontal: 20 }}>
        <Text variant="title3" weight="bold">
          Nearby
        </Text>
        <Text variant="footnote" color="secondaryLabel">
          {place ? `Stickers from ${place}` : "Stickers from around here"}
        </Text>
      </VStack>
      <HScroll>
        {stickers.map((sticker) => {
          const image = (
            <Pressable
              feedback="scale"
              accessibilityRole="button"
              accessibilityLabel={sticker.name}
            >
              <Image
                source={{ uri: getStickerUri(sticker.path) }}
                style={{ width: SIZE, height: SIZE }}
              />
            </Pressable>
          );
          return sticker.packId === null ? (
            image
          ) : (
            <Link
              key={sticker.id}
              href={{
                pathname: "/(pages)/(packs)/[id]",
                params: { id: sticker.packId },
              }}
              asChild
            >
              {image}
            </Link>
          );
        })}
      </HScroll>
    </VStack>
  );
}
