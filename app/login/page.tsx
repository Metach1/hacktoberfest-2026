import { Suspense } from "react";
import { AuthScreen } from "@/src/app/screens/auth";

export default function LoginPage() {
  return (
    <Suspense>
      <AuthScreen mode="login" />
    </Suspense>
  );
}
