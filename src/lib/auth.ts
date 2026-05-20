import { NextAuthOptions, getServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { totpVerify } from "./totp";
import { prisma } from "./prisma";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      id: "credentials",
      name: "Credenziali",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase() },
        });

        if (!user || !user.active) return null;

        const valid = await compare(credentials.password, user.password);
        if (!valid) return null;

        if (user.totpEnabled) {
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            pendingTotp: true,
          } as never;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
    CredentialsProvider({
      id: "totp",
      name: "TOTP",
      credentials: {
        userId: { label: "User ID", type: "text" },
        code: { label: "Codice", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.userId || !credentials?.code) return null;

        const user = await prisma.user.findUnique({
          where: { id: credentials.userId },
        });

        if (!user || !user.active || !user.totpEnabled || !user.totpSecret) return null;

        const valid = totpVerify(credentials.code, user.totpSecret);
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        const u = user as { role?: string; pendingTotp?: boolean };
        if (u.pendingTotp) {
          token.pendingTotp = true;
        } else {
          token.role = u.role;
          token.pendingTotp = false;
        }
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.pendingTotp = (token.pendingTotp as boolean) ?? false;
      }
      return session;
    },
  },
};

export const getAuth = () => getServerSession(authOptions);
