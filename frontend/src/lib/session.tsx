import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { authClient } from "./api-client";
import type { User } from "./types";

interface SessionCtx {
  user: User | null;
  loading: boolean;
  login: (email: string) => Promise<void>;
  logout: () => Promise<void>;
}

const Ctx = createContext<SessionCtx>({ user: null, loading: true, login: async () => {}, logout: async () => {} });

export function SessionProvider({ children }: { children: ReactNode }) {
  const { data, isPending } = authClient.useSession();
  const [user, setUser] = useState<User | null>(null);
  const [roleLoading, setRoleLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function fetchRoleAndSetUser() {
      if (data?.user) {
        setRoleLoading(true);
        try {
          if (!process.env.NEXT_PUBLIC_API_URL) {
            throw new Error("NEXT_PUBLIC_API_URL is not defined in the environment variables!");
          }
          const baseUrl = process.env.NEXT_PUBLIC_API_URL.replace("/api/v1", "/api/auth");
            
          const res = await fetch(`${baseUrl}/me/role`, { credentials: "include" });
          const roleData = await res.json();
          
          if (mounted) {
            setUser({
              id: data.user.id,
              name: data.user.name,
              email: data.user.email,
              role: roleData.role || "Viewer",
            });
          }
        } catch (err) {
          if (mounted) {
            setUser({
              id: data.user.id,
              name: data.user.name,
              email: data.user.email,
              role: "Viewer",
            });
          }
        } finally {
          if (mounted) setRoleLoading(false);
        }
      } else {
        setUser(null);
        setRoleLoading(false);
      }
    }

    if (!isPending) {
      fetchRoleAndSetUser();
    }

    return () => {
      mounted = false;
    };
  }, [data, isPending]);

  return (
    <Ctx.Provider
      value={{
        user,
        loading: isPending || roleLoading,
        login: async (email) => {
          const { error } = await authClient.signIn.email({
            email,
            password: "password123",
          });
          if (error) throw error;
        },
        logout: async () => {
          await authClient.signOut();
        },
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export const useSession = () => useContext(Ctx);
