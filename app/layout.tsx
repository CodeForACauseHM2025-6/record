import { UnifrakturMaguntia, Cormorant_Garamond, Crimson_Pro } from "next/font/google";
import "./globals.css";

const mastheadFont = UnifrakturMaguntia({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-unifraktur",
  display: "swap",
});

const headlineFont = Cormorant_Garamond({
  weight: ["400", "600", "700"],
  subsets: ["latin"],
  variable: "--font-cormorant",
  display: "swap",
});

const bodyFont = Crimson_Pro({
  weight: ["400", "600"],
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--font-crimson",
  display: "swap",
});

export const metadata = {
  title: "The Record — Horace Mann School",
  description: "Horace Mann's Weekly Newspaper Since 1903",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${mastheadFont.variable} ${headlineFont.variable} ${bodyFont.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
