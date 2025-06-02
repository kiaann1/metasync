"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

function AuthErrorContent() {
  const searchParams = useSearchParams();
  const [errorMessage, setErrorMessage] = useState("Authentication error");
  const [errorDescription, setErrorDescription] = useState("");

  useEffect(() => {
    const error = searchParams.get("error");
    const errorDescription = searchParams.get("error_description");
    
    console.log("Auth error:", error, errorDescription); // Add this for debugging
    
    if (error === "Configuration") {
      setErrorMessage("Server Configuration Error");
      setErrorDescription("GitHub OAuth app configuration issue. Check GITHUB_ID and GITHUB_SECRET environment variables.");
    } else if (error === "AccessDenied") {
      setErrorMessage("Access Denied");
      setErrorDescription("You do not have permission to sign in.");
    } else {
      setErrorMessage("Authentication Error");
      setErrorDescription(`Error: ${error} - ${errorDescription || "An unexpected error occurred during authentication."}`);
    }
  }, [searchParams]);

  // Get current date in the format user wants
  const currentDate = new Date().toISOString().replace('T', ' ').substring(0, 19);

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-7 h-16 border-b border-neutral-800">
        <Link href="/">
          <div className="text-2xl font-bold text-white">MetaSync</div>
        </Link>
        <div className="text-neutral-400 text-sm">
          {currentDate}
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-8 w-full max-w-md">
          <div className="text-center mb-6">
            <div className="mb-4 flex justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">{errorMessage}</h1>
            <p className="text-neutral-400">
              {errorDescription}
            </p>
          </div>

          <div className="space-y-4">
            <Link href="/signin">
              <button className="w-full bg-neutral-800 hover:bg-neutral-700 text-white font-medium py-3 px-4 rounded-md transition">
                Try Again
              </button>
            </Link>
            
            <Link href="/">
              <button className="w-full bg-transparent hover:bg-neutral-800 text-neutral-400 font-medium py-3 px-4 rounded-md border border-neutral-700 transition">
                Return to Home
              </button>
            </Link>
          </div>

          <div className="mt-6 text-center text-neutral-500 text-sm">
            <p>If this problem persists, please contact support.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AuthError() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center">
        <div className="animate-pulse text-neutral-400">Loading...</div>
      </div>
    }>
      <AuthErrorContent />
    </Suspense>
  );
}