import { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import axios from "axios";

const AuthContext = createContext(null);

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const AuthProvider = ({ children }) => {
  const [token, setTokenState] = useState(() => localStorage.getItem("token") || "");
  const [user, setUserState] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  const persistAuth = useCallback((nextToken, nextUser) => {
    if (nextToken) {
      localStorage.setItem("token", nextToken);
    } else {
      localStorage.removeItem("token");
    }

    if (nextUser) {
      localStorage.setItem("user", JSON.stringify(nextUser));
    } else {
      localStorage.removeItem("user");
    }

    setTokenState(nextToken || "");
    setUserState(nextUser || null);
  }, []);

  const clearAuth = useCallback(() => {
    persistAuth("", null);
  }, [persistAuth]);

  const refreshUser = useCallback(async () => {
    const currentToken = localStorage.getItem("token") || token;

    if (!currentToken) {
      clearAuth();
      return null;
    }

    try {
      const response = await axios.get(`${API}/auth/me`, {
        headers: {
          Authorization: `Bearer ${currentToken}`,
        },
      });

      const syncedUser = response.data || null;
      persistAuth(currentToken, syncedUser);
      return syncedUser;
    } catch (error) {
      console.error("Auth refresh failed:", error?.response?.data || error.message);
      clearAuth();
      return null;
    }
  }, [token, persistAuth, clearAuth]);

  useEffect(() => {
    const syncAuth = async () => {
      setLoading(true);

      const currentToken = localStorage.getItem("token") || token;

      if (!currentToken) {
        setUserState(null);
        setLoading(false);
        return;
      }

      try {
        const response = await axios.get(`${API}/auth/me`, {
          headers: {
            Authorization: `Bearer ${currentToken}`,
          },
        });

        const syncedUser = response.data || null;
        persistAuth(currentToken, syncedUser);
      } catch (error) {
        console.error("Auth sync failed:", error?.response?.data || error.message);
        clearAuth();
      } finally {
        setLoading(false);
      }
    };

    syncAuth();
  }, [token, persistAuth, clearAuth]);

  const login = async (email, password) => {
    try {
      const response = await axios.post(`${API}/auth/login`, {
        email,
        password,
      });

      const accessToken = response.data?.access_token || "";
      const loggedInUser = response.data?.user || null;

      persistAuth(accessToken, loggedInUser);

      return { data: response.data, error: null };
    } catch (error) {
      console.error("Login failed:", error?.response?.data || error.message);
      return {
        data: null,
        error: {
          message:
            error?.response?.data?.detail ||
            error?.response?.data?.message ||
            "Login failed",
        },
      };
    }
  };

  const register = async (name, email, password) => {
    try {
      const response = await axios.post(`${API}/auth/register`, {
        name,
        email,
        password,
      });

      const accessToken = response.data?.access_token || "";
      const newUser = response.data?.user || null;

      persistAuth(accessToken, newUser);

      return { data: response.data, error: null };
    } catch (error) {
      console.error("Register failed:", error?.response?.data || error.message);
      return {
        data: null,
        error: {
          message:
            error?.response?.data?.detail ||
            error?.response?.data?.message ||
            "Registration failed",
        },
      };
    }
  };

  const logout = () => {
    clearAuth();
  };

  const setToken = (nextToken) => {
    const safeToken = nextToken || "";
    setTokenState(safeToken);

    if (safeToken) {
      localStorage.setItem("token", safeToken);
    } else {
      localStorage.removeItem("token");
    }
  };

  const setUser = (nextUser) => {
    setUserState(nextUser || null);

    if (nextUser) {
      localStorage.setItem("user", JSON.stringify(nextUser));
    } else {
      localStorage.removeItem("user");
    }
  };

  const updateUser = (updates) => {
    setUserState((prevUser) => {
      const mergedUser = {
        ...(prevUser || {}),
        ...(updates || {}),
      };

      localStorage.setItem("user", JSON.stringify(mergedUser));
      return mergedUser;
    });
  };

  const checkPlanAccess = (requiredPlan) => {
    if (!requiredPlan) return true;
    if (!user) return false;

    const planHierarchy = {
      basic: 1,
      premium: 2,
    };

    const userPlan = String(user?.plan || "basic").toLowerCase();
    const required = String(requiredPlan || "basic").toLowerCase();

    return (planHierarchy[userPlan] || 0) >= (planHierarchy[required] || 0);
  };

  const hasActiveAccess =
    user?.subscription_status === "trial" ||
    user?.subscription_status === "active";

  const value = useMemo(
    () => ({
      token,
      setToken,
      user,
      setUser,
      updateUser,
      refreshUser,
      loading,
      login,
      register,
      logout,
      checkPlanAccess,
      isAuthenticated: !!token,
      hasActiveAccess,
    }),
    [token, user, loading, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
};
