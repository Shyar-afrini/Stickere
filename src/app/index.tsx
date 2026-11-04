import { Redirect } from "expo-router";

// Every route group under (pages) has its own index, so "/" is ambiguous.
// Pointing at the group explicitly makes Packs the starting page.
export default function Index() {
  return <Redirect href="/(pages)/(packs)" />;
}
