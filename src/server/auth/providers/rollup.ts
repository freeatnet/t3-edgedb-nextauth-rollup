/**
 * Rollup.id OAuth Provider
 * @see https://github.com/proofzero/example-apps/blob/08002c1331ce25607c306b9e207df21c364e1dc0/nextjs/pages/api/auth/%5B...nextauth%5D.ts#L5
 */
import { type OAuthConfig, type OAuthUserConfig } from "next-auth/providers";
import { z } from "zod";

const USERINFO_SCHEMA = z.object({
  sub: z.string(),
  name: z.string(),
  picture: z.string().url(),
  email: z.string().email(),
  connected_accounts: z
    .array(
      z.object({
        type: z.string(),
        identifier: z.string(),
      })
    )
    .optional(),
  erc_4337: z
    .array(
      z.object({
        nickname: z.string(),
        address: z.string(),
      })
    )
    .optional(),
});

export type RollupProfile = z.infer<typeof USERINFO_SCHEMA>;

export default function Rollup<P extends RollupProfile>(
  options: OAuthUserConfig<P>
): OAuthConfig<P> {
  return {
    id: "rollup",
    name: "Rollup ID",
    type: "oauth",
    wellKnown: `https://passport.rollup.id/.well-known/openid-configuration`,
    client: {
      authorization_signed_response_alg: "ES256",
      id_token_signed_response_alg: "ES256",
    },
    authorization: {
      params: {
        scope: "openid email profile connected_accounts",
        prompt: "consent", // always ask for authorization
      },
    },
    idToken: true,
    checks: ["state"],
    token: `https://passport.rollup.id/token`,
    userinfo: {
      url: `https://passport.rollup.id/userinfo`,
      /**
       * Fetch extended userinfo, including email, connected accounts, erc4337 props.
       *
       * NB: defining this function is required to force-fetch userinfo when using `idToken: true`
       * see https://github.com/nextauthjs/next-auth/discussions/4164
       *
       * @returns RollupProfile - the extended userinfo
       */
      async request({ tokens: { access_token }, client }) {
        if (!access_token) {
          throw new Error("no access token provided");
        }

        const userinfo = await client.userinfo(access_token);
        return USERINFO_SCHEMA.parse(userinfo);
      },
    },
    profile(userinfo) {
      return {
        id: userinfo.sub,
        email: userinfo.email,
        name: userinfo.name,
        image: userinfo.picture,
        connected_accounts: userinfo.connected_accounts,
        erc_4337: userinfo.erc_4337,
      };
    },
    // NextAuth will deep-merge `options` with the default provider configuration above
    options,
  };
}
