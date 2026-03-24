import { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "../supabase";

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  const buildUserObject = (authUser) => {
    if (!authUser) return null;

    return {
      id: authUser.id,
      email: authUser.email,
      name: authUser.user_metadata?.name || "",
      plan: authUser.user_metadata?.plan || "basic",
      raw: authUser,
    };
  };

  const refreshUser = async () => {
    try {
      const {
        data: { user: authUser },
        error,
      } = await supabase.auth.getUser();

      if (error) throw error;

      setUser(buildUserObject(authUser));
      return authUser;
    } catch (error) {
      console.error("Failed to refresh user:", error);
      setUser(null);
      return null;
    }
  };

  useEffect(() => {
    const loadSession = async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) throw error;

        setToken(session?.access_token || null);
        setUser(buildUserObject(session?.user || null));
      } catch (error) {
        console.error("Failed to load session:", error);
        setToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setToken(session?.access_token || null);
      setUser(buildUserObject(session?.user || null));
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;

    setToken(data?.session?.access_token || null);
    setUser(buildUserObject(data?.user || null));

    return { data, error: null };
  };

  const register = async (name, email, password) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          plan: "basic",
        },
      },
    });

    if (error) throw error;

    setToken(data?.session?.access_token || null);
    setUser(buildUserObject(data?.user || null));

    return { data, error: null };
  };

  const logout = async () => {
    const { error } = await supabase.auth.signOut();

    if (error) throw error;

    setToken(null);
    setUser(null);
  };

  const updatePlan = async (plan, billingCycle) => {
    const { data, error } = await supabase.auth.updateUser({
      data: {
        ...user?.raw?.user_metadata,
        name: user?.name || "",
        plan,
        billingCycle,
      },
    });

    if (error) throw error;

    setUser(buildUserObject(data?.user || null));

    return { success: true, plan, billingCycle };
  };

  const getAuthHeader = () => ({
    headers: { Authorization: `Bearer ${token}` },
  });

  const checkPlanAccess = (requiredPlan) => {
    const planHierarchy = { basic: 1, premium: 2, enterprise: 3 };
    const userLevel = planHierarchy[user?.plan] || 1;
    const requiredLevel = planHierarchy[requiredPlan] || 1;
    return userLevel >= requiredLevel;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        register,
        logout,
        updatePlan,
        getAuthHeader,
        checkPlanAccess,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
