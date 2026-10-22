import { AthleteProfileScreen } from "@/src/app/screens/athlete-profile";
import { athletes } from "@/src/app/data/athletes";

// Prerender a static page for each fictional athlete in the seed.
export function generateStaticParams() {
  return athletes.map((a) => ({ id: String(a.id) }));
}

export default async function AthletePage({ params }: PageProps<"/athletes/[id]">) {
  const { id } = await params;
  return <AthleteProfileScreen id={id} />;
}
