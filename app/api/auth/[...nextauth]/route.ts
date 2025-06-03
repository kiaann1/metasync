import NextAuth from "next-auth";
import GitHubProvider from "next-auth/providers/github";

const handler = NextAuth({
  providers: [
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: "repo user:email read:user",
        },
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 hours
  },
  callbacks: {
    async jwt({ token, account, user }) {
      if (account && user) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.username = user.email;
      }
      return token;
    },
    async session({ session, token }) {
      if (token.accessToken) {
        session.accessToken = token.accessToken as string;
      }
      return session;
    },
    async signIn({ user, account, profile }) {
      // Allow sign in
      return true;
    },
    async redirect({ url, baseUrl }) {
      // Force production URL in production environment
      const isProduction = process.env.NODE_ENV === "production";
      const productionUrl = "https://metasynccms.vercel.app";
      const currentBaseUrl = isProduction ? productionUrl : baseUrl;

      // Allows relative callback URLs
      if (url.startsWith("/")) {
        return `${currentBaseUrl}${url}`;
      }

      // Check if URL is on the same origin as our production/development URL
      try {
        const urlObj = new URL(url);
        const baseUrlObj = new URL(currentBaseUrl);

        if (urlObj.origin === baseUrlObj.origin) {
          return url;
        }
      } catch (error) {
        console.error("Error parsing URLs in redirect:", error);
      }

      // Default to dashboard
      return `${currentBaseUrl}/dashboard`;
    },
  },
  pages: {
    signIn: "/signin",
    error: "/signin",
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === "development",
});

export { handler as GET, handler as POST };