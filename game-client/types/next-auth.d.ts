import "next-auth";

declare module "next-auth" {
  interface Profile {
    id?: string | number;
    login?: string;
  }

  interface Session {
    user: {
      githubId?: string;
      username?: string;
    } & DefaultSession["user"];
  }
}
