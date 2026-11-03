import type { Metadata } from "next";
import { Barlow, Newsreader } from "next/font/google";
import "./globals.css";

// Barlow is DIN-based: the closest free match to the PF Handbook / DIN titles of the 2011 site
const din = Barlow({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-din" });
const serif = Newsreader({ subsets: ["latin"], style: ["normal", "italic"], variable: "--serif" });

export const metadata: Metadata = {
  title: { default: "Revista Cliche", template: "%s — Revista Cliche" },
  description: "Arquivo da Revista Cliche, revista colaborativa sobre design (2010–2015).",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${din.variable} ${serif.variable}`}>
      <head>
        {/* Privacy-friendly analytics by Plausible */}
        <script async src="https://plausible.io/js/pa-Bdcd3RERtUZ2LeEUMlA_G.js" />
        <script
          dangerouslySetInnerHTML={{
            __html:
              "window.plausible=window.plausible||function(){(plausible.q=plausible.q||[]).push(arguments)},plausible.init=plausible.init||function(i){plausible.o=i||{}};plausible.init()",
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
