"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";

// Repository type definition
interface Repository {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  private: boolean;
  owner: {
    login: string;
    avatar_url: string;
    html_url: string;
  };
  updated_at: string | null;
  pushed_at: string | null;
  created_at: string | null;
  default_branch: string;
  visibility?: string;
  topics?: string[];
  language?: string | null;
  stargazers_count?: number;
  forks_count?: number;
}

// Function to fetch repositories
async function getRepositories(accessToken: string): Promise<Repository[]> {
  const response = await fetch("https://api.github.com/user/repos?sort=updated&per_page=100", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  
  if (!response.ok) {
    throw new Error("Failed to fetch repositories");
  }
  
const data = await response.json();
  
  // Transform the data to ensure it matches our Repository type
return data.map((repo: Repository): Repository => ({
    id: repo.id,
    name: repo.name,
    full_name: repo.full_name,
    description: repo.description,
    html_url: repo.html_url,
    private: repo.private,
    owner: {
      login: repo.owner.login,
      avatar_url: repo.owner.avatar_url,
      html_url: repo.owner.html_url,
    },
    updated_at: repo.updated_at || null,
    pushed_at: repo.pushed_at || null,
    created_at: repo.created_at || null,
    default_branch: repo.default_branch,
    visibility: repo.visibility,
    topics: repo.topics || [],
    language: repo.language,
    stargazers_count: repo.stargazers_count,
    forks_count: repo.forks_count,
  }));
}

// Functions to handle recently visited repositories
const getRecentRepositories = (): string[] => {
  if (typeof window === "undefined") return [];
  try {
    const recentRepos = localStorage.getItem("recentRepositories");
    return recentRepos ? JSON.parse(recentRepos) : [];
  } catch (e) {
    console.error("Error reading from localStorage:", e);
    return [];
  }
};

const addRecentRepository = (repoFullName: string) => {
  if (typeof window === "undefined") return;
  try {
    const recentRepos = getRecentRepositories();
    
    // Remove if exists and add to front (most recent)
    const updatedRepos = [
      repoFullName,
      ...recentRepos.filter(name => name !== repoFullName)
    ].slice(0, 5); // Keep only 5 most recent
    
    localStorage.setItem("recentRepositories", JSON.stringify(updatedRepos));
  } catch (e) {
    console.error("Error writing to localStorage:", e);
  }
};

// Format date to be more readable
function formatDate(dateString: string | null): string {
  if (!dateString) return "Unknown date";
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });
}

// Repository card component
function RepositoryCard({ repo, onClick }: { repo: Repository, onClick?: () => void }) {
  return (
    <div 
      onClick={onClick}
      className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 hover:border-neutral-700 transition cursor-pointer"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center">
          <div className="w-6 h-6 mr-3 flex items-center justify-center">
            {repo.private ? (
              <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
            )}
          </div>
          <h3 className="font-medium text-white truncate">{repo.name}</h3>
        </div>
        
        <span className="text-xs px-2 py-1 rounded bg-neutral-800 text-neutral-400">
          {repo.visibility || (repo.private ? 'private' : 'public')}
        </span>
      </div>
      
      {repo.description && (
        <p className="text-neutral-400 text-sm mb-3 line-clamp-2">
          {repo.description}
        </p>
      )}
      
      <div className="flex items-center justify-between text-xs text-neutral-500 mt-2">
        <div className="flex items-center">
          <div className="w-4 h-4 rounded-full overflow-hidden mr-2">
            <Image 
              src={repo.owner.avatar_url} 
              alt={repo.owner.login}
              width={16}
              height={16}
              className="w-full h-full object-cover"
            />
          </div>
          <span>{repo.owner.login}</span>
        </div>
        <span>Updated {repo.updated_at ? formatDate(repo.updated_at) : 'recently'}</span>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [recentRepositories, setRecentRepositories] = useState<Repository[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentTime, setCurrentTime] = useState<string>("");
  
  // Redirect if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/signin");
    }
    
    // Set current time
    const now = new Date();
    const formattedDate = now.toISOString().replace('T', ' ').substring(0, 19);
    setCurrentTime(formattedDate);
  }, [status, router]);
  
  // Load repositories
  useEffect(() => {
    const loadData = async () => {
      if (session?.accessToken) {
        try {
          setIsLoading(true);
          setError(null);
          
          // Load initial repositories (user's own)
          const repos = await getRepositories(session.accessToken as string);
          setRepositories(repos);
          
          // Get recently visited repos from localStorage
          const recentRepoNames = getRecentRepositories();
          
          // Filter repositories to find matches for recent repos
          const recentRepos = repos.filter(repo => 
            recentRepoNames.includes(repo.full_name)
          );
          
          setRecentRepositories(recentRepos);
        } catch (error) {
          console.error("Failed to load repositories:", error);
          setError("Failed to load repositories. Please try again later.");
        } finally {
          setIsLoading(false);
        }
      }
    };
    
    if (session) {
      loadData();
    }
  }, [session]);
  
  // Handle repository selection
  const handleRepositorySelect = (repo: Repository) => {
    // Add to recent repositories
    addRecentRepository(repo.full_name);
    
    // Navigate to repository page
    router.push(`/repository/${repo.owner.login}/${repo.name}`);
  };
  
  // Filter repositories based on search query
  const filteredRepositories = repositories.filter(repo => 
    repo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    repo.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    repo.owner.login.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center">
        <div className="animate-pulse text-neutral-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-7 h-16 border-b border-neutral-800">
        <div className="text-2xl font-bold text-white">MetaSync</div>
        <div className="text-neutral-400 text-sm">
          {currentTime}
        </div>
      </header>
      
      <main className="flex-1 container mx-auto px-4 py-8 max-w-7xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white mb-1">Dashboard</h1>
            <p className="text-neutral-400">
              Manage your GitHub repositories and content
            </p>
          </div>
          
          {session?.user && (
            <div className="flex items-center gap-4">
              <div className="text-right text-sm hidden md:block">
                <div className="text-white font-medium">
                  {session.user.name || session.user.email || "GitHub User"}
                </div>
                <div className="text-neutral-400">@{session.user.name || "user"}</div>
              </div>
              {session.user.image && (
                <div className="w-10 h-10 rounded-full overflow-hidden">
                  <Image 
                    src={session.user.image}
                    alt="Profile"
                    width={40}
                    height={40}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Search bar */}
        <div className="mb-8">
          <div className="flex items-center bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-2 focus-within:border-neutral-700">
            <svg className="w-5 h-5 text-neutral-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search repositories..."
              className="bg-transparent border-none outline-none text-white w-full placeholder-neutral-500"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        
        {/* Error message */}
        {error && (
          <div className="bg-red-900/30 border border-red-800 text-red-200 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}
        
        {/* Recent repositories */}
        {recentRepositories.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">Recently Visited</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recentRepositories.map(repo => (
                <RepositoryCard 
                  key={repo.id} 
                  repo={repo} 
                  onClick={() => handleRepositorySelect(repo)}
                />
              ))}
            </div>
          </div>
        )}
        
        {/* All repositories */}
        <div>
          <h2 className="text-xl font-semibold text-white mb-4">
            {searchQuery ? 'Search Results' : 'Your Repositories'}
          </h2>
          
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 animate-pulse">
                  <div className="h-6 bg-neutral-800 rounded w-1/2 mb-3"></div>
                  <div className="h-4 bg-neutral-800 rounded w-full mb-2"></div>
                  <div className="h-4 bg-neutral-800 rounded w-3/4"></div>
                </div>
              ))}
            </div>
          ) : filteredRepositories.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredRepositories.map(repo => (
                <RepositoryCard 
                  key={repo.id} 
                  repo={repo} 
                  onClick={() => handleRepositorySelect(repo)}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-neutral-400">
              {searchQuery ? (
                <div>
                  <p className="text-lg mb-2">No repositories match your search</p>
                  <p className="text-sm">Try different keywords or check your access permissions</p>
                </div>
              ) : (
                <div>
                  <p className="text-lg mb-2">No repositories found</p>
                  <p className="text-sm">Create a new repository on GitHub to get started</p>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}