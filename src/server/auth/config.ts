import { type DefaultSession, type NextAuthOptions } from "next-auth";
import { type JWT } from "next-auth/jwt";

import { env } from "~/env.mjs";
import { edgedbClient } from "~/server/edgedb";

import { EdgeDBAdapter } from "./adapters/edgedb";
import RollupProvider, { type RollupProfile } from "./providers/rollup";

/**
 * Module augmentation for `next-auth` types. Allows us to add custom properties to the `session`
 * object and keep type safety.
 *
 * @see https://next-auth.js.org/getting-started/typescript#module-augmentation
 */
declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
      // ...other properties
      // role: UserRole;
    } & DefaultSession["user"];
  }

  // interface User {
  //   // ...other properties
  //   // role: UserRole;
  // }
}

const edgedbAdapter = new EdgeDBAdapter(edgedbClient);

/**
 * Options for NextAuth.js used to configure adapters, providers, callbacks, etc.
 *
 * @see https://next-auth.js.org/configuration/options
 */
export const authOptions: NextAuthOptions = {
  callbacks: {
    session: async (opts: {
      session: DefaultSession;
      token: JWT;
      user: unknown; // not provided when using an adapter
    }) => {
      const { session, token } = opts;

      const { sub } = token;
      if (!sub) {
        throw new Error("Unauthorized: no sub in token");
      }

      const user = await edgedbAdapter.getUser(sub);
      if (!user) {
        throw new Error("Unauthorized: user not found");
      }

      return {
        ...session,
        user: {
          ...session.user,
          id: user.id,
        },
      };
    },
  },
  adapter: edgedbAdapter,
  providers: [
    RollupProvider({
      clientId: env.ROLLUP_CLIENT_ID,
      clientSecret: env.ROLLUP_CLIENT_SECRET,
      authorization: {
        params: {
          scope: "openid email profile erc_4337",
          prompt: "consent", // always ask for authorization
        },
      },
      httpOptions: {
        timeout: 10000, // latency on the authorize endpoint seems higher than the default
      },
      profile(userinfo: RollupProfile) {
        return {
          id: userinfo.sub,
          email: userinfo.email,
          name: userinfo.name,
          image: userinfo.picture,
          // TODO: add support for these in edgedb adapter
          // connected_accounts: userinfo.connected_accounts,
          // erc_4337: userinfo.erc_4337,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
};
