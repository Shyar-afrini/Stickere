import { Image as ExpoImage, type ImageProps } from "expo-image";

export function Image({
  transition = 150,
  contentFit = "contain",
  ...props
}: ImageProps) {
  return (
    <ExpoImage transition={transition} contentFit={contentFit} {...props} />
  );
}
