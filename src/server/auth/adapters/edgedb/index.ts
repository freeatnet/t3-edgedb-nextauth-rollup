import { type Executor } from "edgedb";
import { type Awaitable } from "next-auth";
import {
  type Adapter,
  type AdapterAccount,
  type AdapterSession,
  type AdapterUser,
} from "next-auth/adapters";

import * as queries from "./queries";

export class EdgeDBAdapter implements Adapter<false> {
  constructor(private edgedbClient: Executor) {}

  createUser = async (user: Omit<AdapterUser, "id">): Promise<AdapterUser> => {
    const { email, emailVerified, name, image, ...restUser } = user;

    if (Object.keys(restUser).length > 0) {
      throw new Error(
        `Unsupported user properties: ${Object.keys(restUser).join(", ")}`
      );
    }

    return await queries.createUser(this.edgedbClient, {
      email,
      emailVerified,
      name,
      image,
    });
  };

  getUser = async (id: string): Promise<AdapterUser | null> => {
    return await queries.getUser(this.edgedbClient, { id });
  };

  getUserByEmail = async (email: string): Promise<AdapterUser | null> => {
    return await queries.getUserByEmail(this.edgedbClient, { email });
  };

  getUserByAccount = async (
    providerAccountRef: Pick<AdapterAccount, "provider" | "providerAccountId">
  ): Promise<AdapterUser | null> => {
    const { provider, providerAccountId } = providerAccountRef;
    return await queries.getUserByAccount(this.edgedbClient, {
      provider,
      providerAccountId,
    });
  };

  updateUser = async (
    user: Partial<AdapterUser> & Pick<AdapterUser, "id">
  ): Promise<AdapterUser> => {
    const { id, email, emailVerified, name, image, ...restUser } = user;

    if (Object.keys(restUser).length > 0) {
      throw new Error(
        `Unsupported user properties: ${Object.keys(restUser).join(", ")}`
      );
    }

    const updated = await queries.updateUser(this.edgedbClient, {
      id,
      email,
      emailVerified,
      name,
      image,
    });

    if (!updated) {
      throw Error("user not found");
    }

    return updated;
  };

  deleteUser = undefined;

  linkAccount = async (account: AdapterAccount): Promise<void> => {
    const {
      type,
      provider,
      providerAccountId,
      access_token,
      refresh_token,
      expires_at,
      token_type,
      scope,
      id_token,
      session_state,
      userId,
      ...restAccount
    } = account;

    if (Object.keys(restAccount).length > 0) {
      throw new Error(
        `Unsupported account properties: ${Object.keys(restAccount).join(", ")}`
      );
    }

    await queries.createLinkedAccount(this.edgedbClient, {
      type,
      provider,
      providerAccountId,
      access_token,
      refresh_token,
      expires_at,
      token_type,
      scope,
      id_token,
      session_state,
      userId,
    });
  };

  unlinkAccount = undefined;

  createSession = (_session: {
    sessionToken: string;
    userId: string;
    expires: Date;
  }): Awaitable<AdapterSession> => {
    throw new Error("Method not implemented.");
  };

  getSessionAndUser = (
    _sessionToken: string
  ): Awaitable<{ session: AdapterSession; user: AdapterUser } | null> => {
    throw new Error("Method not implemented.");
  };

  updateSession = (
    _session: Partial<AdapterSession> & Pick<AdapterSession, "sessionToken">
  ): Awaitable<AdapterSession | null | undefined> => {
    throw new Error("Method not implemented.");
  };

  deleteSession = (
    _sessionToken: string
  ): Promise<void> | Awaitable<AdapterSession | null | undefined> => {
    throw new Error("Method not implemented.");
  };

  createVerificationToken = undefined;
  useVerificationToken = undefined;
}
