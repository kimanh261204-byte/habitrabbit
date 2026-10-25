import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "HabitRabbit — Học từ vựng tiếng Anh thông minh",
    template: "%s | HabitRabbit",
  },
  description:
    "HabitRabbit - Nền tảng rèn luyện thói quen và học từ vựng tiếng Anh cá nhân hóa bằng AI & Spaced Repetition.",
  keywords: ["HabitRabbit", "học tiếng Anh", "thói quen học tập", "từ vựng", "flashcard", "spaced repetition", "AI"],
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon.png", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
  },
  openGraph: {
    title: "HabitRabbit",
    description: "Học từ vựng tiếng Anh cá nhân hóa bằng AI cùng HabitRabbit",
    type: "website",
    images: ["/logo.png"],
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
