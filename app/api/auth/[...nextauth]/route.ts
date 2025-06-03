import NextAuth from "next-auth";
import GitHubProvider from "next-auth/providers/github";

const handler = NextAuth({
  providers: [
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: "repo user:email",
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
    async signIn({ user, account, profile, email, credentials }) {
      console.log("SignIn callback triggered:", { user: user?.email, account: account?.provider });
      return true;
    },
    async redirect({ url, baseUrl }) {
      console.log("Redirect callback:", { url, baseUrl, env: process.env.NODE_ENV });
      
      // Simplified redirect logic
      if (url.startsWith("/")) {
        return `${baseUrl}${url}`;
      }
      
      // For same origin
      if (url.startsWith(baseUrl)) {
        return url;
      }
      
      // Default redirect
      return `${baseUrl}/dashboard`;
    },
  },
  pages: {
    signIn: "/signin",
    error: "/signin",
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: true, // Enable debug for both dev and prod temporarily
  events: {
    async signIn(message) {
      console.log("SignIn event:", message);
    },
    async signOut(message) {
      console.log("SignOut event:", message);
    },
    async createUser(message) {
      console.log("CreateUser event:", message);
    },
    async session(message) {
      console.log("Session event:", message);
    },
  },
  logger: {
    error(code, metadata) {
      console.error("NextAuth Error:", code, metadata);
    },
    warn(code) {
      console.warn("NextAuth Warning:", code);
    },
    debug(code, metadata) {
      console.log("NextAuth Debug:", code, metadata);
    },
  },
});

export { handler as GET, handler as POST };