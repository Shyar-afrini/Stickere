import { useState } from "react";
import { Spacing } from "@/constants/theme";
import { useHeaderInset } from "@/hooks/use-header-inset";
import { useTabBarInset } from "@/hooks/use-tab-bar-inset";
import {
  ImagePlus,
  Images,
  Map as MapIcon,
  TriangleAlert,
} from "lucide-react-native";
import { Stack, useRouter } from "expo-router";

import {
  EmptyState,
  HScroll,
  HeaderButton,
  Image,
  Pressable,
  Screen,
  ScrollView,
  Spinner,
  Text,
  VStack,
  showToast,
} from "@/components/ui";
import { dismissAsset } from "@/db/mutations";
import { usePhotoSuggestions } from "@/hooks/use-photo-suggestions";
import {
  editLimitedAccess,
  toLocalFile,
  type SuggestedTrip,
  type TripPhoto,
} from "@/lib/photo-library";
import { openAppSettings } from "@/lib/platform";

const THUMB = 132;

const dateFormat = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
});

function formatRange(trip: SuggestedTrip) {
  const newest = dateFormat.format(trip.newest);
  const oldest = dateFormat.format(trip.oldest);
  return newest === oldest ? newest : `${oldest} – ${newest}`;
}

export default function Suggestions() {
  const tabInset = useTabBarInset();
  const headerInset = useHeaderInset();
  const router = useRouter();
  const [choosing, setChoosing] = useState(false);
  const { access, trips, isLoading, error, reload, removePhoto } =
    usePhotoSuggestions();

  const makeSticker = async (trip: SuggestedTrip, photo: TripPhoto) => {
    try {
      const uri = await toLocalFile(photo.uri, photo.name);
      router.push({
        pathname: "/(pages)/(packs)/new-sticker",
        params: {
          uri,
          width: photo.width,
          height: photo.height,
          mimeType: "image/jpeg",
          name: trip.location.locality ?? trip.location.placeName ?? "Sticker",
          assetId: photo.id,
          latitude: trip.location.latitude,
          longitude: trip.location.longitude,
          radiusMeters: trip.location.radiusMeters,
          placeName: trip.location.placeName ?? "",
          locality: trip.location.locality ?? "",
          country: trip.location.country ?? "",
        },
      });
    } catch {
      showToast(
        "Couldn’t Open Photo",
        "The photo may still be in iCloud. Try again in a moment.",
      );
    }
  };

  // Hidden straight away (no question): a toast says so.
  const dismiss = (photo: TripPhoto) => {
    dismissAsset(photo.id);
    removePhoto(photo.id);
    showToast("Photo hidden", "It won’t be suggested again.");
  };

  let content;
  if (access === "denied") {
    content = (
      <EmptyState
        icon={Images}
        title="Photo Access Needed"
        description="Allow access to your photos so Stickerê can suggest stickers from your trips."
        action={{
          label: "Open Settings",
          onPress: () => openAppSettings(),
        }}
      />
    );
  } else if (isLoading && trips.length === 0) {
    content = (
      <VStack flex={1} center>
        <Spinner size="large" />
      </VStack>
    );
  } else if (error) {
    content = (
      <EmptyState
        icon={TriangleAlert}
        title="Couldn’t Load Photos"
        description={error}
        action={{ label: "Try Again", onPress: () => reload() }}
      />
    );
  } else if (trips.length === 0) {
    content = (
      <EmptyState
        icon={MapIcon}
        title="No Trips Yet"
        description="Photos with a location from your recent trips will show up here."
      />
    );
  } else {
    content = (
      <ScrollView
        gap="xl"
        py="lg"
        contentContainerStyle={{
          paddingTop: headerInset + Spacing.sm,
          paddingBottom: tabInset,
        }}
      >
        {trips.map((trip) => (
          <VStack key={trip.key} gap="sm" align="stretch">
            <VStack style={{ paddingHorizontal: 20 }}>
              <Text variant="title3" weight="bold">
                {trip.label}
              </Text>
              <Text variant="footnote" color="secondaryLabel">
                {formatRange(trip)} ·{" "}
                {trip.photos.length === 1
                  ? "1 photo"
                  : `${trip.photos.length} photos`}
              </Text>
            </VStack>
            <HScroll>
              {trip.photos.map((photo) => (
                <Pressable
                  key={photo.id}
                  feedback="scale"
                  accessibilityRole="button"
                  accessibilityLabel={`Make a sticker from this photo taken in ${trip.label}`}
                  onPress={() => makeSticker(trip, photo)}
                  onLongPress={() => dismiss(photo)}
                >
                  <Image
                    source={{ uri: photo.uri }}
                    contentFit="cover"
                    style={{
                      width: THUMB,
                      height: THUMB,
                      borderRadius: 16,
                      borderCurve: "continuous",
                    }}
                  />
                </Pressable>
              ))}
            </HScroll>
          </VStack>
        ))}
      </ScrollView>
    );
  }

  return (
    <Screen>
      <Stack.Screen
        options={{
          title: "Ideas",
          headerRight:
            access === "limited"
              ? () => (
                  <HeaderButton
                    icon={ImagePlus}
                    accessibilityLabel="Choose more photos"
                    loading={choosing}
                    onPress={async () => {
                      if (choosing) return;
                      setChoosing(true);
                      try {
                        await editLimitedAccess();
                      } finally {
                        setChoosing(false);
                      }
                      reload();
                    }}
                  />
                )
              : undefined,
        }}
      />
      {content}
    </Screen>
  );
}
