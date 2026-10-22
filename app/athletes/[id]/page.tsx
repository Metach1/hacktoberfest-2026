import { Suspense } from "react";
import { notFound } from "next/navigation";
import { AthleteProfileScreen } from "@/src/app/screens/athlete-profile";
import { athletes } from "@/src/app/data/athletes";

// Prerender a static page for each fictional athlete in the seed.
export function generateStaticParams() {
  return athletes.map((a) => ({ id: String(a.id) }));
}

export default async function AthletePage({ params }: PageProps<"/athletes/[id]">) {
  const { id } = await params;
  const numericId = Number.parseInt(id, 10);
  if (!Number.isInteger(numericId) || numericId <= 0) {
    notFound();
  }
  // AthleteProfileScreen reads the `from` search param via useSearchParams,
  // which must sit inside a Suspense boundary for prerendering.
  return (
    <Suspense>
      <AthleteProfileScreen id={numericId} />
    </Suspense>
  );
}
