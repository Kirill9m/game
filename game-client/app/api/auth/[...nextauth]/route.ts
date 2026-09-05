import NextAuth from "next-auth";
import GithubProvider from "next-auth/providers/github";

const handler = NextAuth({
  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_ID || "",
      clientSecret: process.env.GITHUB_SECRET || "",
    }),
  ],
  callbacks: {
    async jwt({ token, profile }) {
      if (profile) {
        token.githubId = String(profile.id);
        token.username = profile.login || profile.name;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.githubId = token.githubId as string | undefined;
        session.user.username = token.username as string | undefined;
      }
      return session;
    },
  },
});

export { handler as GET, handler as POST };
