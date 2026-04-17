import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import { supabase } from "../lib/supabase";

type Profile = {
  id: string;
  full_name: string | null;
  email: string | null;
};

type AuthUser = {
  id: string;
  email: string | null;
};

type RoleCode = "admin" | "customer" | "partner" | null;

type AuthContextType = {
  user: AuthUser | null;
  profile: Profile | null;
  role: RoleCode;
  loading: boolean;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function normalizeRoleCode(value: unknown): RoleCode {
  if (value === "admin" || value === "customer" || value === "partner") {
    return value;
  }
  return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<RoleCode>(null);
  const [loading, setLoading] = useState(true);

  const activeRequestRef = useRef(0);

  const loadProfileAndRole = useCallback(async (userId: string) => {
    const requestId = ++activeRequestRef.current;

    try {
      const profilePromise = supabase
        .from("profiles")
        .select("id, full_name, email")
        .eq("id", userId)
        .maybeSingle();

      const userRolePromise = supabase
        .from("user_roles")
        .select("role_id")
        .eq("user_id", userId)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      const [profileRes, userRoleRes] = await Promise.all([
        profilePromise,
        userRolePromise,
      ]);

      if (requestId !== activeRequestRef.current) return;

      if (profileRes.error) {
        console.error("AuthContext profile error:", profileRes.error.message);
        setProfile(null);
      } else {
        setProfile((profileRes.data as Profile | null) ?? null);
      }

      if (userRoleRes.error) {
        console.error("AuthContext user_roles error:", userRoleRes.error.message);
        setRole(null);
        return;
      }

      const roleId = (userRoleRes.data as { role_id?: string } | null)?.role_id;

      if (!roleId) {
        setRole(null);
        return;
      }

      const roleLookupRes = await supabase
        .from("roles")
        .select("code")
        .eq("id", roleId)
        .maybeSingle();

      if (requestId !== activeRequestRef.current) return;

      if (roleLookupRes.error) {
        console.error("AuthContext roles lookup error:", roleLookupRes.error.message);
        setRole(null);
        return;
      }

      const roleCode = (roleLookupRes.data as { code?: unknown } | null)?.code;
      setRole(normalizeRoleCode(roleCode));
    } catch (error) {
      if (requestId !== activeRequestRef.current) return;

      console.error("AuthContext loadProfileAndRole unexpected error:", error);
      setProfile(null);
      setRole(null);
    }
  }, []);

  const applySession = useCallback(
    async (sessionUser: { id: string; email?: string | null } | null) => {
      if (!sessionUser) {
        activeRequestRef.current += 1;
        setUser(null);
        setProfile(null);
        setRole(null);
        return;
      }

      setUser({
        id: sessionUser.id,
        email: sessionUser.email ?? null,
      });

      await loadProfileAndRole(sessionUser.id);
    },
    [loadProfileAndRole]
  );

  const refreshProfile = useCallback(async () => {
    if (!user?.id) return;
    await loadProfileAndRole(user.id);
  }, [loadProfileAndRole, user?.id]);

  useEffect(() => {
    let isMounted = true;

    const runSessionSync = async (
      sessionUser: { id: string; email?: string | null } | null
    ) => {
      if (!isMounted) return;

      setLoading(true);

      try {
        await applySession(sessionUser);
      } catch (error) {
        if (!isMounted) return;

        console.error("AuthContext session sync error:", error);
        activeRequestRef.current += 1;
        setUser(null);
        setProfile(null);
        setRole(null);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    const initAuth = async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          console.error("AuthContext getSession error:", error.message);
        }

        await runSessionSync(session?.user ?? null);
      } catch (error) {
        if (!isMounted) return;

        console.error("AuthContext initAuth error:", error);
        activeRequestRef.current += 1;
        setUser(null);
        setProfile(null);
        setRole(null);
        setLoading(false);
      }
    };

    void initAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      void runSessionSync(session?.user ?? null);
    });

    return () => {
      isMounted = false;
      activeRequestRef.current += 1;
      subscription.unsubscribe();
    };
  }, [applySession]);

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      profile,
      role,
      loading,
      refreshProfile,
    }),
    [user, profile, role, loading, refreshProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}