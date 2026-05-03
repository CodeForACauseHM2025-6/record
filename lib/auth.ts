import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  adapter: PrismaAdapter(prisma),
  pages: {
    error: "/auth-error",
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user, profile }) {
      // Source of truth is the OAuth profile (always populated by Google). After Phase 5 the
      // legacy User.email column is NULL on disk; the Prisma extension synthesizes it from the
      // envelope ciphertext on read, but adapter-level lookups can land in the callback before
      // that synthesis applies, so we check the raw profile email too.
      const email = (profile as { email?: string } | null)?.email ?? user.email;
      if (!email?.endsWith("@horacemann.org")) {
        return false;
      }
      // Persist the Google profile image so it survives custom uploads
      const googleImage = (profile as { picture?: string })?.picture ?? user.image;
      if (googleImage && user.id) {
        await prisma.user.update({
          where: { id: user.id },
          data: { googleImage },
        }).catch(() => {
          // User may not exist yet on first sign-in (adapter creates after)
        });
      }
      return true;
    },
    async session({ session, user }) {
      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { id: true, role: true, isAdmin: true, image: true, googleImage: true },
      });
      if (dbUser) {
        session.user.id = dbUser.id;
        session.user.role = dbUser.role;
        session.user.isAdmin = dbUser.role === "WEB_TEAM" || dbUser.role === "WEB_MASTER";
        // If googleImage not set yet, seed it from the current image
        if (!dbUser.googleImage && dbUser.image && !(dbUser.image as string).startsWith("data:")) {
          await prisma.user.update({
            where: { id: user.id },
            data: { googleImage: dbUser.image as string },
          });
        }
      }
      return session;
    },
  },
});
