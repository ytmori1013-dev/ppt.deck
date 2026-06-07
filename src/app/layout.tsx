import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Consult Deck AI",
  description:
    "自然言語からコンサル品質のストーリー・スライド・PowerPointを生成するAI",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
