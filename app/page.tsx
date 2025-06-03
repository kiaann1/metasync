"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";

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

export default function Home() {
  const [seoData, setSeoData] = useState(getDefaultSEOData());
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    // Load SEO data on client side if needed
    // For now, using default data
    setSeoData(getDefaultSEOData());
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-4 md:px-7 h-16 border-b border-neutral-800 relative z-50">
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
          <button 
            className="md:hidden p-2 text-neutral-400 hover:text-white transition-colors duration-200 relative z-50"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle menu"
          >
            <div className="w-6 h-6 flex flex-col justify-center items-center">
              <span className={`block h-0.5 w-6 bg-current transform transition-all duration-300 ease-out ${
                isMobileMenuOpen ? 'rotate-45 translate' : '-translate-y-1'
              }`} />
              <span className={`block h-0.5 w-6 bg-current transform transition-all duration-300 ease-out ${
                isMobileMenuOpen ? 'opacity-0' : 'opacity-100'
              }`} />
              <span className={`block h-0.5 w-6 bg-current transform transition-all duration-300 ease-out ${
                isMobileMenuOpen ? '-rotate-45 -translate-y-1.5' : 'translate-y-1'
              }`} />
            </div>
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

      {/* Mobile menu overlay */}
      {isMobileMenuOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity duration-300"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Mobile menu */}
      <div className={`md:hidden fixed top-16 left-0 right-0 bg-neutral-900/95 backdrop-blur-lg border-b border-neutral-800 z-40 transform transition-all duration-300 ease-out ${
        isMobileMenuOpen 
          ? 'translate-y-0 opacity-100' 
          : '-translate-y-full opacity-0 pointer-events-none'
      }`}>
        <nav className="px-6 py-6 space-y-1">
          <Link 
            href="/" 
            className="block font-semibold text-white py-3 px-4 rounded-lg hover:bg-white/10 transition-colors duration-200"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            About
          </Link>
          <Link 
            href="https://github.com/kiaann1/metasync/" 
            className="block text-neutral-300 hover:text-white py-3 px-4 rounded-lg hover:bg-white/10 transition-colors duration-200"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            Docs
          </Link>
          <a
            href="https://github.com/kiaann1/metasync/"
            target="_blank"
            rel="noopener noreferrer"
            className="block text-neutral-300 hover:text-white py-3 px-4 rounded-lg hover:bg-white/10 transition-colors duration-200"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <span className="flex items-center justify-between">
              GitHub 
              <span className="text-xs opacity-60">↗</span>
            </span>
          </a>
        </nav>
      </div>

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
        <div className="flex gap-4 justify-center mb-12">
          <Link
            href="/signin"
            className="bg-white text-black font-medium px-7 py-3 rounded-lg shadow hover:bg-neutral-200 transition"
          >
            Sign in with GitHub
          </Link>
          <a
            href="https://github.com/kiaann1/metasync"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-neutral-900 text-white font-medium px-7 py-3 rounded-lg border border-neutral-700 shadow hover:bg-neutral-800 transition"
          >
            Get the source code
          </a>
        </div>
        
        {/* App Screenshot */}
        <div className="max-w-4xl mx-auto mb-12">
          <div className="rounded-lg overflow-hidden shadow-2xl border border-neutral-800">
            <Image
              src="/screenshots/repository.png" 
              alt="MetaSync Repository Management Interface"
              width={1200}
              height={800}
              className="w-full h-auto"
              priority
              onError={() => console.log('Image failed to load')}
            />
          </div>
          <p className="text-neutral-400 text-sm mt-4">
            Manage your repositories with an intuitive, modern interface
          </p>
        </div>
        
      </main>
    </div>
  );
}