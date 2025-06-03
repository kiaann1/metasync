"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";

interface Repository {
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
  default_branch: string;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  topics: string[];
  language: string | null;
  updated_at: string | null;
  created_at: string | null;
}

interface GitHubCollaborator {
  id: number;
  login: string;
  avatar_url: string;
  html_url: string;
  permissions: {
    admin: boolean;
    maintain: boolean;
    push: boolean;
    triage: boolean;
    pull: boolean;
  };
  role_name?: string;
}

interface FileItem {
  name: string;
  path: string;
  sha: string;
  size: number;
  type: "file" | "dir";
  content?: string;
  encoding?: string;
  download_url?: string;
}

interface SEOData {
  [key: string]: string | number | boolean | null;
}

export default function RepositoryPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const owner = params.owner as string;
  const repo = params.repo as string;

  const [repository, setRepository] = useState<Repository | null>(null);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPath, setCurrentPath] = useState("");
  const [currentTime, setCurrentTime] = useState<string>("");
  const [fileContent, setFileContent] = useState<{ content: string; name: string; path: string } | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedContent, setEditedContent] = useState("");

  // Additional states for Settings modal
  const [showSettings, setShowSettings] = useState(false);
  const [activeTab, setActiveTab] = useState("collaborators");
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("content");
  const [isInviting, setIsInviting] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);

  // SEO states
  const [seoData, setSeoData] = useState<SEOData | null>(null);
  const [isEditingSEO, setIsEditingSEO] = useState(false);
  const [seoFormData, setSeoFormData] = useState<SEOData>({});

  // Create file states
  const [showCreateFile, setShowCreateFile] = useState(false);
  const [newFileName, setNewFileName] = useState("");
  const [newFileContent, setNewFileContent] = useState("");
  const [isCreatingFile, setIsCreatingFile] = useState(false);
  const [createFileError, setCreateFileError] = useState<string | null>(null);

  // Format dates in a more readable format
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Unknown date";
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

    // Add these interfaces to your file
interface Collaborator {
  id: number;
  login: string;
  avatar_url: string;
  html_url: string;
  permissions: {
    admin: boolean;
    maintain: boolean;
    push: boolean;
    triage: boolean;
    pull: boolean;
  };
  role_name: string;
  custom_role?: string;
}

interface CustomRole {
  id: string;
  name: string;
  description: string;
  permissions: {
    content: boolean;
    seo: boolean;
    admin: boolean;
    settings: boolean;
  };
  githubRole: "admin" | "maintain" | "push" | "triage" | "pull";
}

// Define our custom roles
const customRoles: CustomRole[] = [
    {
      id: "full",
      name: "Full Access",
      description: "Complete access to all repository features",
      permissions: {
        content: true,
        seo: true,
        admin: true,
        settings: true
      },
      githubRole: "admin"
    },
    {
      id: "content",
      name: "Content Editor",
      description: "Can edit content files only",
      permissions: {
        content: true,
        seo: false,
        admin: false,
        settings: false
      },
      githubRole: "push"
    },
    {
      id: "seo",
      name: "SEO Manager",
      description: "Can edit SEO and metadata files",
      permissions: {
        content: false,
        seo: true,
        admin: false,
        settings: false
      },
      githubRole: "push"
    },
    {
      id: "reviewer",
      name: "Reviewer",
      description: "Can view and comment but not edit",
      permissions: {
        content: false,
        seo: false,
        admin: false,
        settings: false
      },
      githubRole: "triage"
    }
  ];

  const fetchCollaborators = useCallback(async () => {
    if (!session?.accessToken) return;

    try {
      setIsLoading(true);

      const response = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/collaborators`,
        {
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
            "User-Agent": "MetaSync-App"
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch collaborators: ${response.status}`);
      }

      const data = await response.json();
      
      // Map to our collaborator model with custom roles
      // Fixed the 'any' type with GitHubCollaborator
      const mappedCollaborators = data.map((collab: GitHubCollaborator) => {
        // Determine custom role based on GitHub permissions
        let customRole = "reviewer";
        if (collab.permissions.admin) customRole = "full";
        else if (collab.permissions.push) customRole = "content";
        
        return {
          ...collab,
          custom_role: customRole
        };
      });
      
      setCollaborators(mappedCollaborators);
    } catch (err) {
      console.error("Error fetching collaborators:", err);
      setError("Failed to load collaborators. Please check your permissions.");
    } finally {
      setIsLoading(false);
    }
  }, [session, owner, repo]); // Add dependencies to useCallback

// Add this effect to load collaborators when settings are opened
 useEffect(() => {
    if (showSettings && activeTab === "collaborators") {
      fetchCollaborators();
    }
  }, [showSettings, activeTab, fetchCollaborators]);

// Fix the date formatting in the header section
  const formatCurrentTime = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  };

// Update the main useEffect for authentication and time
useEffect(() => {
  if (status === "unauthenticated") {
    router.push("/signin");
    return;
  }

  // Set current time using the proper formatting function
  setCurrentTime(formatCurrentTime());

  // Optional: Update the time every minute
  const timer = setInterval(() => {
    setCurrentTime(formatCurrentTime());
  }, 60000);
  
  return () => clearInterval(timer);
}, [status, router]);

  const inviteCollaborator = async () => {
    if (!session?.accessToken || !inviteEmail) return;
    
    setIsInviting(true);
    setInviteSuccess(null);
    setInviteError(null);
    
    try {
      // First, we need to find the GitHub role that corresponds to our custom role
      const role = customRoles.find(r => r.id === inviteRole);
      if (!role) throw new Error("Invalid role selected");
      
      // Check if input looks like an email or username
      const isEmail = inviteEmail.includes('@');
      const username = inviteEmail; // Changed from 'let' to 'const' as it's never reassigned
      
      // If it's an email, try to find the GitHub username first
      if (isEmail) {
        try {
          // This won't work directly with emails, so we'll provide a helpful error
          setInviteError("GitHub requires a username, not an email address. Please enter a GitHub username instead.");
          setIsInviting(false);
          return;
        } catch (err) {
          console.error("Error finding GitHub user by email:", err);
          throw new Error("Couldn't find a GitHub user with this email. Please use their GitHub username instead.");
        }
      }
    
    // 1. Add the collaborator via GitHub API
      const addResponse = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/collaborators/${username}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
            "Content-Type": "application/json",
            "User-Agent": "MetaSync-App"
          },
          body: JSON.stringify({
            permission: role.githubRole
          })
        }
      );
      
      if (!addResponse.ok) {
        const errorData = await addResponse.json();
        
        // Provide more helpful error messages based on status codes
        if (addResponse.status === 404) {
          throw new Error(`GitHub user "${username}" not found. Please verify the username is correct.`);
        } else if (addResponse.status === 403) {
          throw new Error("You don't have permission to add collaborators to this repository.");
        } else {
          throw new Error(`Failed to add collaborator: ${errorData.message || addResponse.statusText}`);
        }
      }

      try {
        const invitationsResponse = await fetch(
          `https://api.github.com/repos/${owner}/${repo}/invitations`,
          {
            headers: {
              Authorization: `Bearer ${session.accessToken}`,
              "User-Agent": "MetaSync-App"
            }
          }
        );
        
        if (invitationsResponse.ok) {
          const invitations = await invitationsResponse.json();
          console.log("Pending invitations:", invitations);
        }
      } catch (e) {
        console.error("Error fetching invitations (non-critical):", e);
      }
      
      // 3. Send email notification if email is provided
      if (isEmail) {
        try {
          await fetch('/api/send-invitation', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email: inviteEmail,
              repoOwner: owner,
              repoName: repo,
              role: role.name,
              invitedBy: session.user?.name || "A user",
              invitationUrl: `https://github.com/${owner}/${repo}/invitations`
            }),
          });
        } catch (e) {
          console.error("Error sending email notification (non-critical):", e);
        }
      }
      
      setInviteSuccess(`Invitation sent to GitHub user "${username}" with ${role.name} role`);
      setInviteEmail("");
      // Refresh the collaborators list
      fetchCollaborators();
      
    } catch (err: Error | unknown) { // Fixed 'any' type with more specific types
      console.error("Error inviting collaborator:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to invite collaborator";
      setInviteError(errorMessage);
    } finally {
      setIsInviting(false);
    }
  };

// Function to remove a collaborator
const removeCollaborator = async (username: string) => {
  if (!session?.accessToken) return;
  
  if (!confirm(`Are you sure you want to remove ${username} from this repository?`)) {
    return;
  }
  
  try {
    setIsLoading(true);
    
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/collaborators/${username}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          "User-Agent": "MetaSync-App"
        }
      }
    );
    
    if (!response.ok) {
      throw new Error(`Failed to remove collaborator: ${response.status}`);
    }
    
    // Refresh the collaborators list
    fetchCollaborators();
    
  } catch (err) {
    console.error("Error removing collaborator:", err);
    setError("Failed to remove collaborator. Please try again.");
  } finally {
    setIsLoading(false);
  }
};

  // Redirect if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/signin");
    }
    
    // Set current time
    const now = new Date();
    setCurrentTime(now.toISOString().replace('T', ' ').substring(0, 19));
  }, [status, router]);

  // Get repository details and files
  useEffect(() => {
    const fetchRepositoryData = async () => {
      if (!session?.accessToken || !owner || !repo) return;

      try {
        setIsLoading(true);
        setError(null);

        // Fetch repository details
        const repoResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
          headers:
           {
            Authorization: `Bearer ${session.accessToken}`,
            "User-Agent": "MetaSync-App"
          }
        });

        if (!repoResponse.ok) {
          throw new Error(`Failed to fetch repository: ${repoResponse.status}`);
        }

        const repoData = await repoResponse.json();
        setRepository(repoData);

        // Fetch files in the root directory
        await fetchFiles(owner, repo, "", session.accessToken as string);
        
      } catch (err) {
        console.error("Error fetching repository data:", err);
        setError("Failed to load repository data. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchRepositoryData();
  }, [session, owner, repo]);

  const fetchFiles = async (owner: string, repo: string, path: string, token: string) => {
    try {
      const filesResponse = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/contents/${path}`, 
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "User-Agent": "MetaSync-App"
          }
        }
      );

      if (!filesResponse.ok) {
        throw new Error(`Failed to fetch files: ${filesResponse.status}`);
      }

      const filesData = await filesResponse.json();
      setFiles(Array.isArray(filesData) ? filesData : [filesData]);
      setCurrentPath(path);
      setFileContent(null); // Clear any file content when navigating directories
    } catch (err) {
      console.error("Error fetching files:", err);
      setError("Failed to load repository files. Please try again.");
    }
  };

  const fetchFileContent = async (file: FileItem) => {
    if (!session?.accessToken) return;
    
    try {
      setIsLoading(true);
      
      const contentResponse = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/contents/${file.path}`, 
        {
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
            "User-Agent": "MetaSync-App"
          }
        }
      );

      if (!contentResponse.ok) {
        throw new Error(`Failed to fetch file content: ${contentResponse.status}`);
      }

      const contentData = await contentResponse.json();
      
      // Handle binary files with download_url
      if (!contentData.content && contentData.download_url) {
        setFileContent({
          content: `Binary file: ${contentData.download_url}`,
          name: file.name,
          path: file.path
        });
        return;
      }
      
      // Decode base64 content
      let decodedContent = "";
      if (contentData.encoding === "base64" && contentData.content) {
        decodedContent = atob(contentData.content);
      } else {
        decodedContent = contentData.content || "";
      }
      
      setFileContent({
        content: decodedContent,
        name: file.name,
        path: file.path
      });
      
      // Check if this is a SEO file and parse it
      if (isSEOFile(file.name, file.path)) {
        const parsedSEO = parseSEOContent(decodedContent);
        if (parsedSEO) {
          setSeoData(parsedSEO);
          setSeoFormData(parsedSEO);
        } else {
          setSeoData(null);
        }
      } else {
        setSeoData(null);
      }
      
      // Also set edited content to be the same initially
      setEditedContent(decodedContent);
      
    } catch (err) {
      console.error("Error fetching file content:", err);
      setError("Failed to load file content. This might be a binary file.");
    } finally {
      setIsLoading(false);
    }
  };

  const navigateToPath = (path: string) => {
    if (session?.accessToken) {
      fetchFiles(owner, repo, path, session.accessToken as string);
    }
  };

  const navigateUp = () => {
    if (currentPath === "") return;
    
    const pathParts = currentPath.split('/');
    pathParts.pop();
    const newPath = pathParts.join('/');
    navigateToPath(newPath);
  };
  
  // Handle file click
  const handleFileClick = (file: FileItem) => {
    if (file.type === "dir") {
      navigateToPath(file.path);
    } else {
      fetchFileContent(file);
    }
  };

  // Handle edit mode toggle
  const handleEditClick = () => {
    setIsEditMode(true);
  };
  
  // Handle saving edited content
  const handleSaveContent = async () => {
    if (!session?.accessToken || !fileContent) return;
    
    try {
      setIsLoading(true);
      
      // First, get the file's SHA
      const fileResponse = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/contents/${fileContent.path}`, 
        {
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
            "User-Agent": "MetaSync-App"
          }
        }
      );
      
      if (!fileResponse.ok) {
        throw new Error(`Failed to get file details: ${fileResponse.status}`);
      }
      
      const fileData = await fileResponse.json();
      
      // Create the update payload
      const updateResponse = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/contents/${fileContent.path}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
            "Content-Type": "application/json",
            "User-Agent": "MetaSync-App"
          },
          body: JSON.stringify({
            message: `Update ${fileContent.name} via MetaSync`,
            content: btoa(editedContent), // base64 encode the content
            sha: fileData.sha
          })
        }
      );
      
      if (!updateResponse.ok) {
        const errorData = await updateResponse.text();
        throw new Error(`Failed to update file: ${updateResponse.status} - ${errorData}`);
      }
      
      // Update was successful
      setFileContent({
        ...fileContent,
        content: editedContent
      });
      setIsEditMode(false);
      
    } catch (err) {
      console.error("Error updating file:", err);
      setError("Failed to save file. Please check your permissions or file status.");
    } finally {
      setIsLoading(false);
    }
  };
  
  // Cancel editing
  const handleCancelEdit = () => {
    setIsEditMode(false);
    // Reset edited content to original
    if (fileContent) {
      setEditedContent(fileContent.content);
    }
  };

  // Function to save SEO data
const handleSaveSEOContent = async () => {
  if (!session?.accessToken || !fileContent) return;
  
  try {
    setIsLoading(true);
    
    // Convert form data back to JSON
    const jsonContent = JSON.stringify(seoFormData, null, 2);
    
    // First, get the file's SHA
    const fileResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${fileContent.path}`, 
      {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          "User-Agent": "MetaSync-App"
        }
      }
    );
    
    if (!fileResponse.ok) {
      throw new Error(`Failed to get file details: ${fileResponse.status}`);
    }
    
    const fileData = await fileResponse.json();
    
    // Create the update payload
    const updateResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${fileContent.path}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          "Content-Type": "application/json",
          "User-Agent": "MetaSync-App"
        },
        body: JSON.stringify({
          message: `Update SEO content via MetaSync`,
          content: btoa(jsonContent), // base64 encode the content
          sha: fileData.sha
        })
      }
    );
    
    if (!updateResponse.ok) {
      const errorData = await updateResponse.text();
      throw new Error(`Failed to update file: ${updateResponse.status} - ${errorData}`);
    }
    
    // Update was successful
    setFileContent({
      ...fileContent,
      content: jsonContent
    });
    setSeoData(seoFormData);
    setIsEditingSEO(false);
    
  } catch (err) {
    console.error("Error updating SEO file:", err);
    setError("Failed to save SEO content. Please check your permissions or file status.");
  } finally {
    setIsLoading(false);
  }
};

  // Function to create a new file
  const handleCreateFile = async () => {
    if (!session?.accessToken || !newFileName.trim()) {
      setCreateFileError("Please enter a valid file name");
      return;
    }
    
    setIsCreatingFile(true);
    setCreateFileError(null);
    
    try {
      // Construct the full file path
      const filePath = currentPath ? `${currentPath}/${newFileName.trim()}` : newFileName.trim();
      
      // Check if file already exists
      try {
        const existingFileResponse = await fetch(
          `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`,
          {
            headers: {
              Authorization: `Bearer ${session.accessToken}`,
              "User-Agent": "MetaSync-App"
            }
          }
        );
        
        if (existingFileResponse.ok) {
          setCreateFileError("A file with this name already exists in this location");
          setIsCreatingFile(false);
          return;
        }
      } catch (err) {
        // File doesn't exist, which is what we want
      }
      
      // Create the file
      const createResponse = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
            "Content-Type": "application/json",
            "User-Agent": "MetaSync-App"
          },
          body: JSON.stringify({
            message: `Create ${newFileName.trim()} via MetaSync`,
            content: btoa(newFileContent), // base64 encode the content
            branch: repository?.default_branch || "main"
          })
        }
      );
      
      if (!createResponse.ok) {
        const errorData = await createResponse.json();
        throw new Error(`Failed to create file: ${errorData.message || createResponse.statusText}`);
      }
      
      // File created successfully
      setShowCreateFile(false);
      setNewFileName("");
      setNewFileContent("");
      
      // Refresh the file list
      if (session.accessToken) {
        await fetchFiles(owner, repo, currentPath, session.accessToken);
      }
      
    } catch (err) {
      console.error("Error creating file:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to create file";
      setCreateFileError(errorMessage);
    } finally {
      setIsCreatingFile(false);
    }
  };

  // Function to cancel file creation
  const handleCancelCreateFile = () => {
    setShowCreateFile(false);
    setNewFileName("");
    setNewFileContent("");
    setCreateFileError(null);
  };

  const getFileIcon = (file: FileItem) => {
    if (file.type === "dir") {
      return (
        <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
        </svg>
      );
    }
    
    // File icons based on extension
    const ext = file.name.split('.').pop()?.toLowerCase();
    
    switch(ext) {
      case 'md':
        return <svg className="w-5 h-5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>;
      case 'json':
      case 'js':
      case 'ts':
      case 'jsx':
      case 'tsx':
        return <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
        </svg>;
      default:
        return <svg className="w-5 h-5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>;
    }
  };

  // Determine if a file is likely text-based by extension
  const isTextFile = (filename: string) => {
    const textExtensions = [
      'txt', 'md', 'js', 'jsx', 'ts', 'tsx', 'json', 'html', 'css', 'scss',
      'yml', 'yaml', 'xml', 'svg', 'py', 'rb', 'php', 'java', 'c', 'cpp', 'h',
      'go', 'rs', 'sh', 'bat', 'ps1', 'config', 'conf', 'ini', 'env', 'gitignore'
    ];
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    return textExtensions.includes(ext);
  };

  // Add this function to detect if file is seo.json
const isSEOFile = (filename: string, path: string) => {
  return filename.endsWith(".seo.json") || path.endsWith(".seo.json");
};

// Update the SEO content parser to accept any JSON structure
const parseSEOContent = (content: string): SEOData | null => {
  try {
    const parsed = JSON.parse(content);
    // Accept any valid JSON object
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as SEOData;
    }
    return null;
  } catch {
    return null;
  }
};

  // Add helper functions for dynamic form rendering
  const getFieldType = (key: string, value: any): 'text' | 'textarea' | 'number' | 'boolean' => {
    if (typeof value === 'boolean') return 'boolean';
    if (typeof value === 'number') return 'number';
    if (typeof value === 'string') {
      if (key.includes('description') || key.includes('content') || value.length > 100) {
        return 'textarea';
      }
    }
    return 'text';
  };

  const renderFormField = (key: string, value: any, onChange: (key: string, newValue: any) => void) => {
    const fieldType = getFieldType(key, value);
    const displayName = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

    switch (fieldType) {
      case 'boolean':
        return (
          <div key={key}>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              {displayName}
            </label>
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={Boolean(value)}
                onChange={(e) => onChange(key, e.target.checked)}
                className="w-4 h-4 text-purple-600 bg-neutral-800 border-neutral-700 rounded focus:ring-purple-500 focus:ring-2"
              />
              <span className="ml-2 text-sm text-neutral-400">
                {Boolean(value) ? 'Enabled' : 'Disabled'}
              </span>
            </div>
          </div>
        );
      
      case 'number':
        return (
          <div key={key}>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              {displayName}
            </label>
            <input
              type="number"
              value={String(value || '')}
              onChange={(e) => onChange(key, parseFloat(e.target.value) || 0)}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
          </div>
        );
      
      case 'textarea':
        return (
          <div key={key}>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              {displayName}
            </label>
            <textarea
              value={String(value || '')}
              onChange={(e) => onChange(key, e.target.value)}
              rows={3}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-purple-500 resize-y"
              placeholder={`Enter ${displayName.toLowerCase()}`}
            />
          </div>
        );
      
      default:
        return (
          <div key={key}>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              {displayName}
            </label>
            <input
              type="text"
              value={String(value || '')}
              onChange={(e) => onChange(key, e.target.value)}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
              placeholder={`Enter ${displayName.toLowerCase()}`}
            />
          </div>
        );
    }
  };

  const handleSeoFormChange = (key: string, value: any) => {
    setSeoFormData(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const addNewField = () => {
    const fieldName = prompt('Enter field name:');
    if (fieldName && fieldName.trim()) {
      const cleanFieldName = fieldName.trim().replace(/\s+/g, '_').toLowerCase();
      handleSeoFormChange(cleanFieldName, '');
    }
  };

  const removeField = (key: string) => {
    if (confirm(`Remove field "${key}"?`)) {
      const newData = { ...seoFormData };
      delete newData[key];
      setSeoFormData(newData);
    }
  };

  // Fix the loading state to use isLoading from the component
  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center">
        <div className="animate-pulse text-neutral-400">Loading repository data...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-7 h-16 border-b border-neutral-800">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="text-2xl font-bold text-white">
            MetaSync
          </Link>
          {repository && (
            <div className="hidden md:flex items-center text-neutral-400">
              <span>/</span>
              <span className="ml-2 text-white">{owner}</span>
              <span className="mx-1">/</span>
              <span className="text-white">{repo}</span>
            </div>
          )}
        </div>
        <div className="text-neutral-400 text-sm">
          <div>Current Date and Time (UTC): {currentTime}</div>
          <div>Current User: {session?.user?.name || "Unknown"}</div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-6 max-w-7xl">
        {/* Error message */}
        {error && (
          <div className="bg-red-900/30 border border-red-800 text-red-200 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {/* Repository info */}
        {repository && (
          <>
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-4">
                <Link href="/dashboard" className="text-neutral-400 hover:text-white">
                  Dashboard
                </Link>
                <span className="text-neutral-600">/</span>
                <div className="flex items-center">
                  <div className="w-5 h-5 rounded-full overflow-hidden mr-2">
                    <Image 
                      src={repository.owner.avatar_url}
                      alt={repository.owner.login}
                      width={20}
                      height={20}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <Link href={`/repository/${owner}`} className="text-neutral-400 hover:text-white">
                    {owner}
                  </Link>
                </div>
                <span className="text-neutral-600">/</span>
                <span className="text-white font-medium">{repo}</span>
              </div>

              <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6 mb-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h1 className="text-2xl font-bold text-white mb-2">{repository.name}</h1>
                    {repository.description && (
                      <p className="text-neutral-400 mb-3">{repository.description}</p>
                    )}
                    
                    <div className="flex flex-wrap gap-2 mb-4">
                      {repository.topics && repository.topics.map(topic => (
                        <span key={topic} className="bg-blue-900/30 text-blue-300 text-xs px-2 py-1 rounded">
                          {topic}
                        </span>
                      ))}
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-neutral-400">
                      {repository.language && (
                        <div className="flex items-center">
                          <span className="w-3 h-3 rounded-full bg-blue-400 mr-2"></span>
                          {repository.language}
                        </div>
                      )}
                      
                      <div className="flex items-center">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                        </svg>
                        {repository.stargazers_count}
                      </div>
                      
                      <div className="flex items-center">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                        </svg>
                        {repository.forks_count}
                      </div>
                      
                      <div>
                        Created: {formatDate(repository.created_at)}
                      </div>
                      
                      <div>
                        Updated: {formatDate(repository.updated_at)}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <a 
                      href={repository.html_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-neutral-800 hover:bg-neutral-700 text-white px-4 py-2 rounded flex items-center"
                    >
                      <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                      </svg>
                      View on GitHub
                    </a>
                        <button 
      onClick={() => setShowSettings(true)} 
      className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded flex items-center"
    >
      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
      Settings
    </button>
                    
                  </div>
                </div>
              </div>
            </div>

            {/* File viewer */}
            {fileContent ? (
              <div className="bg-neutral-900 border border-neutral-800 rounded-lg mb-6">
                <div className="border-b border-neutral-800 p-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => {
                        setFileContent(null);
                        setIsEditMode(false);
                        setIsEditingSEO(false);
                        setSeoData(null);
                      }}
                      className="text-neutral-400 hover:text-white p-1 rounded"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    
                    <div className="bg-neutral-800 text-neutral-300 px-3 py-1.5 rounded text-sm">
                      <code>
                        {fileContent.path}
                      </code>
                    </div>
                    
                    {seoData && (
                      <span className="bg-purple-600 text-white px-2 py-1 rounded text-xs font-medium">
                        SEO File
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {seoData && !isEditingSEO && (
                      <button 
                        onClick={() => setIsEditingSEO(true)}
                        className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded text-sm"
                      >
                        Edit SEO Content
                      </button>
                    )}
                    
                    {isEditingSEO && (
                      <>
                        <button 
                          onClick={handleSaveSEOContent}
                          className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm"
                        >
                          Save SEO Changes
                        </button>
                        <button 
                          onClick={() => {
                            setIsEditingSEO(false);
                            setSeoFormData(seoData!);
                          }}
                          className="bg-neutral-700 hover:bg-neutral-600 text-white px-3 py-1 rounded text-sm"
                        >
                          Cancel
                        </button>
                      </>
                    )}
                    
                    {isEditMode && !seoData && (
                      <>
                        <button 
                          onClick={handleSaveContent}
                          className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm"
                        >
                          Save Changes
                        </button>
                        <button 
                          onClick={handleCancelEdit}
                          className="bg-neutral-700 hover:bg-neutral-600 text-white px-3 py-1 rounded text-sm"
                        >
                          Cancel
                        </button>
                      </>
                    )}
                    
                    {!isEditMode && !isEditingSEO && isTextFile(fileContent.name) && !seoData && (
                      <button 
                        onClick={handleEditClick}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm"
                      >
                        Edit Content
                      </button>
                    )}
                  </div>
                </div>
                
                <div className="p-6">
                  {seoData && isEditingSEO ? (
                    /* Dynamic SEO Form Editor */
                    <div className="space-y-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-medium text-white">Edit SEO Content</h3>
                        <button
                          onClick={addNewField}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm flex items-center gap-1"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                          Add Field
                        </button>
                      </div>
                      
                      {Object.entries(seoFormData).map(([key, value]) => (
                        <div key={key} className="relative">
                          {renderFormField(key, value, handleSeoFormChange)}
                          <button
                            onClick={() => removeField(key)}
                            className="absolute top-0 right-0 p-1 text-neutral-400 hover:text-red-400"
                            title={`Remove ${key} field`}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ))}
                      
                      {Object.keys(seoFormData).length === 0 && (
                        <div className="text-center py-8 text-neutral-400">
                          <p>No fields found. Click "Add Field" to get started.</p>
                        </div>
                      )}
                    </div>
                  ) : seoData ? (
                    /* Dynamic SEO Content Preview */
                    <div className="space-y-6">
                      <div className="bg-gradient-to-r from-purple-600/20 to-blue-600/20 border border-purple-500/30 rounded-lg p-4 mb-4">
                        <h3 className="text-lg font-medium text-white mb-2">SEO Content Preview</h3>
                        <p className="text-neutral-300 text-sm">This file contains SEO metadata for your website. Use the "Edit SEO Content" button to make changes safely.</p>
                      </div>
                      
                      <div className="grid gap-4">
                        {Object.entries(seoData).map(([key, value]) => (
                          <div key={key}>
                            <label className="block text-sm font-medium text-purple-300 mb-1">
                              {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </label>
                            <div className="bg-neutral-800 rounded-lg px-3 py-2 text-white">
                              {typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value || '')}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : isEditMode ? (
                    /* Regular text editor */
                    <textarea 
                      value={editedContent} 
                      onChange={(e) => setEditedContent(e.target.value)}
                      className="w-full h-96 bg-[#1e1e1e] text-white font-mono p-3 rounded border border-neutral-700 resize-y"
                    />
                  ) : (
                    /* Regular file preview */
                    <pre className="text-neutral-300 font-mono text-sm p-4 overflow-auto bg-[#1e1e1e] rounded whitespace-pre-wrap">
                      {fileContent.content}
                    </pre>
                  )}
                </div>
              </div>
            ) : (
              /* File browser */
              <div className="bg-neutral-900 border border-neutral-800 rounded-lg">
                <div className="border-b border-neutral-800 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {currentPath !== "" && (
                        <button 
                          onClick={navigateUp}
                          className="text-neutral-400 hover:text-white p-1 rounded"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                          </svg>
                        </button>
                      )}
                      
                      <div className="bg-neutral-800 text-neutral-300 px-3 py-1.5 rounded text-sm">
                        <code>
                          {owner}/{repo}/{currentPath || ''}
                        </code>
                      </div>
                      
                      <div className="text-neutral-500 text-sm">
                        Branch: <span className="text-neutral-300">{repository.default_branch}</span>
                      </div>
                    </div>
                    
                    {/* Create File Button */}
                    <button
                      onClick={() => setShowCreateFile(true)}
                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded flex items-center gap-2 text-sm"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Create File
                    </button>
                  </div>
                </div>
                
                <div className="divide-y divide-neutral-800">
                  {files.length > 0 ? (
                    files.sort((a, b) => {
                      // Sort directories first, then files
                      if (a.type === 'dir' && b.type !== 'dir') return -1;
                      if (a.type !== 'dir' && b.type === 'dir') return 1;
                      // Sort alphabetically by name
                      return a.name.localeCompare(b.name);
                    }).map((file) => (
                      <div 
                        key={file.sha}
                        className="p-3 hover:bg-neutral-800/50 cursor-pointer"
                        onClick={() => handleFileClick(file)}
                      >
                        <div className="flex items-center">
                          <div className="w-7 flex justify-center mr-3">
                            {getFileIcon(file)}
                          </div>
                          <div className="text-neutral-200">
                            {file.name}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-16 text-center text-neutral-400">
                      This folder is empty
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Create File Modal */}
      {showCreateFile && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between border-b border-neutral-800 p-4">
              <h2 className="text-xl font-semibold text-white">Create New File</h2>
              <button 
                onClick={handleCancelCreateFile}
                className="text-neutral-400 hover:text-white"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                  File Name
                </label>
                <input
                  type="text"
                  value={newFileName}
                  onChange={(e) => setNewFileName(e.target.value)}
                  placeholder="example.txt"
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                />
                <p className="text-xs text-neutral-400 mt-1">
                  File will be created in: {currentPath ? `${owner}/${repo}/${currentPath}/` : `${owner}/${repo}/`}
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                  File Content
                </label>
                <textarea
                  value={newFileContent}
                  onChange={(e) => setNewFileContent(e.target.value)}
                  placeholder="Enter your file content here..."
                  rows={12}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-green-500 font-mono text-sm resize-y"
                />
              </div>
              
              {createFileError && (
                <div className="bg-red-900/30 border border-red-800 text-red-200 px-4 py-3 rounded">
                  {createFileError}
                </div>
              )}
              
              <div className="flex items-center justify-end gap-3 pt-4">
                <button
                  onClick={handleCancelCreateFile}
                  className="px-4 py-2 text-neutral-300 hover:text-white border border-neutral-700 rounded-lg hover:bg-neutral-800 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateFile}
                  disabled={isCreatingFile || !newFileName.trim()}
                  className={`px-4 py-2 rounded-lg font-medium transition ${
                    isCreatingFile || !newFileName.trim()
                      ? "bg-neutral-700 text-neutral-400 cursor-not-allowed"
                      : "bg-green-600 hover:bg-green-700 text-white"
                  }`}
                >
                  {isCreatingFile ? "Creating..." : "Create File"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
{showSettings && (
  <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
    <div className="bg-neutral-900 border border-neutral-800 rounded-lg w-full max-w-3xl max-h-[90vh] overflow-auto">
      <div className="flex items-center justify-between border-b border-neutral-800 p-4">
        <h2 className="text-xl font-semibold text-white">Repository Settings</h2>
        <button 
          onClick={() => setShowSettings(false)}
          className="text-neutral-400 hover:text-white"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      {/* Tabs */}
      <div className="flex border-b border-neutral-800">
        <button 
          onClick={() => setActiveTab("collaborators")}
          className={`px-4 py-3 font-medium ${activeTab === "collaborators" 
            ? "text-white border-b-2 border-blue-500" 
            : "text-neutral-400 hover:text-white"}`}
        >
          Collaborators
        </button>
        <button 
          onClick={() => setActiveTab("general")}
          className={`px-4 py-3 font-medium ${activeTab === "general" 
            ? "text-white border-b-2 border-blue-500" 
            : "text-neutral-400 hover:text-white"}`}
        >
          General Settings
        </button>
      </div>
      
      {/* Tab Content */}
      <div className="p-6">
        {activeTab === "collaborators" && (
          <>
            <div className="mb-8">
              <h3 className="text-lg font-medium text-white mb-4">Invite a Collaborator</h3>
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-neutral-300 mb-1">
                    GitHub Username
                  </label>
                  <input
                    type="text"
                    id="email"
                    placeholder="GitHub Username"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label htmlFor="role" className="block text-sm font-medium text-neutral-300 mb-1">
                    Role
                  </label>
                  <select
                    id="role"
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    {customRoles.map(role => (
                      <option key={role.id} value={role.id}>
                        {role.name} - {role.description}
                      </option>
                    ))}
                  </select>
                </div>
                
                {inviteSuccess && (
                  <div className="bg-green-900/30 border border-green-800 text-green-200 px-4 py-3 rounded">
                    {inviteSuccess}
                  </div>
                )}
                
                {inviteError && (
                  <div className="bg-red-900/30 border border-red-800 text-red-200 px-4 py-3 rounded">
                    {inviteError}
                  </div>
                )}
                
                <div className="pt-2">
                  <button
                    onClick={inviteCollaborator}
                    disabled={isInviting || !inviteEmail}
                    className={`px-4 py-2 rounded font-medium ${
                      isInviting || !inviteEmail
                        ? "bg-neutral-700 text-neutral-300 cursor-not-allowed"
                        : "bg-blue-600 hover:bg-blue-700 text-white"
                    }`}
                  >
                    {isInviting ? "Sending Invitation..." : "Send Invitation"}
                  </button>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-medium text-white mb-4">Current Collaborators</h3>
              
              {isLoading ? (
                <div className="text-center py-8">
                  <div className="animate-pulse text-neutral-400">Loading collaborators...</div>
                </div>
              ) : collaborators.length > 0 ? (
                <div className="space-y-3">

                    {collaborators.map(collab => {
                    const customRole = customRoles.find(r => {
                        if (collab.permissions.admin) return r.id === "full";
                        if (collab.permissions.push) return r.id === "content" || r.id === "seo";
                        return r.id === "reviewer";
                    });
                    
                    // Check if this collaborator is the repository owner
                    const isRepoOwner = collab.login === owner;
                    
                    return (
                        <div key={collab.id} className="bg-neutral-800 rounded-lg p-4 flex items-center justify-between">
                        <div className="flex items-center">
                            <div className="w-10 h-10 rounded-full overflow-hidden mr-4">
                            <Image
                                src={collab.avatar_url}
                                alt={collab.login}
                                width={40}
                                height={40}
                                className="w-full h-full object-cover"
                            />
                            </div>
                            <div>
                            <div className="font-medium text-white">
                                {collab.login}
                                {isRepoOwner && <span className="ml-2 text-xs bg-purple-700 text-purple-100 px-2 py-0.5 rounded">Owner</span>}
                            </div>
                            <div className="text-sm text-neutral-400">
                                {isRepoOwner ? "Repository Owner" : (customRole ? customRole.name : "Collaborator")}
                            </div>
                            </div>
                        </div>
                        
                        <div className="flex items-center">
                            {isRepoOwner ? (
                            // For the owner, show a disabled dropdown set to "Full Access"
                            <select
                                disabled
                                className="mr-3 bg-neutral-700 border border-neutral-600 rounded px-2 py-1 text-sm text-white opacity-70 cursor-not-allowed"
                            >
                                <option value="full">Full Access</option>
                            </select>
                            ) : (
                            // For other collaborators, show the editable role dropdown
                            <select
                                value={collab.custom_role || "reviewer"}
                                onChange={async (e) => {
                                const newRole = e.target.value;
                                const githubRole = customRoles.find(r => r.id === newRole)?.githubRole || "pull";
                                
                                try {
                                    const response = await fetch(
                                    `https://api.github.com/repos/${owner}/${repo}/collaborators/${collab.login}`,
                                    {
                                        method: "PUT",
                                        headers: {
                                        Authorization: `Bearer ${session?.accessToken}`,
                                        "Content-Type": "application/json",
                                        "User-Agent": "MetaSync-App"
                                        },
                                        body: JSON.stringify({
                                        permission: githubRole
                                        })
                                    }
                                    );
                                    
                                    if (response.ok) {
                                    fetchCollaborators(); // Refresh the list
                                    }
                                } catch (err) {
                                    console.error("Error updating permission:", err);
                                }
                                }}
                                className="mr-3 bg-neutral-700 border border-neutral-600 rounded px-2 py-1 text-sm text-white"
                            >
                                {customRoles.map(role => (
                                <option key={role.id} value={role.id}>
                                    {role.name}
                                </option>
                                ))}
                            </select>
                            )}
                            
                            {/* Only show remove button for non-owners */}
                            {!isRepoOwner && (
                            <button
                                onClick={() => removeCollaborator(collab.login)}
                                className="p-1 text-neutral-400 hover:text-red-400"
                                title="Remove collaborator"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            </button>
                            )}
                        </div>
                        </div>
                    );
                    })}
                </div>
              ) : (
                <div className="text-center py-8 text-neutral-400">
                  No collaborators found for this repository.
                </div>
              )}
            </div>
          </>
        )}
        
        {activeTab === "general" && (
          <div className="text-neutral-300">
            <h3 className="text-lg font-medium text-white mb-4">General Repository Settings</h3>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-1">
                  Repository Visibility
                </label>
                <div className="text-white mb-2">{repository?.private ? "Private" : "Public"}</div>
                <p className="text-sm text-neutral-400">
                  To change repository visibility, please visit GitHub repository settings.
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-1">
                  Default Branch
                </label>
                <div className="text-white">{repository?.default_branch}</div>
              </div>
              
              {/* Future setting options could go here */}
            </div>
          </div>
        )}
      </div>
    </div>
  </div>
)}

    </div>
  );
}