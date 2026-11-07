import { Redirect, useRouter, type Href } from "expo-router";
import { useEffect, useState } from "react";

import { takeResumeRoute } from "@/lib/settings";

// Every route group under (pages) has its own index, so "/" is ambiguous.
// Pointing at the group explicitly makes Packs the starting page.
export default function Index() {
  const router = useRouter();
  // Back from an app the user was sent to: open the page they left, on top of Packs.
  const [resume] = useState(takeResumeRoute);

  useEffect(() => {
    if (!resume) return;
    const timer = setTimeout(() => router.push(resume as Href), 0);
    return () => clearTimeout(timer);
  }, [resume, router]);

  return <Redirect href="/(pages)/(packs)" />;
}
