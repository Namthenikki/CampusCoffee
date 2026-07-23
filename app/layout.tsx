import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Instrument_Sans, Space_Mono } from "next/font/google";
import "./globals.css";

const bricolage = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-bricolage" });
const instrument = Instrument_Sans({ subsets: ["latin"], variable: "--font-instrument" });
const smono = Space_Mono({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-smono" });

export const metadata: Metadata = {
  title: "Campus Coffee",
  description: "Your campus, one token at a time. Mess partners, study partners, blind coffee. No swiping. Ever.",
};

export const viewport: Viewport = {
  // The app commits to the dark roast — one world, both OS themes.
  themeColor: "#1a1310",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${bricolage.variable} ${instrument.variable} ${smono.variable}`}>
      <body className="min-h-dvh antialiased">
        <div className="mx-auto min-h-dvh w-full max-w-[430px]">{children}</div>
      </body>
    </html>
  );
}
