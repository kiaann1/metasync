export async function GET() {
  return Response.json({ 
    message: "Environment check",
    env: {
      hasGithubId: !!process.env.GITHUB_ID,
      hasGithubSecret: !!process.env.GITHUB_SECRET,
      hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
      hasNextAuthUrl: !!process.env.NEXTAUTH_URL,
      nextAuthSecretLength: process.env.NEXTAUTH_SECRET?.length || 0,
      nodeEnv: process.env.NODE_ENV,
      // Show actual values for debugging (remove after testing)
      githubIdPreview: process.env.GITHUB_ID?.substring(0, 8) || "missing",
      secretPreview: process.env.NEXTAUTH_SECRET?.substring(0, 10) || "missing",
    }
  });
}