"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";
import { 
  createBranch, 
  createOrUpdateFileInBranch, 
  createPullRequest, 
  mergePullRequest, 
  branchExists 
} from "@/lib/githubApp";

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
  [key: string]: any; // Make it flexible to handle any JSON structure
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
  // Enhanced error states
  const [error, setError] = useState<string | null>(null);
  const [errorType, setErrorType] = useState<"general" | "permission" | "validation" | "network" | null>(null);
  const [validationErrors, setValidationErrors] = useState<{ [key: string]: string }>({});
  const [currentPath, setCurrentPath] = useState("");
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
  const [seoFormData, setSeoFormData] = useState<SEOData>({
    meta_title: "",
    meta_description: "",
    meta_keywords: "",
    h1: "",
    h2: "",
    "content-main": ""
  });

  // Create file states
  const [showCreateFile, setShowCreateFile] = useState(false);
  const [newFileName, setNewFileName] = useState("");
  const [newFileContent, setNewFileContent] = useState("");
  const [isCreatingFile, setIsCreatingFile] = useState(false);
  const [createFileError, setCreateFileError] = useState<string | null>(null);
  const [showCreateFileMenu, setShowCreateFileMenu] = useState(false);
  const [createFileType, setCreateFileType] = useState<"custom" | "seo" | "readme">("custom");

  // SEO creation states
  const [showCreateSEO, setShowCreateSEO] = useState(false);
  const [newSEOData, setNewSEOData] = useState<SEOData>({
    meta_title: "",
    meta_description: "",
    meta_keywords: "",
    h1: "",
    h2: "",
    "content-main": ""
  });

  // Add field states for SEO editor
  const [showAddFieldMenu, setShowAddFieldMenu] = useState(false);
  const [showCustomFieldDialog, setShowCustomFieldDialog] = useState(false);
  const [customFieldName, setCustomFieldName] = useState("");
  const [customFieldType, setCustomFieldType] = useState<"text" | "textarea" | "array" | "object">("text");

  // Add drag and drop states
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

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

// (Moved below fetchCollaborators declaration)

// Update the main useEffect for authentication
useEffect(() => {
  if (status === "unauthenticated") {
    router.push("/signin");
    return;
  }
}, [status, router, session]);

  // Enhanced error handling function
  const handleError = (err: any, context: string = "") => {
    console.error(`Error in ${context}:`, err);
    
    let errorMessage = "An unexpected error occurred.";
    let type: "general" | "permission" | "validation" | "network" = "general";
    
    if (err instanceof Response || (err && err.status)) {
      const status = err.status || (err instanceof Response ? err.status : 500);
      
      switch (status) {
        case 401:
          errorMessage = "Your session has expired. Please sign in again.";
          type = "permission";
          break;
        case 403:
          if (context.includes("collaborator")) {
            errorMessage = "You don't have permission to manage collaborators for this repository. Only repository owners and admins can invite or remove collaborators.";
          } else if (context.includes("file")) {
            errorMessage = "You don't have permission to edit files in this repository. Contact the repository owner to request write access.";
          } else {
            errorMessage = "You don't have permission to perform this action. Contact the repository owner for access.";
          }
          type = "permission";
          break;
        case 404:
          if (context.includes("user")) {
            errorMessage = "GitHub user not found. Please verify the username is correct and the user exists on GitHub.";
          } else if (context.includes("repository")) {
            errorMessage = "Repository not found. It may be private, deleted, or the URL is incorrect.";
          } else if (context.includes("file")) {
            errorMessage = "File not found. It may have been deleted or moved.";
          } else {
            errorMessage = "The requested resource was not found.";
          }
          type = "general";
          break;
        case 409:
          errorMessage = "A conflict occurred. The file may have been modified by someone else. Please refresh and try again.";
          type = "validation";
          break;
        case 422:
          errorMessage = "Invalid data provided. Please check your input and try again.";
          type = "validation";
          break;
        case 500:
        case 502:
        case 503:
          errorMessage = "GitHub services are temporarily unavailable. Please try again in a few minutes.";
          type = "network";
          break;
        default:
          errorMessage = `Request failed with status ${status}. Please try again.`;
          type = "general";
      }
    } else if (err && err.message) {
      errorMessage = err.message;
      
      // Detect specific error types from message content
      if (err.message.includes("permission") || err.message.includes("access")) {
        type = "permission";
      } else if (err.message.includes("validation") || err.message.includes("invalid")) {
        type = "validation";
      } else if (err.message.includes("network") || err.message.includes("fetch")) {
        type = "network";
      }
    }
    
    setError(errorMessage);
    setErrorType(type);
  };

  // Clear errors function
  const clearError = () => {
    setError(null);
    setErrorType(null);
    setValidationErrors({});
  };

  // Validation functions
  const validateFileName = (filename: string): string | null => {
    if (!filename.trim()) {
      return "File name is required";
    }
    if (filename.includes('/') || filename.includes('\\')) {
      return "File name cannot contain forward slashes or backslashes";
    }
    if (filename.startsWith('.') && filename !== '.gitignore' && !filename.endsWith('.seo.json')) {
      return "Hidden files (starting with .) are not recommended";
    }
    if (filename.length > 255) {
      return "File name is too long (maximum 255 characters)";
    }
    if (!/^[a-zA-Z0-9._-]+$/.test(filename)) {
      return "File name contains invalid characters. Use only letters, numbers, dots, hyphens, and underscores";
    }
    return null;
  };

  const validateSEOJson = (content: string): string | null => {
    try {
      const parsed = JSON.parse(content);
      if (typeof parsed !== 'object' || Array.isArray(parsed)) {
        return "SEO files must contain a JSON object";
      }
      return null;
    } catch (e) {
      return "Invalid JSON format. Please check your syntax";
    }
  };

  const validateGitHubUsername = (username: string): string | null => {
    if (!username.trim()) {
      return "Username is required";
    }
    if (username.includes('@')) {
      return "Please enter a GitHub username, not an email address";
    }
    if (!/^[a-zA-Z0-9]([a-zA-Z0-9-]){0,38}$/.test(username)) {
      return "Invalid GitHub username format";
    }
    return null;
  };

  // Fetch collaborators with improved error handling
  const fetchCollaborators = useCallback(async () => {
    if (!session?.accessToken) return;

    try {
      setIsLoading(true);

      const response = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/collaborators`,
        {
          headers: {
            Authorization: `Bearer ${session?.accessToken ?? ""}`,
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
      handleError(err, "fetch collaborators");
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

  // Redirect if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/signin");
    }
  }, [status, router]);

  const inviteCollaborator = async () => {
    if (!session?.accessToken || !inviteEmail) return;
    
    // Clear previous errors
    clearError();
    setInviteSuccess(null);
    setInviteError(null);
    
    // Validate username
    const usernameError = validateGitHubUsername(inviteEmail);
    if (usernameError) {
      setInviteError(usernameError);
      return;
    }
    
    setIsInviting(true);
    
    try {
      const role = customRoles.find(r => r.id === inviteRole);
      if (!role) throw new Error("Invalid role selected");
      
      const username = inviteEmail.trim();
      
      const addResponse = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/collaborators/${username}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${session?.accessToken ?? ""}`,
            "Content-Type": "application/json",
            "User-Agent": "MetaSync-App"
          },
          body: JSON.stringify({
            permission: role.githubRole
          })
        }
      );
      
      if (!addResponse.ok) {
        handleError(addResponse, "collaborator invitation");
        return;
      }
      
      setInviteSuccess(`Successfully invited ${username} with ${role.name} role`);
      setInviteEmail("");
      fetchCollaborators();
      
    } catch (err) {
      handleError(err, "collaborator invitation");
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
          Authorization: `Bearer ${session?.accessToken ?? ""}`,
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

  // Function to save SEO data using branching workflow
const handleSaveSEOContent = async () => {
  if (!session?.accessToken || !fileContent || !repository) return;
  
  clearError();
  
  try {
    setIsLoading(true);
    
    const jsonContent = JSON.stringify(seoFormData, null, 2);
    
    // Validate JSON before saving
    const validationError = validateSEOJson(jsonContent);
    if (validationError) {
      handleError(new Error(validationError), "SEO validation");
      return;
    }
    
    // Create a unique branch name for this SEO update
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const branchName = `seo-update-${timestamp}`;
    const defaultBranch = repository.default_branch || "main";
    
    // Step 1: Create a new branch
    console.log(`Creating branch: ${branchName}`);
    await createBranch(session.accessToken, owner, repo, branchName, defaultBranch);
    
    // Step 2: Get current file SHA from the default branch
    const fileResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${fileContent.path}?ref=${defaultBranch}`, 
      {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          "User-Agent": "MetaSync-App"
        }
      }
    );
    
    if (!fileResponse.ok) {
      throw new Error(`Failed to get file information: ${fileResponse.statusText}`);
    }
    
    const fileData = await fileResponse.json();
    
    // Step 3: Commit changes to the new branch
    console.log(`Committing SEO changes to branch: ${branchName}`);
    await createOrUpdateFileInBranch(
      session.accessToken,
      owner,
      repo,
      fileContent.path,
      jsonContent,
      `Update SEO content for ${fileContent.name} via MetaSync`,
      branchName,
      fileData.sha
    );
    
    // Step 4: Create pull request
    console.log(`Creating pull request from ${branchName} to ${defaultBranch}`);
    const pullRequest = await createPullRequest(
      session.accessToken,
      owner,
      repo,
      `SEO Update: ${fileContent.name}`,
      branchName,
      defaultBranch,
      `Automated SEO content update for ${fileContent.name} via MetaSync.\n\nThis pull request contains updates to SEO metadata fields.`
    );
    
    // Step 5: Auto-merge the pull request (if user has merge permissions)
    try {
      console.log(`Auto-merging pull request #${pullRequest.number}`);
      await mergePullRequest(session.accessToken, owner, repo, pullRequest.number, "squash");
      console.log("SEO changes successfully merged!");
    } catch (mergeError) {
      console.warn("Auto-merge failed, but pull request was created:", mergeError);
      // Even if auto-merge fails, we should show success since the PR was created
      setError(`SEO changes submitted successfully! Pull request #${pullRequest.number} created but requires manual merge.`);
    }
    
    // Success - update local state
    setFileContent({
      ...fileContent,
      content: jsonContent
    });
    setSeoData(seoFormData);
    setIsEditingSEO(false);
    
    // Refresh the file list to show any changes
    if (session.accessToken) {
      await fetchFiles(owner, repo, currentPath, session.accessToken);
    }
    
  } catch (err) {
    console.error("Error in SEO branching workflow:", err);
    handleError(err, "SEO content save");
  } finally {
    setIsLoading(false);
  }
};

  // Function to create a new file
  const handleCreateFile = async () => {
    if (!session?.accessToken) return;
    
    // Clear previous errors
    setCreateFileError(null);
    setValidationErrors({});
    
    // Validate file name
    const fileNameError = validateFileName(newFileName);
    if (fileNameError) {
      setCreateFileError(fileNameError);
      return;
    }
    
    // Validate SEO JSON if it's an SEO file
    if (newFileName.endsWith('.seo.json')) {
      const jsonError = validateSEOJson(newFileContent);
      if (jsonError) {
        setCreateFileError(`SEO file validation error: ${jsonError}`);
        return;
      }
    }
    
    setIsCreatingFile(true);
    
    try {
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
          setCreateFileError(`A file named "${newFileName}" already exists in this location. Please choose a different name.`);
          return;
        }
      } catch (err) {
        // File doesn't exist, which is what we want
      }
      
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
            content: btoa(newFileContent),
            branch: repository?.default_branch || "main"
          })
        }
      );
      
      if (!createResponse.ok) {
        handleError(createResponse, "file creation");
        return;
      }
      
      // Success
      setShowCreateFile(false);
      setNewFileName("");
      setNewFileContent("");
      
      if (session.accessToken) {
        await fetchFiles(owner, repo, currentPath, session.accessToken);
      }
      
    } catch (err) {
      handleError(err, "file creation");
    } finally {
      setIsCreatingFile(false);
    }
  };

  // Function to handle file preset selection
  const handleFilePresetSelect = (type: "custom" | "seo" | "readme") => {
    setCreateFileType(type);
    setShowCreateFileMenu(false);
    
    if (type === "seo") {
      // Show the specialized SEO creation modal instead
      setShowCreateSEO(true);
      return;
    } else if (type === "readme") {
      setNewFileName("README.md");
      setNewFileContent(`# ${repository?.name || "Project Name"}

## Description
Brief description of your project.

## Installation
\`\`\`bash
# Installation commands
\`\`\`

## Usage
How to use your project.

## Contributing
Guidelines for contributing to your project.

## License
Your project license.
`);
    }
    
    setShowCreateFile(true);
  };

  // Function to handle SEO file creation
  const handleCreateSEOFile = async () => {
    if (!session?.accessToken || !repository) return;
    
    // Clear previous errors
    setCreateFileError(null);
    
    // Validate SEO file name
    const fileName = newFileName || "seo.json";
    const fileNameError = validateFileName(fileName);
    if (fileNameError) {
      setCreateFileError(fileNameError);
      return;
    }
    
    // Ensure it ends with .seo.json
    const finalFileName = fileName.endsWith('.seo.json') ? fileName : 
                         fileName.endsWith('.json') ? fileName.replace('.json', '.seo.json') :
                         `${fileName}.seo.json`;
    
    setIsCreatingFile(true);
    
    try {
      const filePath = currentPath ? `${currentPath}/${finalFileName}` : finalFileName;
      const defaultBranch = repository.default_branch || "main";
      
      // Check if file already exists
      try {
        const existingFileResponse = await fetch(
          `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}?ref=${defaultBranch}`,
          {
            headers: {
              Authorization: `Bearer ${session.accessToken}`,
              "User-Agent": "MetaSync-App"
            }
          }
        );
        
        if (existingFileResponse.ok) {
          setCreateFileError(`A file named "${finalFileName}" already exists in this location. Please choose a different name.`);
          return;
        }
      } catch (err) {
        // File doesn't exist, which is what we want
      }
      
      // Create JSON content from form data
      const jsonContent = JSON.stringify(newSEOData, null, 2);
      
      // Create a unique branch name for this SEO file creation
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const branchName = `seo-create-${finalFileName.replace(/[^a-zA-Z0-9]/g, '-')}-${timestamp}`;
      
      // Step 1: Create a new branch
      console.log(`Creating branch for new SEO file: ${branchName}`);
      await createBranch(session.accessToken, owner, repo, branchName, defaultBranch);
      
      // Step 2: Create the file in the new branch
      console.log(`Creating SEO file ${finalFileName} in branch: ${branchName}`);
      await createOrUpdateFileInBranch(
        session.accessToken,
        owner,
        repo,
        filePath,
        jsonContent,
        `Create ${finalFileName} via MetaSync`,
        branchName
      );
      
      // Step 3: Create pull request
      console.log(`Creating pull request for new SEO file from ${branchName} to ${defaultBranch}`);
      const pullRequest = await createPullRequest(
        session.accessToken,
        owner,
        repo,
        `New SEO File: ${finalFileName}`,
        branchName,
        defaultBranch,
        `Created new SEO file ${finalFileName} via MetaSync.\n\nThis pull request adds a new SEO metadata file with initial configuration.`
      );
      
      // Step 4: Auto-merge the pull request (if user has merge permissions)
      try {
        console.log(`Auto-merging pull request #${pullRequest.number} for new SEO file`);
        await mergePullRequest(session.accessToken, owner, repo, pullRequest.number, "squash");
        console.log("New SEO file successfully merged!");
      } catch (mergeError) {
        console.warn("Auto-merge failed for new SEO file, but pull request was created:", mergeError);
        setCreateFileError(`SEO file creation submitted successfully! Pull request #${pullRequest.number} created but requires manual merge.`);
      }
      
      // Success
      setShowCreateSEO(false);
      setNewFileName("");
      setNewSEOData({
        meta_title: "",
        meta_description: "",
        meta_keywords: "",
        h1: "",
        h2: "",
        "content-main": ""
      });
      
      if (session.accessToken) {
        await fetchFiles(owner, repo, currentPath, session.accessToken);
      }
      
    } catch (err) {
      console.error("Error in SEO file creation workflow:", err);
      handleError(err, "SEO file creation");
    } finally {
      setIsCreatingFile(false);
    }
  };

  // Function to add a new field to SEO data
  const addSEOField = (fieldName: string, fieldValue: any) => {
    setSeoFormData(prev => ({
      ...prev,
      [fieldName]: fieldValue
    }));
    setShowAddFieldMenu(false);
    setShowCustomFieldDialog(false);
    setCustomFieldName("");
    setCustomFieldType("text");
  };

  // Function to handle predefined SEO field additions
  const handleAddPredefinedField = (fieldType: string) => {
    switch (fieldType) {
      case "og_title":
        addSEOField("og_title", "");
        break;
      case "og_description":
        addSEOField("og_description", "");
        break;
      case "og_image":
        addSEOField("og_image", "");
        break;
      case "og_url":
        addSEOField("og_url", "");
        break;
      case "canonical_url":
        addSEOField("canonical_url", "");
        break;
      case "robots":
        addSEOField("robots", "index,follow");
        break;
      case "structured_data":
        addSEOField("structured_data", {
          "@context": "https://schema.org",
          "@type": "WebPage"
        });
        break;
      case "content_section":
        addSEOField("content_section", "")        
        break;
      case "faq":
        addSEOField("faq", []);
        break;
      case "custom":
        setShowCustomFieldDialog(true);
        break;
      default:
        break;
    }
    setShowAddFieldMenu(false);
  };

  // Function to delete SEO field
  const deleteSEOField = (fieldKey: string) => {
    if (confirm(`Are you sure you want to delete the "${fieldKey}" field?`)) {
      setSeoFormData(prev => {
        const newData = { ...prev };
        delete newData[fieldKey];
        return newData;
      });
    }
  };

  // Check if a file is a SEO file based on name or path
  const isSEOFile = (filename: string, path: string) => {
    // Match files ending in .seo.json (like about.seo.json, contact.seo.json)
    // Also match standalone seo.json files for backward compatibility
    return filename.endsWith(".seo.json") || 
           path.endsWith(".seo.json") || 
           filename === "seo.json" || 
           path.endsWith("/seo.json") ||
           // Additional patterns to catch files ending in .seo. followed by any extension
           /\.seo\.[^/]*$/.test(filename) ||
           /\.seo\.[^/]*$/.test(path);
  };

  // Parse SEO content from a file
  const parseSEOContent = (content: string): SEOData | null => {
    try {
      const parsed = JSON.parse(content);
      // Only validate that it's a valid JSON object for .seo.json files
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as SEOData;
      }
      return null;
    } catch {
      return null;
    }
  };

  // Render SEO form fields dynamically
  const renderSEOFormField = (key: string, value: any, path: string = "") => {
    const fullKey = path ? `${path}.${key}` : key;
    
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      // Nested object
      return (
        <div key={fullKey} className="space-y-4 border border-neutral-700 rounded-lg p-4 relative">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-purple-300 capitalize">
              {key.replace(/_/g, ' ').replace(/-/g, ' ')}
            </h4>
            <button
              onClick={() => deleteSEOField(key)}
              className="text-red-400 hover:text-red-300 p-1"
              title="Delete field"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
          <div className="space-y-3 ml-4">
            {Object.entries(value).map(([nestedKey, nestedValue]) => 
              renderSEOFormField(nestedKey, nestedValue, fullKey)
            )}
          </div>
        </div>
      );
    } else if (Array.isArray(value)) {
      // Array handling
      return (
        <div key={fullKey} className="relative">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-neutral-300 capitalize">
              {key.replace(/_/g, ' ').replace(/-/g, ' ')}
            </label>
            <button
              onClick={() => deleteSEOField(key)}
              className="text-red-400 hover:text-red-300 p-1"
              title="Delete field"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
          <textarea
            value={Array.isArray(value) ? value.join(', ') : value}
            onChange={(e) => updateSEOFormData(fullKey, e.target.value.split(', ').filter(Boolean))}
            rows={2}
            className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-purple-500 resize-y"
            placeholder="Enter comma-separated values"
          />
          <p className="text-xs text-neutral-400 mt-1">Comma-separated values for array</p>
        </div>
      );
    } else if (typeof value === 'string' && value.length > 50) {
      // Long text - use textarea
      return (
        <div key={fullKey} className="relative">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-neutral-300 capitalize">
              {key.replace(/_/g, ' ').replace(/-/g, ' ')}
            </label>
            <button
              onClick={() => deleteSEOField(key)}
              className="text-red-400 hover:text-red-300 p-1"
              title="Delete field"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
          <textarea
            value={value}
            onChange={(e) => updateSEOFormData(fullKey, e.target.value)}
            rows={3}
            className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-purple-500 resize-y"
            placeholder={`Enter ${key.replace(/_/g, ' ')}`}
          />
          <p className="text-xs text-neutral-400 mt-1">
            {getSEOFieldDescription(key)}
          </p>
        </div>
      );
    } else {
      // Short text, number, boolean - use input
      return (
        <div key={fullKey} className="relative">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-neutral-300 capitalize">
              {key.replace(/_/g, ' ').replace(/-/g, ' ')}
            </label>
            <button
              onClick={() => deleteSEOField(key)}
              className="text-red-400 hover:text-red-300 p-1"
              title="Delete field"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
          <input
            type={typeof value === 'number' ? 'number' : typeof value === 'boolean' ? 'checkbox' : 'text'}
            value={typeof value === 'boolean' ? undefined : value}
            checked={typeof value === 'boolean' ? value : undefined}
            onChange={(e) => {
              let newValue: any = e.target.value;
              if (typeof value === 'number') newValue = Number(e.target.value);
              if (typeof value === 'boolean') newValue = e.target.checked;
              updateSEOFormData(fullKey, newValue);
            }}
            className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
            placeholder={`Enter ${key.replace(/_/g, ' ')}`}
          />
          <p className="text-xs text-neutral-400 mt-1">
            {getSEOFieldDescription(key)}
          </p>
        </div>
      );
    }
  };

  // Helper function to update nested form data
  const updateSEOFormData = (path: string, value: any) => {
    setSeoFormData(prev => {
      const newData = { ...prev };
      const keys = path.split('.');
      let current = newData;
      
      for (let i = 0; i < keys.length - 1; i++) {
        if (!(keys[i] in current)) {
          current[keys[i]] = {};
        }
        current = current[keys[i]];
      }
      
      current[keys[keys.length - 1]] = value;
      return newData;
    });
  };

  // Helper function to get field descriptions
  const getSEOFieldDescription = (key: string): string => {
    const descriptions: { [key: string]: string } = {
      'meta_title': 'This appears in search engine results and browser tabs',
      'title': 'This appears in search engine results and browser tabs',
      'meta_description': 'This appears in search engine results below the title (150-160 characters recommended)',
      'description': 'This appears in search engine results below the title (150-160 characters recommended)',
      'meta_keywords': 'Comma-separated keywords that describe your page content',
      'keywords': 'Comma-separated keywords that describe your page content',
      'h1': 'The primary heading that visitors will see',
      'h2': 'A supporting headline or subtitle',
      'content': 'The main paragraph or content that describes your page',
      'url': 'The canonical URL for this page',
      'image': 'URL to the main image for social media sharing',
      'author': 'The author of this content',
      'date': 'Publication or last modified date',
      'robots': 'Instructions for search engine crawlers (e.g., index, noindex)',
      'canonical': 'The canonical URL to prevent duplicate content issues'
    };
    
    return descriptions[key] || `Value for ${key.replace(/_/g, ' ')}`;
  };

  // Add function to render dynamic preview
  const renderSEOPreviewField = (key: string, value: any, path: string = ""): React.ReactNode => {
    const fullKey = path ? `${path}.${key}` : key;
    
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      // Nested object
      return (
        <div key={fullKey} className="border border-neutral-700 rounded-lg p-4">
          <label className="block text-sm font-medium text-purple-300 mb-2 capitalize">
            {key.replace(/_/g, ' ').replace(/-/g, ' ')}
          </label>
          <div className="space-y-3 ml-4">
            {Object.entries(value).map(([nestedKey, nestedValue]) => 
              renderSEOPreviewField(nestedKey, nestedValue, fullKey)
            )}
          </div>
        </div>
      );
    } else {
      // Simple value
      return (
        <div key={fullKey}>
          <label className="block text-sm font-medium text-purple-300 mb-1 capitalize">
            {key.replace(/_/g, ' ').replace(/-/g, ' ')}
          </label>
          <div className="bg-neutral-800 rounded-lg px-3 py-2 text-white">
            {Array.isArray(value) ? value.join(', ') : String(value)}
          </div>
        </div>
      );
    }
  };

  // Helper function to determine if a file is a text file based on its extension
  const isTextFile = (filename: string) => {
    const textExtensions = [
      ".txt", ".md", ".js", ".ts", ".tsx", ".jsx", ".json", ".css", ".scss", ".html", ".xml", ".yml", ".yaml", ".csv", ".env", ".seo.json"
    ];
    const lower = filename.toLowerCase();
    return textExtensions.some(ext => lower.endsWith(ext));
  };

  // Helper function to determine if a file is an image file based on its extension
  const isImageFile = (filename: string) => {
    return /\.(png|jpg|jpeg|gif|svg|webp|bmp)$/i.test(filename);
  };

  const getFileIcon = (file: FileItem): React.ReactNode => {
  // SVG Components
  const icons = {
    folder: (
      <svg className="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7a2 2 0 012-2h3.172a2 2 0 011.414.586l1.828 1.828A2 2 0 0012.828 8H19a2 2 0 012 2v7a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
      </svg>
    ),
    seo: (
      <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707a1 1 0 00-1.414 0l-1.828 1.828A2 2 0 002 7v10a2 2 0 002 2h10a2 2 0 001.414-.586l1.828-1.828a1 1 0 000-1.414l-3.536-3.536a2 2 0 00-2.828 0l-1.414 1.414-2.828-2.828 1.414-1.414a2 2 0 000-2.828l-3.536-3.536a1 1 0 00-1.414 0l-.707.707z" />
      </svg>
    ),
    md: (
      <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8H6a2 2 0 01-2-2V6a2 2 0 012-2h7.586a1 1 0 01.707.293l5.414 5.414A1 1 0 0120 10.414V19a2 2 0 01-2 2z" />
      </svg>
    ),
    code: (
      <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 18l6-6-6-6M8 6l-6 6 6 6" />
      </svg>
    ),
    txt: (
      <svg className="w-6 h-6 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16h8M8 12h8m-6 8h6a2 2 0 002-2V7.828a2 2 0 00-.586-1.414l-4.828-4.828A2 2 0 0012.172 1H6a2 2 0 00-2 2v16a2 2 0 002 2z" />
      </svg>
    ),
    image: (
      <svg className="w-6 h-6 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <rect width="18" height="14" x="3" y="5" rx="2" strokeWidth={2} stroke="currentColor" fill="none"/>
        <circle cx="8.5" cy="10.5" r="1.5" fill="currentColor"/>
        <path stroke="currentColor" strokeWidth={2} d="M21 19l-5.5-7-4.5 6-2.5-3L3 19"/>
      </svg>
    ),
    pdf: (
      <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <rect width="18" height="14" x="3" y="5" rx="2" strokeWidth={2} stroke="currentColor" fill="none"/>
        <text x="7" y="16" fontSize="8" fill="currentColor">PDF</text>
      </svg>
    ),
    default: (
      <svg className="w-6 h-6 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8H6a2 2 0 01-2-2V6a2 2 0 012-2h7.586a1 1 0 01.707.293l5.414 5.414A1 1 0 0120 10.414V19a2 2 0 01-2 2z" />
      </svg>
    )
  };

  const lowerName = file.name.toLowerCase();

  if (file.type === "dir") return icons.folder;
  if (file.name.endsWith(".seo.json") || lowerName === "seo.json") return icons.seo;
  if (lowerName === "readme.md" || lowerName.endsWith(".md")) return icons.md;

  // Code-related extensions
  if (/\.(js|jsx|ts|tsx|json|yml|yaml|css|scss|html|xml|env)$/i.test(file.name)) return icons.code;

  if (file.name.endsWith(".txt")) return icons.txt;

  // Image extensions
  if (/\.(png|jpg|jpeg|gif|svg|webp|bmp)$/i.test(file.name)) return icons.image;

  if (file.name.endsWith(".pdf")) return icons.pdf;

  return icons.default;
};

const getFileExtensionBadge = (file: FileItem): React.ReactNode => {
  if (file.type === "dir") return null;

  const lowerName = file.name.toLowerCase();

  // Special cases
  if (file.name.endsWith(".seo.json") || lowerName === "seo.json") {
    return (
      <span className="ml-2 text-xs bg-purple-600 text-purple-100 px-1.5 py-0.5 rounded">
        SEO
      </span>
    );
  }
  if (lowerName === "readme.md" || lowerName.endsWith(".md")) {
    return (
      <span className="ml-2 text-xs bg-green-600 text-green-100 px-1.5 py-0.5 rounded">
        MD
      </span>
    );
  }

  // Mapping of extension to badge config
  const extBadges: { [key: string]: { label: string; color: string; text: string } } = {
    js:   { label: "JS",   color: "bg-blue-600",    text: "text-blue-100" },
    jsx:  { label: "JS",   color: "bg-blue-600",    text: "text-blue-100" },
    ts:   { label: "TS",   color: "bg-blue-600",    text: "text-blue-100" },
    tsx:  { label: "TS",   color: "bg-blue-600",    text: "text-blue-100" },
    json: { label: "JSON", color: "bg-blue-600",    text: "text-blue-100" },
    css:  { label: "CSS",  color: "bg-blue-600",    text: "text-blue-100" },
    scss: { label: "CSS",  color: "bg-blue-600",    text: "text-blue-100" },
    html: { label: "HTML", color: "bg-blue-600",    text: "text-blue-100" },
    yml:  { label: "YAML", color: "bg-blue-600",    text: "text-blue-100" },
    yaml: { label: "YAML", color: "bg-blue-600",    text: "text-blue-100" },
    xml:  { label: "XML",  color: "bg-blue-600",    text: "text-blue-100" },
    env:  { label: "ENV",  color: "bg-blue-600",    text: "text-blue-100" },
    txt:  { label: "TXT",  color: "bg-neutral-600", text: "text-neutral-100" },
    pdf:  { label: "PDF",  color: "bg-red-600",     text: "text-red-100" },
  };

  // Image extensions
  const imageExts = ["png", "jpg", "jpeg", "gif", "svg", "webp", "bmp"];

  // Get extension
  const extension = file.name.split('.').pop();
  if (extension && extension !== file.name) {
    const extLower = extension.toLowerCase();

    if (imageExts.includes(extLower)) {
      return (
        <span className="ml-2 text-xs bg-pink-600 text-pink-100 px-1.5 py-0.5 rounded">
          {extension.toUpperCase()}
        </span>
      );
    }
    if (extBadges[extLower]) {
      const { label, color, text } = extBadges[extLower];
      return (
        <span className={`ml-2 text-xs ${color} ${text} px-1.5 py-0.5 rounded`}>
          {label}
        </span>
      );
    }
    // Default: show extension in neutral badge
    return (
      <span className="ml-2 text-xs bg-neutral-600 text-neutral-100 px-1.5 py-0.5 rounded">
        {extension.toUpperCase()}
      </span>
    );
  }

  return null;
};

  function handleCancelCreateSEO() {
      setShowCreateSEO(false);
      setNewFileName("");
      setNewSEOData({
        meta_title: "",
        meta_description: "",
        meta_keywords: "",
        h1: "",
        h2: "",
        "content-main": ""
      });
      setCreateFileError(null);
    }
  
  // Add missing function to handle closing the Create File modal
  function handleCancelCreateFile() {
    setShowCreateFile(false);
    setNewFileName("");
    setNewFileContent("");
    setCreateFileError(null);
  }

  // Function to handle custom field addition
  const handleAddCustomField = () => {
    if (!customFieldName.trim()) return;
    
    let fieldValue: any = "";
    switch (customFieldType) {
      case "text":
        fieldValue = "";
        break;
      case "textarea":
        fieldValue = "";
        break;
      case "array":
        fieldValue = [];
        break;
      case "object":
        fieldValue = {};
        break;
    }
    
    addSEOField(customFieldName.trim(), fieldValue);
  };

  // Drag and drop handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
  e.preventDefault();
  e.stopPropagation();
  setIsDragOver(true);
};

const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
  e.preventDefault();
  e.stopPropagation();
  setIsDragOver(false);
};

const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
  e.preventDefault();
  e.stopPropagation();
  setIsDragOver(false);
  if (!session?.accessToken) return;

  const files = Array.from(e.dataTransfer.files);
  if (files.length > 0) {
    setIsUploading(true);
    setUploadError(null);

    for (const file of files) {
      try {
        const fileName = file.name;
        const filePath = currentPath ? `${currentPath}/${fileName}` : fileName;
        const content = await file.text();

        // Check if file already exists
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
          setUploadError(`A file named "${fileName}" already exists in this location.`);
          continue;
        }

        // Create the file in the repo
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
              message: `Add ${fileName} via drag and drop`,
              content: btoa(content),
              branch: repository?.default_branch || "main"
            })
          }
        );
        if (!createResponse.ok) {
          setUploadError(`Failed to upload "${fileName}".`);
        }
      } catch (err) {
        setUploadError("Failed to upload one or more files.");
      }
    }

    setIsUploading(false);
    // Refresh file list after upload
    if (session.accessToken) {
      await fetchFiles(owner, repo, currentPath, session.accessToken);
    }
  }
};

  // File input handler
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setSelectedFiles(files);
      setShowUploadModal(true);
    }
    // Reset input
    e.target.value = '';
  };

  // Upload files function
  const uploadFiles = async () => {
    if (!session?.accessToken || selectedFiles.length === 0) return;

    setIsUploading(true);
    setUploadError(null);
    setUploadProgress({});

    try {
      for (const file of selectedFiles) {
        // Validate file name
        const fileNameError = validateFileName(file.name);
        if (fileNameError) {
          setUploadError(`Invalid filename "${file.name}": ${fileNameError}`);
          continue;
        }

        // Check file size (GitHub has a 100MB limit)
        if (file.size > 100 * 1024 * 1024) {
          setUploadError(`File "${file.name}" is too large. Maximum size is 100MB.`);
          continue;
        }

        const filePath = currentPath ? `${currentPath}/${file.name}` : file.name;

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
            if (!confirm(`File "${file.name}" already exists. Do you want to overwrite it?`)) {
              continue;
            }
          }
        } catch (err) {
          // File doesn't exist, which is fine
        }

        // Update progress
        setUploadProgress(prev => ({ ...prev, [file.name]: 0 }));

        // Read file content
        const fileContent = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            // Remove data URL prefix and get base64 content
            const base64Content = result.split(',')[1];
            resolve(base64Content);
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        // Update progress
        setUploadProgress(prev => ({ ...prev, [file.name]: 50 }));

        // Upload to GitHub
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
              message: `Upload ${file.name} via MetaSync`,
              content: fileContent,
              branch: repository?.default_branch || "main"
            })
          }
        );

        if (!createResponse.ok) {
          const errorData = await createResponse.text();
          throw new Error(`Failed to upload ${file.name}: ${createResponse.status} - ${errorData}`);
        }

        // Update progress to complete
        setUploadProgress(prev => ({ ...prev, [file.name]: 100 }));
      }

      // Close modal and refresh files
      setShowUploadModal(false);
      setSelectedFiles([]);
      
      if (session.accessToken) {
        await fetchFiles(owner, repo, currentPath, session.accessToken);
      }

    } catch (err) {
      console.error("Error uploading files:", err);
      setUploadError(err instanceof Error ? err.message : "Failed to upload files");
    } finally {
      setIsUploading(false);
    }
  };

  // Delete file function
  const deleteFile = async (file: FileItem) => {
    if (!session?.accessToken) return;

    const confirmMessage = file.type === "dir" 
      ? `Are you sure you want to delete the folder "${file.name}" and all its contents? This action cannot be undone.`
      : `Are you sure you want to delete "${file.name}"? This action cannot be undone.`;

    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      setIsLoading(true);

      if (file.type === "dir") {
        // For directories, we need to delete all files recursively
        // GitHub API doesn't support directory deletion directly
        setError("Directory deletion is not yet supported. Please delete files individually or use GitHub directly.");
        return;
      }

      // Get file SHA for deletion
      const fileResponse = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/contents/${file.path}`,
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

      // Delete file
      const deleteResponse = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/contents/${file.path}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
            "Content-Type": "application/json",
            "User-Agent": "MetaSync-App"
          },
          body: JSON.stringify({
            message: `Delete ${file.name} via MetaSync`,
            sha: fileData.sha,
            branch: repository?.default_branch || "main"
          })
        }
      );

      if (!deleteResponse.ok) {
        const errorData = await deleteResponse.text();
        throw new Error(`Failed to delete file: ${deleteResponse.status} - ${errorData}`);
      }

      // Refresh files list
      if (session.accessToken) {
        await fetchFiles(owner, repo, currentPath, session.accessToken);
      }

      // If we were viewing this file, close it
      if (fileContent && fileContent.path === file.path) {
        setFileContent(null);
        setIsEditMode(false);
        setIsEditingSEO(false);
        setSeoData(null);
      }

    } catch (err) {
      console.error("Error deleting file:", err);
      setError(err instanceof Error ? err.message : "Failed to delete file");
    } finally {
      setIsLoading(false);
    }
  };

  // Clear selected files after upload or on cancel
  useEffect(() => {
    if (!showUploadModal) {
      setSelectedFiles([]);
      setUploadError(null);
      setUploadProgress({});
    }
  }, [showUploadModal]);

  // File upload modal close handler
  const handleUploadModalClose = () => {
    setShowUploadModal(false);
    setSelectedFiles([]);
    setUploadError(null);
    setUploadProgress({});
  };

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
          <div>Current User: {session?.user?.name || "Unknown"}</div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-6 max-w-7xl">
        {/* Error message */}
        {error && (
          <div className={`border px-4 py-3 rounded mb-6 ${
            errorType === "permission" 
              ? "bg-orange-900/30 border-orange-800 text-orange-200"
              : errorType === "validation"
              ? "bg-yellow-900/30 border-yellow-800 text-yellow-200"  
              : errorType === "network"
              ? "bg-blue-900/30 border-blue-800 text-blue-200"
              : "bg-red-900/30 border-red-800 text-red-200"
          }`}>
            <div className="flex items-start justify-between">
              <div className="flex items-start">
                <div className="mr-3 mt-0.5">
                  {errorType === "permission" && (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  )}
                  {errorType === "validation" && (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  )}
                  {errorType === "network" && (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
                    </svg>
                  )}
                  {!errorType && (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                </div>
                <div>
                  <h4 className="font-medium mb-1">
                    {errorType === "permission" && "Permission Error"}
                    {errorType === "validation" && "Validation Error"}
                    {errorType === "network" && "Network Error"}
                    {!errorType && "Error"}
                  </h4>
                  <p>{error}</p>
                  
                  {/* Action suggestions */}
                  {errorType === "permission" && (
                    <div className="mt-2 text-sm opacity-90">
                      <p>Try: Contact the repository owner, check your GitHub permissions, or refresh your session.</p>
                    </div>
                  )}
                  {errorType === "network" && (
                    <div className="mt-2 text-sm opacity-90">
                      <p>Try: Check your internet connection, wait a moment, then refresh the page.</p>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {errorType === "permission" && (
                  <button
                    onClick={() => {
                      clearError();
                      router.push("/signin");
                    }}
                    className="text-sm underline hover:no-underline"
                  >
                    Sign In Again
                  </button>
                )}
                <button
                  onClick={clearError}
                  className="text-current hover:opacity-70"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
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
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <a 
                      href={repository.html_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-neutral-800 hover:bg-neutral-700 text-white px-4 py-2 rounded flex items-center"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                        clearError(); // Clear any file-specific errors
                      }}
                      className="text-neutral-400 hover:text-white p-1 rounded flex items-center gap-1"
                      title="Go back to file browser"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                      <span className="text-sm">Back</span>
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
                    {/* Only show "Add Fields" button if .seo.json file and editing SEO */}
                    {seoData && isEditingSEO && isSEOFile(fileContent.name, fileContent.path) && (
                      <div className="relative">
                        <button
                          onClick={() => setShowAddFieldMenu(!showAddFieldMenu)}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm flex items-center gap-1"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                          Add Fields
                        </button>
                        {showAddFieldMenu && (
                          <div className="absolute right-0 mt-2 w-72 bg-neutral-800 border border-neutral-700 rounded-lg shadow-lg z-10">
                            <div className="py-1">
                              <div className="px-3 py-2 text-xs font-medium text-neutral-400 border-b border-neutral-700">
                                Open Graph Fields
                              </div>
                              <button
                                onClick={() => handleAddPredefinedField("og_title")}
                                className="w-full text-left px-4 py-2 text-sm text-white hover:bg-neutral-700"
                              >
                                Title
                              </button>
                              <button
                                onClick={() => handleAddPredefinedField("og_description")}
                                className="w-full text-left px-4 py-2 text-sm text-white hover:bg-neutral-700"
                              >
                                Description
                              </button>
                              <button
                                onClick={() => handleAddPredefinedField("og_image")}
                                className="w-full text-left px-4 py-2 text-sm text-white hover:bg-neutral-700"
                              >
                                Image
                              </button>
                              <button
                                onClick={() => handleAddPredefinedField("og_url")}
                                className="w-full text-left px-4 py-2 text-sm text-white hover:bg-neutral-700"
                              >
                                URL
                              </button>
                              
                              <div className="px-3 py-2 text-xs font-medium text-neutral-400 border-b border-neutral-700 border-t">
                                Technical SEO
                              </div>
                              <button
                                onClick={() => handleAddPredefinedField("canonical_url")}
                                className="w-full text-left px-4 py-2 text-sm text-white hover:bg-neutral-700"
                              >
                                Canonical URL
                              </button>
                              <button
                                onClick={() => handleAddPredefinedField("robots")}
                                className="w-full text-left px-4 py-2 text-sm text-white hover:bg-neutral-700"
                              >
                                Robots Meta
                              </button>
                              <button
                                onClick={() => handleAddPredefinedField("structured_data")}
                                className="w-full text-left px-4 py-2 text-sm text-white hover:bg-neutral-700"
                              >
                                Structured Data (JSON-LD)
                              </button>
                              
                              <div className="px-3 py-2 text-xs font-medium text-neutral-400 border-b border-neutral-700 border-t">
                                Content Fields
                              </div>
                              <button
                                onClick={() => handleAddPredefinedField("content_section")}
                                className="w-full text-left px-4 py-2 text-sm text-white hover:bg-neutral-700"
                              >
                                Add Content Section
                              </button>
                              <button
                                onClick={() => handleAddPredefinedField("faq")}
                                className="w-full text-left px-4 py-2 text-sm text-white hover:bg-neutral-700"
                              >
                                FAQ Section
                              </button>
                              
                              <div className="px-3 py-2 text-xs font-medium text-neutral-400 border-b border-neutral-700 border-t">
                                Custom
                              </div>
                              <button
                                onClick={() => handleAddPredefinedField("custom")}
                                className="w-full text-left px-4 py-2 text-sm text-white hover:bg-neutral-700"
                              >
                                Add Custom Field
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    {seoData && !isEditingSEO && (
                      <button 
                        onClick={() => setIsEditingSEO(true)}
                        className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded text-sm"
                      >
                        Edit SEO Content
                      </button>
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
                  {/* Image preview */}
                  {isImageFile(fileContent.name) && fileContent.content.startsWith("Binary file:") ? (
                    <div className="flex flex-col items-center">
                      <img
                        src={fileContent.content.replace("Binary file: ", "")}
                        alt={fileContent.name}
                        className="max-w-full max-h-[60vh] rounded border border-neutral-700 bg-neutral-800"
                        style={{ objectFit: "contain" }}
                      />
                      <div className="mt-2 text-neutral-400 text-sm">
                        {fileContent.name}
                      </div>
                    </div>
                  ) : seoData && isEditingSEO ? (
                    /* Dynamic SEO Form Editor */
                    <div className="space-y-6">
                      <div className="bg-gradient-to-r from-purple-600/20 to-blue-600/20 border border-purple-500/30 rounded-lg p-4 mb-4">
                        <h3 className="text-lg font-medium text-white mb-2">Dynamic SEO Editor</h3>
                        <p className="text-neutral-300 text-sm">This form automatically adapts to your SEO file structure. Edit any field below.</p>
                      </div>
                      
                      {Object.entries(seoFormData).map(([key, value]) => 
                        renderSEOFormField(key, value)
                      )}
                    </div>
                  ) : seoData ? (
                    /* Dynamic SEO Content Preview */
                    <div className="space-y-6">
                      <div className="bg-gradient-to-r from-purple-600/20 to-blue-600/20 border border-purple-500/30 rounded-lg p-4 mb-4">
                        <h3 className="text-lg font-medium text-white mb-2">SEO Content Preview</h3>
                        <p className="text-neutral-300 text-sm">This file contains SEO metadata for your website. Use the "Edit SEO Content" button to make changes safely.</p>
                      </div>
                      
                      <div className="grid gap-6">
                        {Object.entries(seoData).map(([key, value]) => 
                          renderSEOPreviewField(key, value)
                        )}
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
              <div className={`relative bg-neutral-900 border border-neutral-800 rounded-lg${isDragOver ? " ring-2 ring-blue-500" : ""}`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                  >
                    {isDragOver && (
                      <div className="absolute inset-0 bg-blue-900/60 flex items-center justify-center z-50 pointer-events-none rounded-lg">
                        <span className="text-white text-lg font-bold">Drop files to upload</span>
                      </div>
                    )}
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
                    
                    {/* Upload and Create File Buttons */}
                    <div className="flex items-center gap-2">
                      {/* File Upload Button */}
                      <label className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded flex items-center gap-2 text-sm cursor-pointer">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        Upload Files
                        <input
                          type="file"
                          multiple
                          onChange={handleFileSelect}
                          className="hidden"
                          accept="*/*"
                        />
                      </label>

                      {/* Create File Button with Dropdown */}
                      <div className="relative">
                        <button
                          onClick={() => setShowCreateFileMenu(!showCreateFileMenu)}
                          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded flex items-center gap-2 text-sm"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                          Create File
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        
                        {showCreateFileMenu && (
                          <div className="absolute right-0 mt-2 w-64 bg-neutral-800 border border-neutral-700 rounded-lg shadow-lg z-10">
                            <div className="py-1">
                              <button
                                onClick={() => handleFilePresetSelect("custom")}
                                className="w-full text-left px-4 py-2 text-sm text-white hover:bg-neutral-700 flex items-center gap-3"
                              >
                                <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                </svg>
                                <div>
                                  <div className="font-medium">Custom File</div>
                                  <div className="text-xs text-neutral-400">Create any type of file</div>
                                </div>
                              </button>
                              
                              <button
                                onClick={() => handleFilePresetSelect("seo")}
                                className="w-full text-left px-4 py-2 text-sm text-white hover:bg-neutral-700 flex items-center gap-3"
                              >
                                <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707a1 1 0 00-1.414 0l-1.828 1.828A2 2 0 002 7v10a2 2 0 002 2h10a2 2 0 001.414-.586l1.828-1.828a1 1 0 000-1.414l-3.536-3.536a2 2 0 00-2.828 0l-1.414 1.414-2.828-2.828 1.414-1.414a2 2 0 000-2.828l-3.536-3.536a1 1 0 00-1.414 0l-.707.707z" />
                                </svg>
                                <div>
                                  <div className="font-medium">SEO File</div>
                                  <div className="text-xs text-neutral-400">Pre-configured SEO metadata template</div>
                                </div>
                              </button>
                              
                              <button
                                onClick={() => handleFilePresetSelect("readme")}
                                className="w-full text-left px-4 py-2 text-sm text-white hover:bg-neutral-700 flex items-center gap-3"
                              >
                                <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <div>
                                  <div className="font-medium">README.md</div>
                                  <div className="text-xs text-neutral-400">Project documentation template</div>
                                </div>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
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
                        className="p-3 hover:bg-neutral-800/50 cursor-pointer group"
                        onClick={() => handleFileClick(file)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div className="w-7 flex justify-center mr-3">
                              {getFileIcon(file)}
                            </div>
                            <div className="text-neutral-200">
                              {file.name}
                              {isSEOFile(file.name, file.path) && (
                                <span className="ml-2 text-xs bg-purple-600 text-purple-100 px-1.5 py-0.5 rounded">
                                  SEO
                                </span>
                              )}
                              {!isSEOFile(file.name, file.path) && getFileExtensionBadge(file)}
                            </div>
                          </div>

                          {/* Delete Button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteFile(file);
                            }}
                            className="opacity-0 group-hover:opacity-100 p-1 text-neutral-400 hover:text-red-400 transition-opacity"
                            title={`Delete ${file.type === 'dir' ? 'folder' : 'file'}`}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))
                  ): (
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

      {/* Create SEO File Modal */}
      {showCreateSEO && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between border-b border-neutral-800 p-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707a1 1 0 00-1.414 0l-1.828 1.828A2 2 0 002 7v10a2 2 0 002 2h10a2 2 0 001.414-.586l1.828-1.828a1 1 0 000-1.414l-3.536-3.536a2 2 0 00-2.828 0l-1.414 1.414-2.828-2.828 1.414-1.414a2 2 0 000-2.828l-3.536-3.536a1 1 0 00-1.414 0l-.707.707z" />
                  </svg>
                </div>
                <h2 className="text-xl font-semibold text-white">Create File</h2>
              </div>
              <button 
                onClick={handleCancelCreateSEO}
                className="text-neutral-400 hover:text-white"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="bg-gradient-to-r from-purple-600/20 to-blue-600/20 border border-purple-500/30 rounded-lg p-4 mb-4">
                <h3 className="text-lg font-medium text-white mb-2">SEO Metadata</h3>
                <p className="text-neutral-300 text-sm">Fill out the fields below to create a structured SEO file for your website. This will help search engines understand your content better.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                  File Name
                </label>
                <input
                  type="text"
                  value={newFileName}
                  onChange={(e) => setNewFileName(e.target.value)}
                  placeholder="seo.json (will auto-add .seo.json if needed)"
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
                <p className="text-xs text-neutral-400 mt-1">
                  File will be created in: {currentPath ? `${owner}/${repo}/${currentPath}/` : `${owner}/${repo}/`}
                </p>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-2">
                    Page Title (meta_title)
                  </label>
                  <input
                    type="text"
                    value={newSEOData.meta_title}
                    onChange={(e) => setNewSEOData(prev => ({ ...prev, meta_title: e.target.value }))
                    }
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                    placeholder="Enter the page title for search engines"
                  />
                  <p className="text-xs text-neutral-400 mt-1">This appears in search engine results and browser tabs</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-2">
                    Meta Description
                  </label>
                  <textarea
                    value={newSEOData.meta_description}
                    onChange={(e) => setNewSEOData(prev => ({ ...prev, meta_description: e.target.value }))
                    }
                    rows={3}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-purple-500 resize-y"
                    placeholder="Enter a brief description of the page content"
                  />
                  <p className="text-xs text-neutral-400 mt-1">This appears in search engine results below the title (150-160 characters recommended)</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-2">
                    Keywords (meta_keywords)
                  </label>
                  <input
                    type="text"
                    value={newSEOData.meta_keywords}
                    onChange={(e) => setNewSEOData(prev => ({ ...prev, meta_keywords: e.target.value }))
                    }
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                    placeholder="keyword1, keyword2, keyword3"
                  />
                  <p className="text-xs text-neutral-400 mt-1">Comma-separated keywords that describe your page content</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-2">
                    Main Heading (H1)
                  </label>
                  <input
                    type="text"
                    value={newSEOData.h1}
                    onChange={(e) => setNewSEOData(prev => ({ ...prev, h1: e.target.value }))
                    }
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                    placeholder="Enter the main heading for your page"
                  />
                  <p className="text-xs text-neutral-400 mt-1">The primary heading that visitors will see</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-2">
                    Secondary Heading (H2)
                  </label>
                  <input
                    type="text"
                    value={newSEOData.h2}
                    onChange={(e) => setNewSEOData(prev => ({ ...prev, h2: e.target.value }))
                    }
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                    placeholder="Enter the secondary heading"
                  />
                  <p className="text-xs text-neutral-400 mt-1">A supporting headline or subtitle</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-2">
                    Main Content
                  </label>
                  <textarea
                    value={newSEOData["content-main"]}
                    onChange={(e) => setNewSEOData(prev => ({ ...prev, "content-main": e.target.value }))
                    }
                    rows={4}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-purple-500 resize-y"
                    placeholder="Enter the main content or description for your page"
                  />
                  <p className="text-xs text-neutral-400 mt-1">The main paragraph or content that describes your page</p>
                </div>
              </div>
              
              {createFileError && (
                <div className="bg-red-900/30 border border-red-800 text-red-200 px-4 py-3 rounded">
                  <div className="flex items-start">
                    <svg className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    <div>
                      <h4 className="font-medium mb-1">SEO File Creation Error</h4>
                      <p>{createFileError}</p>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="flex items-center justify-between pt-4 border-t border-neutral-800">
                <div className="text-sm text-neutral-400">
                  <span className="font-medium">Preview:</span> The file will be saved as JSON with proper formatting
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleCancelCreateSEO}
                    className="px-4 py-2 text-neutral-300 hover:text-white border border-neutral-700 rounded-lg hover:bg-neutral-800 transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateSEOFile}
                    disabled={isCreatingFile}
                    className={`px-4 py-2 rounded-lg font-medium transition ${
                      isCreatingFile
                        ? "bg-neutral-700 text-neutral-400 cursor-not-allowed"
                        : "bg-purple-600 hover:bg-purple-700 text-white"
                    }`}
                  >
                    {isCreatingFile ? "Creating..." : "Create File"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create File Modal */}
      {showCreateFile && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between border-b border-neutral-800 p-4">
              <h2 className="text-xl font-semibold text-white">Create New File</h2>
                <button 
                onClick={() => {
                  if (newFileName.trim() || newFileContent.trim()) {
                  if (
                    confirm(
                    "You have unsaved edits. Are you sure you want to close this modal and lose your changes?"
                    )
                  ) {
                    handleCancelCreateFile();
                  }
                  } else {
                  handleCancelCreateFile();
                  }
                }}
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
                  <div className="flex items-start">
                    <svg className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    <div>
                      <h4 className="font-medium mb-1">File Creation Error</h4>
                      <p>{createFileError}</p>
                    </div>
                  </div>
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
                    <div className="flex items-start">
                      <svg className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                      <div>
                        <h4 className="font-medium mb-1">Invitation Error</h4>
                        <p>{inviteError}</p>
                      </div>
                    </div>
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
                            // For other collaborators                            // For other collaborators, show the editable role dropdown
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
                                        Authorization: `Bearer ${session?.accessToken ?? ""}`,
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

      {/* Custom Field Dialog */}
      {showCustomFieldDialog && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="relative bg-neutral-900 border border-neutral-800 rounded-lg w-full max-w-md">
            <div className="flex items-center justify-between border-b border-neutral-800 p-4">
              <h3 className="text-lg font-semibold text-white">Add Custom Field</h3>
              <button 
                onClick={() => {
                  setShowCustomFieldDialog(false);
                  setCustomFieldName("");
                  setCustomFieldType("text");
                }}
                className="text-neutral-400 hover:text-white"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                  Field Name
                </label>
                <input
                  type="text"
                  value={customFieldName}
                  onChange={(e) => setCustomFieldName(e.target.value)}
                  placeholder="e.g., custom_meta_tag"
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <p className="text-xs text-neutral-400 mt-1">
                  Use lowercase letters, numbers, and underscores only
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                  Field Type
                </label>
                <select
                  value={customFieldType}
                  onChange={(e) => setCustomFieldType(e.target.value as "text" | "textarea" | "array" | "object")}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="text">Text Input (short text)</option>
                  <option value="textarea">Text Area (long text)</option>
                  <option value="array">Array (list of items)</option>
                  <option value="object">Object (nested structure)</option>
                </select>
              </div>
              
              <div className="flex items-center justify-end gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowCustomFieldDialog(false);
                    setCustomFieldName("");
                    setCustomFieldType("text");
                  }}
                  className="px-4 py-2 text-neutral-300 hover:text-white border border-neutral-700 rounded-lg hover:bg-neutral-800 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddCustomField}
                  disabled={!customFieldName.trim()}
                  className={`px-4 py-2 rounded-lg font-medium transition ${
                    !customFieldName.trim()
                      ? "bg-neutral-700 text-neutral-400 cursor-not-allowed"
                      : "bg-blue-600 hover:bg-blue-700 text-white"
                  }`}
                >
                  Add Field
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
