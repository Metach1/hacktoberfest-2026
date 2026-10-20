import type { Metadata } from "next";
import "./globals.css";
import { StarleteProvider } from "@/src/app/store";
import { AppChrome } from "@/src/app/shared/chrome";

export const metadata: Metadata = {
  title: "Starlete — Fund Filipino athletes",
  description:
    "Every champion has a story. Discover and support Filipino athletes on their journey.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>
        <StarleteProvider>
          <AppChrome>{children}</AppChrome>
        </StarleteProvider>
      </body>
    </html>
  );
}
