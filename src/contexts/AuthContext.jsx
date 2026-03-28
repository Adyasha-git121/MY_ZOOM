import axios, { HttpStatusCode } from "axios";
import { createContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export const AuthContext = createContext(null);

const client = axios.create({
  baseURL: "http://localhost:8000/api/v1/users",
});

// Attach token to every request automatically
client.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const AuthProvider = ({ children }) => {
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);

  // Restore user session on page refresh
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      // Decode token payload to get basic user info (no library needed)
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        setUserData(payload); // sets name, id, etc. from JWT payload
      } catch {
        localStorage.removeItem("token"); // invalid token, clear it
      }
    }
  }, []);

  const handleRegister = async (name, username, password) => {
    try {
      const response = await client.post("/register", { name, username, password });
      if (response.status === HttpStatusCode.Created) {
        return response.data.message;
      }
    } catch (err) {
      throw err;
    }
  };

  const handleLogin = async (username, password) => {
    try {
      const response = await client.post("/login", { username, password });
      if (response.status === HttpStatusCode.Ok) {
        const { token } = response.data;
        localStorage.setItem("token", token);

        // Decode and store user data from token
        const payload = JSON.parse(atob(token.split(".")[1]));
        setUserData(payload);

        navigate("/");
      }
    } catch (err) {
      throw err;
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    setUserData(null);
    navigate("/auth");
  };

  return (
    <AuthContext.Provider value={{ userData, setUserData, handleRegister, handleLogin, handleLogout }}>
      {children}
    </AuthContext.Provider>
  );
};