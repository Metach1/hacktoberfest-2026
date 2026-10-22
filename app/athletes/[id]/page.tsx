import { Suspense } from "react";
import { notFound } from "next/navigation";
import { AthleteProfileScreen } from "@/src/app/screens/athlete-profile";

export default function AthletePage({ params }: PageProps<"/athletes/[id]">) {
  return (
    <Suspense fallback={<main aria-busy="true">Loading athlete profile...</main>}>
      <AthletePageContent params={params} />
    </Suspense>
  );
}

async function AthletePageContent({
  params,
}: {
  params: PageProps<"/athletes/[id]">["params"];
}) {
  const { id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    notFound();
  }
  return <AthleteProfileScreen id={id} />;
}
