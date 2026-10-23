import { Suspense } from "react";
import { AuthScreen } from "@/src/app/screens/auth";

export default function RegisterPage() {
  return (
    <Suspense>
      <AuthScreen mode="register" />
    </Suspense>
  );
}
