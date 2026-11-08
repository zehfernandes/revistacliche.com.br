import type { Metadata } from "next";
import { Barlow, Newsreader } from "next/font/google";
import { JsonLd } from "@/lib/seo";
import "./globals.css";

// Barlow is DIN-based: the closest free match to the PF Handbook / DIN titles of the 2011 site
const din = Barlow({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-din" });
const serif = Newsreader({ subsets: ["latin"], style: ["normal", "italic"], variable: "--serif" });

export const metadata: Metadata = {
  metadataBase: new URL("https://revistacliche.com.br"),
  title: { default: "Revista Cliche", template: "%s — Revista Cliche" },
  description: "Arquivo da Revista Cliche, revista colaborativa sobre design (2010–2015).",
  // defaults for pages without their own seo(): no canonical here, or every page would point at "/"
  openGraph: { siteName: "Revista Cliche", locale: "pt_BR", type: "website", images: "/brand/logo-cliche.png" },
};

const site = {
  "@context": "https://schema.org",
  "@type": "Periodical",
  name: "Revista Cliche",
  url: "https://revistacliche.com.br/",
  inLanguage: "pt-BR",
  about: "Design",
  startDate: "2010",
  endDate: "2015",
  publisher: { "@type": "Organization", name: "Projeto Cliche", logo: "https://revistacliche.com.br/brand/logo-cliche.png" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${din.variable} ${serif.variable}`}>
      <head>
        <link rel="alternate" type="application/rss+xml" title="Revista Cliche — artigos" href="/feed/" />
        <link rel="alternate" type="application/rss+xml" title="ClicheCast" href="/feed/podcast/" />
        <link rel="alternate" type="text/markdown" title="Índice para LLMs" href="/llms.txt" />
        <JsonLd data={site} />
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
