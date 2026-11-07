import { useState } from "react";

import { RewindStory } from "@/components/rewind-story";
import { computeRewind } from "@/lib/rewind";

/** The year's Rewind, shown full screen above the tab bar (its presentation is set in the root layout). */
export default function RewindScreen() {
  const [rewind] = useState(() => computeRewind(new Date().getFullYear()));

  return <RewindStory rewind={rewind} />;
}
