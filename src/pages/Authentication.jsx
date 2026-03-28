import React, { useState, useContext } from "react";
import "./Authentication.css";
import { useForm } from "react-hook-form";
import { AuthContext } from "../contexts/AuthContext.jsx";
import { Snackbar, Alert } from "@mui/material";

export default function Authentication() {
  const [isLogin, setIsLogin] = useState(true);
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");

  const { register, handleSubmit } = useForm();
  const { handleRegister, handleLogin } = useContext(AuthContext);

  const handleClose = () => setOpen(false);

  const onSubmit = async (data) => {
    try {
      if (isLogin) {
        await handleLogin(data.username, data.password);
        setMessage("Login successful");
      } else {
        const result = await handleRegister(data.name, data.username, data.password);
        setMessage(result || "Signup successful");
      }
      setOpen(true);
    } catch (err) {
      const msg = err?.response?.data?.message || "Something went wrong";
      setMessage(msg);
      setOpen(true);
    }
  };

  return (
    <>
      <div className="auth-container">
        <div className="auth-box">
          <h2>{isLogin ? "Login" : "Signup"}</h2>

          <form onSubmit={handleSubmit(onSubmit)}>

            {/* Full Name - only on Signup */}
            {!isLogin && (
              <input
                type="text"
                placeholder="Full Name"
                {...register("name")}
              />
            )}

            {/* Username - both Login and Signup */}
            <input
              type="text"
              placeholder="Username"
              {...register("username")}
            />

            {/* Password - both */}
            <input
              type="password"
              placeholder="Password"
              {...register("password")}
            />

            <button type="submit">
              {isLogin ? "Login" : "Signup"}
            </button>
          </form>

          <p className="toggle" onClick={() => setIsLogin(!isLogin)}>
            {isLogin
              ? "Don't have an account? Signup"
              : "Already have an account? Login"}
          </p>
        </div>
      </div>

      {/* Snackbar notification */}
      <Snackbar open={open} autoHideDuration={4000} onClose={handleClose}>
        <Alert onClose={handleClose} severity="info" sx={{ width: "100%" }}>
          {message}
        </Alert>
      </Snackbar>
    </>
  );
}