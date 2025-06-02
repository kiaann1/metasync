import Link from "next/link";
import { Metadata } from "next";
import fs from "fs";
import path from "path";

// Read SEO data
function getSEOData() {
  const filePath = path.join(process.cwd(), "seo.json");
  const fileContents = fs.readFileSync(filePath, "utf8");
  return JSON.parse(fileContents);
}

// Generate metadata for SEO
export async function generateMetadata(): Promise<Metadata> {
  const seoData = getSEOData();
  
  return {
    title: seoData.meta_title,
    description: seoData.meta_description,
    keywords: seoData.meta_keywords,
    openGraph: {
      title: seoData.meta_title,
      description: seoData.meta_description,
    },
    twitter: {
      card: "summary_large_image",
      title: seoData.meta_title,
      description: seoData.meta_description,
    },
  };
}

export default function Home() {
  const seoData = getSEOData();

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-7 h-16 border-b border-neutral-800">
        <div className="text-3xl font-bold">MetaSync</div>
        <nav className="flex items-center gap-4">
          <Link href="#" className="font-bold text-white">
            About
          </Link>
          <Link href="#" className="text-neutral-400 hover:text-white transition">
            Docs
          </Link>
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-neutral-400 hover:text-white transition"
          >
            GitHub <span className="align-super text-xs">↗</span>
          </a>
          <a
            href="https://discord.gg"
            target="_blank"
            rel="noopener noreferrer"
            className="text-neutral-400 hover:text-white transition"
          >
            Discord <span className="align-super text-xs">↗</span>
          </a>
          {/* Sign in button navigates to /pages/signin */}
          <Link
            href="/signin"
            className="ml-4 px-5 py-2 rounded-full border border-neutral-700 bg-neutral-900 text-white hover:bg-neutral-800 transition"
          >
            Sign in
          </Link>
        </nav>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col justify-center items-center text-center px-4">
        <div className="mb-7">
        </div>
        <h1 className="text-5xl md:text-6xl font-extrabold mb-5 leading-tight">
          {seoData.h1}
        </h1>
        <h2 className="text-2xl md:text-3xl font-semibold mb-5 text-neutral-300">
          {seoData.h2}
        </h2>
        <p className="max-w-xl mx-auto text-neutral-300 mb-8 text-lg">
          {seoData["content-main"]}
        </p>
        <div className="flex gap-4 justify-center mb-20">
          <Link
            href="/signin"
            className="bg-white text-black font-medium px-7 py-3 rounded-lg shadow hover:bg-neutral-200 transition"
          >
            Sign in with GitHub
          </Link>
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-neutral-900 text-white font-medium px-7 py-3 rounded-lg border border-neutral-700 shadow hover:bg-neutral-800 transition"
          >
            Get the source code
          </a>
        </div>
        <div className="mb-2 text-neutral-400">
          Works with all popular static site generators
        </div>
      </main>
    </div>
  );
}