import Link from "next/link";
import { Metadata } from "next";
import fs from "fs";
import path from "path";

// Default SEO data fallback
function getDefaultSEOData() {
  return {
    meta_title: "MetaSync - GitHub Repository Management",
    meta_description: "Streamline your GitHub workflow with MetaSync. Manage repositories, edit content, and collaborate with your team.",
    meta_keywords: "github, repository management, content management, developer tools, collaboration",
    h1: "Streamline Your GitHub Workflow",
    h2: "Powerful Repository Management Made Simple",
    "content-main": "MetaSync provides an intuitive interface for managing your GitHub repositories, editing content, and collaborating with your team."
  };
}

// Read SEO data
function getSEOData() {
  try {
    const filePath = path.join(process.cwd(), "seo.json");
    
    // Validate file exists and is readable
    if (!fs.existsSync(filePath)) {
      console.warn("SEO file not found, using defaults");
      return getDefaultSEOData();
    }
    
    const fileContents = fs.readFileSync(filePath, "utf8");
    const parsed = JSON.parse(fileContents);
    
    // Validate structure
    if (!isValidSEOData(parsed)) {
      throw new Error("Invalid SEO data structure");
    }
    
    return sanitizeSEOData(parsed);
  } catch (error) {
    console.error("Failed to load SEO data:", error);
    return getDefaultSEOData();
  }
}

function isValidSEOData(data: any): boolean {
  return data && 
    typeof data.meta_title === 'string' &&
    typeof data.meta_description === 'string' &&
    typeof data.meta_keywords === 'string' &&
    typeof data.h1 === 'string' &&
    typeof data.h2 === 'string' &&
    typeof data["content-main"] === 'string';
}

function sanitizeSEOData(data: any) {
  // Sanitize HTML and limit lengths
  return {
    meta_title: data.meta_title.slice(0, 100),
    meta_description: data.meta_description.slice(0, 160),
    meta_keywords: data.meta_keywords.slice(0, 200),
    h1: data.h1.slice(0, 100),
    h2: data.h2.slice(0, 100),
    "content-main": data["content-main"].slice(0, 500)
  };
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
      <header className="flex items-center justify-between px-4 md:px-7 h-16 border-b border-neutral-800">
        <div className="text-2xl md:text-3xl font-bold">MetaSync</div>
        <nav className="flex items-center gap-2 md:gap-4">
          {/* Desktop navigation */}
          <div className="hidden md:flex items-center gap-4">
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
          </div>
          
          {/* Mobile menu button */}
          <button className="md:hidden p-2 text-neutral-400 hover:text-white">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          
          {/* Sign in button - always visible */}
          <Link
            href="/signin"
            className="px-3 py-2 md:px-5 md:py-2 md:ml-4 rounded-full border border-neutral-700 bg-neutral-900 text-white hover:bg-neutral-800 transition text-sm md:text-base"
          >
            <span className="hidden sm:inline">Sign in</span>
            <span className="sm:hidden">Sign in</span>
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