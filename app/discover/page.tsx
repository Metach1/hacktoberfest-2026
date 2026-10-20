import { Suspense } from "react";
import { DiscoverScreen } from "@/src/app/screens/discover";

export default function DiscoverPage() {
  // DiscoverScreen reads the `region` search param via useSearchParams, which
  // must be wrapped in a Suspense boundary for prerendering.
  return (
    <Suspense>
      <DiscoverScreen />
    </Suspense>
  );
}
