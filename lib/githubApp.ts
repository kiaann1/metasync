import { Octokit } from "@octokit/rest";

// Make Repository type more flexible to match GitHub API
export type Repository = {
  name: string;
  full_name: string;
  description: string | null;
  private: boolean;
  updated_at: string; // We'll handle this in mapping
  language: string | null | undefined;
  visibility: string;
  default_branch?: string;
  owner: {
    login: string;
  };
  [key: string]: unknown; // Changed from any to unknown
};

// Also add a type for the raw GitHub API repository response
export type GitHubApiRepository = {
  name: string;
  full_name: string;
  description: string | null | undefined;
  private: boolean;
  updated_at: string | null | undefined;
  language: string | null | undefined;
  visibility?: string;
  default_branch?: string;
  owner: {
    login: string;
    [key: string]: unknown; // Changed from any to unknown
  };
  [key: string]: unknown; // Changed from any to unknown
};

export type GitHubContent = {
  name: string;
  path: string;
  type: string;  // "file" or "dir"
  sha: string;
  size: number;
  content?: string;
  encoding?: string;
  download_url: string | null;
  html_url: string;
};

export type GitHubFile = {
  name: string;
  path: string;
  type: "file";
  content: string;
  encoding: string;
  sha: string;
  lastUpdated: string;
  download_url: string | null;
  fileType: string;  // yml, json, md, etc.
};

// Define GitHub error interface for better type checking
interface GitHubError {
  status: number;
  message?: string;
}

// Create Octokit instance with access token
const createOctokit = (accessToken: string) => {
  return new Octokit({
    auth: accessToken,
  });
};

// Get user information
export async function getCurrentUser(accessToken: string) {
  const octokit = createOctokit(accessToken);
  try {
    const { data } = await octokit.users.getAuthenticated();
    return data;
  } catch (error: unknown) {
    console.error("Error fetching user data:", error);
    throw error;
  }
}

// Get user organizations
export async function getUserOrganizations(accessToken: string) {
  const octokit = createOctokit(accessToken);
  try {
    const { data } = await octokit.orgs.listForAuthenticatedUser();
    return data;
  } catch (error: unknown) {
    console.error("Error fetching user organizations:", error);
    throw error;
  }
}

// Get repositories for user or organization
export async function getRepositories(accessToken: string, org?: string) {
  const octokit = createOctokit(accessToken);
  
  try {
    if (org) {
      // Get org repos the user has access to
      const { data } = await octokit.repos.listForOrg({
        org,
        sort: "updated",
        per_page: 100,
      });
      return data;
    } else {
      // Get user's repos
      const { data } = await octokit.repos.listForAuthenticatedUser({
        sort: "updated",
        per_page: 100,
      });
      return data;
    }
  } catch (error: unknown) {
    console.error("Error fetching repositories:", error);
    throw error;
  }
}

// Type guard to check if an error is a GitHub error
function isGitHubError(error: unknown): error is GitHubError {
  return (
    typeof error === 'object' && 
    error !== null && 
    'status' in error && 
    typeof (error as GitHubError).status === 'number'
  );
}

// Get contents of a repository (files and directories)
export async function getRepositoryContents(
  accessToken: string, 
  owner: string, 
  repo: string, 
  path: string = "",
  ref: string = "main"
) {
  const octokit = createOctokit(accessToken);
  
  try {
    const { data } = await octokit.repos.getContent({
      owner,
      repo,
      path,
      ref,
    });
    
    return Array.isArray(data) ? data : [data];
  } catch (error: unknown) {
    console.error(`Error fetching contents for ${owner}/${repo}/${path}:`, error);
    // If 404, return empty array (no files exist)
    if (isGitHubError(error) && error.status === 404) {
      return [];
    }
    throw error;
  }
}

// Get a single file from a repository
export async function getFileContent(
  accessToken: string,
  owner: string,
  repo: string,
  path: string,
  ref: string = "main"
): Promise<GitHubFile | null> {
  const octokit = createOctokit(accessToken);
  
  try {
    const { data } = await octokit.repos.getContent({
      owner,
      repo,
      path,
      ref,
    });
    
    if (Array.isArray(data) || data.type !== "file") {
      throw new Error("Expected a file but got a directory");
    }
    
    const content = data.content 
      ? Buffer.from(data.content, "base64").toString("utf8")
      : "";
      
    // Get extension from filename
    const fileType = data.name.split('.').pop() || "";
    
    // Get the last commit for this file for "last updated" info
    const commits = await octokit.repos.listCommits({
      owner,
      repo,
      path,
      per_page: 1
    });
    
    const lastUpdated = commits.data[0]?.commit?.committer?.date || data.sha.substring(0, 7);
    
    return {
      name: data.name,
      path: data.path,
      type: "file",
      content,
      encoding: data.encoding,
      sha: data.sha,
      fileType,
      lastUpdated,
      download_url: data.download_url,
    };
  } catch (error: unknown) {
    console.error(`Error fetching file ${owner}/${repo}/${path}:`, error);
    // If 404, return null (file doesn't exist)
    if (isGitHubError(error) && error.status === 404) {
      return null;
    }
    throw error;
  }
}

// Create or update a file in a repository
export async function createOrUpdateFile(
  accessToken: string,
  owner: string,
  repo: string,
  path: string,
  content: string,
  message: string,
  sha?: string
) {
  const octokit = createOctokit(accessToken);
  
  try {
    const { data } = await octokit.repos.createOrUpdateFileContents({
      owner,
      repo,
      path,
      message,
      content: Buffer.from(content).toString("base64"),
      sha,
    });
    
    return data;
  } catch (error: unknown) {
    console.error(`Error saving file ${owner}/${repo}/${path}:`, error);
    throw error;
  }
}

// Get repository branches
export async function getRepositoryBranches(
  accessToken: string,
  owner: string,
  repo: string
) {
  const octokit = createOctokit(accessToken);
  
  try {
    const { data } = await octokit.repos.listBranches({
      owner,
      repo,
      per_page: 100,
    });
    
    return data;
  } catch (error: unknown) {
    console.error(`Error fetching branches for ${owner}/${repo}:`, error);
    throw error;
  }
}

// Get recently visited repositories (we'll need to track this client-side)
export function getRecentRepositories(): string[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const recentRepos = JSON.parse(localStorage.getItem('recentRepos') || '[]');
    return recentRepos;
  } catch (error: unknown) {
    console.error('Error getting recent repos from localStorage:', error);
    return [];
  }
}

// Save a recently visited repository
export function saveRecentRepository(fullName: string): void {
  if (typeof window === 'undefined') return;
  
  try {
    let recentRepos = JSON.parse(localStorage.getItem('recentRepos') || '[]');
    
    // Remove if exists already (to move to top)
    recentRepos = recentRepos.filter((repo: string) => repo !== fullName);
    
    // Add to beginning
    recentRepos.unshift(fullName);
    
    // Keep only most recent 5
    recentRepos = recentRepos.slice(0, 5);
    
    localStorage.setItem('recentRepos', JSON.stringify(recentRepos));
  } catch (error: unknown) {
    console.error('Error saving recent repo:', error);
  }
}

// Create a new branch from the default branch
export async function createBranch(
  accessToken: string,
  owner: string,
  repo: string,
  branchName: string,
  fromBranch: string = "main"
) {
  const octokit = createOctokit(accessToken);
  
  try {
    // Get the SHA of the source branch
    const { data: refData } = await octokit.git.getRef({
      owner,
      repo,
      ref: `heads/${fromBranch}`,
    });
    
    // Create new branch
    const { data } = await octokit.git.createRef({
      owner,
      repo,
      ref: `refs/heads/${branchName}`,
      sha: refData.object.sha,
    });
    
    return data;
  } catch (error: unknown) {
    console.error(`Error creating branch ${branchName} in ${owner}/${repo}:`, error);
    throw error;
  }
}

// Create or update a file in a specific branch
export async function createOrUpdateFileInBranch(
  accessToken: string,
  owner: string,
  repo: string,
  path: string,
  content: string,
  message: string,
  branchName: string,
  sha?: string
) {
  const octokit = createOctokit(accessToken);
  
  try {
    const { data } = await octokit.repos.createOrUpdateFileContents({
      owner,
      repo,
      path,
      message,
      content: Buffer.from(content).toString("base64"),
      branch: branchName,
      sha,
    });
    
    return data;
  } catch (error: unknown) {
    console.error(`Error saving file ${owner}/${repo}/${path} to branch ${branchName}:`, error);
    throw error;
  }
}

// Create a pull request
export async function createPullRequest(
  accessToken: string,
  owner: string,
  repo: string,
  title: string,
  head: string, // source branch
  base: string, // target branch
  body?: string
) {
  const octokit = createOctokit(accessToken);
  
  try {
    const { data } = await octokit.pulls.create({
      owner,
      repo,
      title,
      head,
      base,
      body,
    });
    
    return data;
  } catch (error: unknown) {
    console.error(`Error creating pull request in ${owner}/${repo}:`, error);
    throw error;
  }
}

// Merge a pull request
export async function mergePullRequest(
  accessToken: string,
  owner: string,
  repo: string,
  pullNumber: number,
  mergeMethod: "merge" | "squash" | "rebase" = "squash"
) {
  const octokit = createOctokit(accessToken);
  
  try {
    const { data } = await octokit.pulls.merge({
      owner,
      repo,
      pull_number: pullNumber,
      merge_method: mergeMethod,
    });
    
    return data;
  } catch (error: unknown) {
    console.error(`Error merging pull request #${pullNumber} in ${owner}/${repo}:`, error);
    throw error;
  }
}

// Check if a branch exists
export async function branchExists(
  accessToken: string,
  owner: string,
  repo: string,
  branchName: string
) {
  const octokit = createOctokit(accessToken);
  
  try {
    await octokit.git.getRef({
      owner,
      repo,
      ref: `heads/${branchName}`,
    });
    return true;
  } catch (error: unknown) {
    if (isGitHubError(error) && error.status === 404) {
      return false;
    }
    throw error;
  }
}