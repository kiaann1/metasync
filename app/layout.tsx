import type { Metadata } from "next";
// import { Inter } from "next/font/google";
import "./globals.css";
import SessionWrapper from "./components/SessionWrapper";

// const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "MetaSync CMS",
  description: "A GitHub-powered content management system",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-sans">{/*{inter.className}*/}
        <SessionWrapper>{children}</SessionWrapper>
      </body>
    </html>
  );
}
