import NextAuth from "next-auth";
import GitHubProvider from "next-auth/providers/github";

// Remove the duplicate declare module statements since they're in next-auth.d.ts

// Define GitHub profile type
interface GitHubProfile {
  login: string;
  id: number;
  avatar_url: string;
  name: string;
  email: string;
  [key: string]: any;
}

const handler = NextAuth({
  providers: [
    GitHubProvider({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
      authorization: {
        params: {
          scope: "read:user user:email repo",
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account) {
        token.accessToken = account.access_token;
      }
      if (profile) {
        const githubProfile = profile as GitHubProfile;
        token.login = githubProfile.login;
      }
      return token;
    },
    async session({ session, token }) {
      if (token.accessToken) {
        (session as any).accessToken = token.accessToken;
      }
      if (token.login) {
        session.user.login = token.login;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/signin",
    error: "/auth/error",
  },
});

export { handler as GET, handler as POST };