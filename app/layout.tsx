import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Starlete — Fund Filipino athletes",
  description:
    "Every champion has a story. Discover and support Filipino athletes on their journey.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
