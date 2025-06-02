"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";

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

interface GitHubRepoResponse {
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

export default function OwnerPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const owner = params.owner as string;
  
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [userData, setUserData] = useState<{
    login: string;
    name: string | null;
    avatar_url: string;
    bio: string | null;
    company: string | null;
    location: string | null;
    blog: string;
    created_at: string | null;
    followers: number;
    following: number;
    html_url: string;
  } | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState<string>("");

  // Redirect if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/signin");
    }
    
    // Set current time
    const now = new Date();
    // Format as YYYY-MM-DD HH:MM:SS
    setCurrentTime(now.toISOString().replace('T', ' ').substring(0, 19));
  }, [status, router]);

  // Format dates
  function formatDate(dateString: string | null): string {
    if (!dateString) return "Unknown date";
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  }

  // Get user repositories
  useEffect(() => {
    const fetchData = async () => {
      if (!session?.accessToken || !owner) return;

      try {
        setIsLoading(true);
        setError(null);

        // Fetch user data
        const userResponse = await fetch(`https://api.github.com/users/${owner}`, {
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
            "User-Agent": "MetaSync-App"
          }
        });

        if (!userResponse.ok) {
          throw new Error(`Failed to fetch user data: ${userResponse.status}`);
        }

    const userData = await userResponse.json();
    setUserData(userData);

    // Fetch user's repositories
    const reposResponse = await fetch(`https://api.github.com/users/${owner}/repos`, {
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
        "User-Agent": "MetaSync-App"
      }
    });

    if (!reposResponse.ok) {
      throw new Error(`Failed to fetch repositories: ${reposResponse.status}`);
    }

    const reposData = await reposResponse.json();
    
    // Transform data to match Repository type
    const formattedRepos = reposData.map((repo: GitHubRepoResponse): Repository => ({
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
    
    setRepositories(formattedRepos);
      } catch (err) {
        console.error("Error fetching data:", err);
        setError("Failed to load user repositories. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [session, owner]);

  // Handle repository selection
  const handleRepositorySelect = (repo: Repository) => {
    // Add to recent repositories in localStorage
    if (typeof window !== "undefined") {
      try {
        const recentRepos = localStorage.getItem("recentRepositories");
        const reposArray = recentRepos ? JSON.parse(recentRepos) : [];
        const updatedRepos = [
          repo.full_name,
          ...reposArray.filter((name: string) => name !== repo.full_name)
        ].slice(0, 5);
        localStorage.setItem("recentRepositories", JSON.stringify(updatedRepos));
      } catch (e) {
        console.error("Error updating localStorage:", e);
      }
    }
    
    // Navigate to repository page
    router.push(`/repository/${owner}/${repo.name}`);
  };

  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center">
        <div className="animate-pulse text-neutral-400">Loading user data...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-7 h-16 border-b border-neutral-800">
        <Link href="/dashboard" className="text-2xl font-bold text-white">
          MetaSync
        </Link>
        <div className="text-neutral-400 text-sm">
          {currentTime}
          <br />
          Current User Login: {session?.user?.name || "Unknown"}
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-6 max-w-7xl">
        {/* Error message */}
        {error && (
          <div className="bg-red-900/30 border border-red-800 text-red-200 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        <div className="flex items-center gap-3 mb-6">
          <Link href="/dashboard" className="text-neutral-400 hover:text-white">
            Dashboard
          </Link>
          <span className="text-neutral-600">/</span>
          <span className="text-white font-medium">{owner}</span>
        </div>

        {/* User profile */}
        {userData && (
          <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6 mb-8">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
              <div className="w-24 h-24 rounded-full overflow-hidden">
                <Image 
                  src={userData.avatar_url} 
                  alt={userData.login}
                  width={96}
                  height={96}
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white mb-2">
                  {userData.name || userData.login}
                </h1>
                <div className="text-neutral-400 mb-3">@{userData.login}</div>
                
                {userData.bio && (
                  <p className="text-neutral-300 mb-3">{userData.bio}</p>
                )}
                
                <div className="flex flex-wrap gap-4 mb-4 text-sm text-neutral-400">
                  {userData.company && (
                    <div className="flex items-center">
                      <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      {userData.company}
                    </div>
                  )}
                  {userData.location && (
                    <div className="flex items-center">
                      <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {userData.location}
                    </div>
                  )}
                  {userData.blog && (
                    <div className="flex items-center">
                      <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                      <a href={userData.blog.startsWith('http') ? userData.blog : `https://${userData.blog}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:underline">
                        {userData.blog}
                      </a>
                    </div>
                  )}
                  <div className="flex items-center">
                    <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 13l-7 7-7-7m14-8l-7 7-7-7" />
                    </svg>
                    Joined {formatDate(userData.created_at)}
                  </div>
                </div>
                
                <div className="flex gap-4">
                  <div className="text-neutral-200">
                    <span className="font-semibold text-white">{userData.followers}</span> followers
                  </div>
                  <div className="text-neutral-200">
                    <span className="font-semibold text-white">{userData.following}</span> following
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Repositories list */}
        <h2 className="text-xl font-semibold text-white mb-4">Repositories</h2>
        
        {repositories.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {repositories.map(repo => (
              <div 
                key={repo.id}
                onClick={() => handleRepositorySelect(repo)}
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
                
                <div className="flex items-center gap-3 text-sm text-neutral-500 mt-2">
                  {repo.language && (
                    <div className="flex items-center">
                      <span className="w-3 h-3 rounded-full bg-blue-400 mr-1.5"></span>
                      {repo.language}
                    </div>
                  )}
                  
                  {repo.stargazers_count !== undefined && repo.stargazers_count > 0 && (
                    <div className="flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                      </svg>
                      {repo.stargazers_count}
                    </div>
                  )}
                  
                  {repo.forks_count !== undefined && repo.forks_count > 0 && (
                    <div className="flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                      </svg>
                      {repo.forks_count}
                    </div>
                  )}
                  
                  <div>
                    Updated {formatDate(repo.updated_at)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-neutral-900 border border-neutral-800 rounded-lg">
            <p className="text-neutral-400">No repositories found for this user</p>
          </div>
        )}
      </main>
    </div>
  );
}