import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "VocaFlow — Học từ vựng tiếng Anh thông minh",
    template: "%s | VocaFlow",
  },
  description:
    "Nền tảng học từ vựng tiếng Anh cá nhân hóa bằng AI. Import file của bạn, học flashcard, luyện tập và ôn tập thông minh.",
  keywords: ["học tiếng Anh", "từ vựng", "flashcard", "spaced repetition", "AI"],
  openGraph: {
    title: "VocaFlow",
    description: "Học từ vựng tiếng Anh cá nhân hóa bằng AI",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
