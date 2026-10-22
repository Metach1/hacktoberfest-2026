import type { Metadata } from "next";
import "./globals.css";
import { SessionProvider } from "@/src/app/shared/session-provider";
import { AppChrome } from "@/src/app/shared/chrome";

export const metadata: Metadata = {
  title: "Startlete — Fund Filipino athletes",
  description:
    "Every champion has a story. Discover and support Filipino athletes on their journey.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>
        <SessionProvider>
          <AppChrome>{children}</AppChrome>
        </SessionProvider>
      </body>
    </html>
  );
}
