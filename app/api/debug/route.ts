import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    hasGithubId: !!process.env.GITHUB_ID,
    hasGithubSecret: !!process.env.GITHUB_SECRET,
    hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
    hasNextAuthUrl: !!process.env.NEXTAUTH_URL,
    githubIdLength: process.env.GITHUB_ID?.length || 0,
    nextAuthUrl: process.env.NEXTAUTH_URL,
    // Show actual values (temporarily for debugging)
    actualSecret: process.env.NEXTAUTH_SECRET ? "exists" : "missing",
    allEnvKeys: Object.keys(process.env).filter(key => key.includes('NEXTAUTH')),
  });
}