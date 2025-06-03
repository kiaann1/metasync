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
            <Link href="/" className="text-neutral-400 hover:text-white transition">
              Docs
            </Link>
            <a
              href="https://github.com/kiaann1/metasync"
              target="_blank"
              rel="noopener noreferrer"
              className="text-neutral-400 hover:text-white transition"
            >
              GitHub <span className="align-super text-xs">↗</span>
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

      {/* Features Section */}
      <section className="py-20 px-4 bg-neutral-900/50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Everything you need to manage your repositories</h2>
            <p className="text-neutral-400 text-lg max-w-2xl mx-auto">
              From browsing files to managing collaborators, MetaSync provides all the tools you need in one clean interface.
            </p>
          </div>

          {/* Feature 1: Dashboard */}
          <div className="grid md:grid-cols-2 gap-12 items-center mb-20">
            <div>
              <h3 className="text-3xl font-semibold mb-4">Unified Dashboard</h3>
              <p className="text-neutral-300 text-lg mb-6">
                View all your repositories at a glance. Get quick insights into activity, languages, and recent updates across your entire GitHub portfolio.
              </p>
              <ul className="space-y-2 text-neutral-300">
                <li className="flex items-center"><span className="text-green-400 mr-2">✓</span> Repository overview and statistics</li>
                <li className="flex items-center"><span className="text-green-400 mr-2">✓</span> Quick access to recent projects</li>
                <li className="flex items-center"><span className="text-green-400 mr-2">✓</span> Search and filter functionality</li>
              </ul>
            </div>
            <div className="rounded-lg overflow-hidden shadow-xl border border-neutral-800">
              <Image
                src="/screenshots/dashboard.png"
                alt="MetaSync Dashboard"
                width={600}
                height={400}
                className="w-full h-auto"
              />
            </div>
          </div>

          {/* Feature 2: SEO Management */}
          <div className="grid md:grid-cols-2 gap-12 items-center mb-20">
            <div className="order-2 md:order-1 rounded-lg overflow-hidden shadow-xl border border-neutral-800">
              <Image
                src="/screenshots/seo.png"
                alt="SEO Management Interface"
                width={600}
                height={400}
                className="w-full h-auto"
              />
            </div>
            <div className="order-1 md:order-2">
              <h3 className="text-3xl font-semibold mb-4">Advanced SEO Management</h3>
              <p className="text-neutral-300 text-lg mb-6">
                Optimize your content for search engines with our specialized SEO editor. Create and manage metadata files with an intuitive form interface.
              </p>
              <ul className="space-y-2 text-neutral-300">
                <li className="flex items-center"><span className="text-purple-400 mr-2">✓</span> Visual SEO form editor</li>
                <li className="flex items-center"><span className="text-purple-400 mr-2">✓</span> Meta tags and descriptions</li>
                <li className="flex items-center"><span className="text-purple-400 mr-2">✓</span> Structured data management</li>
              </ul>
            </div>
          </div>

          {/* Feature 3: File Creation */}
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h3 className="text-3xl font-semibold mb-4">Smart File Creation</h3>
              <p className="text-neutral-300 text-lg mb-6">
                Create new files with intelligent templates. Whether it's documentation, configuration, or SEO files, we've got you covered with pre-built templates.
              </p>
              <ul className="space-y-2 text-neutral-300">
                <li className="flex items-center"><span className="text-blue-400 mr-2">✓</span> Pre-built file templates</li>
                <li className="flex items-center"><span className="text-blue-400 mr-2">✓</span> Custom file creation</li>
                <li className="flex items-center"><span className="text-blue-400 mr-2">✓</span> README and documentation helpers</li>
              </ul>
            </div>
            <div className="rounded-lg overflow-hidden shadow-xl border border-neutral-800">
              <Image
                src="/screenshots/create.png"
                alt="File Creation Interface"
                width={600}
                height={400}
                className="w-full h-auto"
              />
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 text-center">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-4xl font-bold mb-6">Ready to streamline your workflow?</h2>
          <p className="text-neutral-300 text-lg mb-8">
            Join developers who are already using MetaSync to manage their GitHub repositories more efficiently.
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              href="/signin"
              className="bg-white text-black font-medium px-8 py-4 rounded-lg shadow hover:bg-neutral-200 transition text-lg"
            >
              Get Started Free
            </Link>
            <a
              href="https://github.com/kiaann1/metasync"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-transparent text-white font-medium px-8 py-4 rounded-lg border border-neutral-700 hover:bg-neutral-800 transition text-lg"
            >
              View on GitHub
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-neutral-800 py-8 px-4 text-center text-neutral-400">
        <div className="max-w-6xl mx-auto">
          <p>&copy; 2024 MetaSync. Built with ❤️ using Next.js and GitHub API.</p>
        </div>
      </footer>
    </div>
  );
}