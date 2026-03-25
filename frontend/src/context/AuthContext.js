import { createContext, useContext, useEffect, useMemo, useState } from "react";
import axios from "axios";

const AuthContext = createContext(null);

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const syncAuth = async () => {
      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        const response = await axios.get(`${API}/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        setUser(response.data);
        localStorage.setItem("user", JSON.stringify(response.data));
      } catch (error) {
        console.error("Auth sync failed:", error);
        setToken("");
        setUser(null);
        localStorage.removeItem("token");
        localStorage.removeItem("user");
      } finally {
        setLoading(false);
      }
    };

    syncAuth();
  }, [token]);

  const login = async (email, password) => {
    try {
      const response = await axios.post(`${API}/auth/login`, {
        email,
        password,
      });

      const accessToken = response.data?.access_token || "";
      const loggedInUser = response.data?.user || null;

      setToken(accessToken);
      setUser(loggedInUser);

      localStorage.setItem("token", accessToken);
      localStorage.setItem("user", JSON.stringify(loggedInUser));

      return { data: response.data, error: null };
    } catch (error) {
      console.error("Login failed:", error);
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

      setToken(accessToken);
      setUser(newUser);

      localStorage.setItem("token", accessToken);
      localStorage.setItem("user", JSON.stringify(newUser));

      return { data: response.data, error: null };
    } catch (error) {
      console.error("Register failed:", error);
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
    setToken("");
    setUser(null);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  };

  const value = useMemo(
    () => ({
      token,
      setToken,
      user,
      setUser,
      loading,
      login,
      register,
      logout,
      isAuthenticated: !!token && !!user,
    }),
    [token, user, loading]
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
