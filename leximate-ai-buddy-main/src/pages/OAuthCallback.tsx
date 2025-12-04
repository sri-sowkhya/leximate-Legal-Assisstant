import React, { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";

export default function OAuthCallback() {
  const navigate = useNavigate();
  const location = useLocation();
  const backend = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

  useEffect(() => {
    const qp = new URLSearchParams(location.search);
    const token = qp.get("token");

    if (token) {
      // 1. Save token
      localStorage.setItem("token", token);

      // 2. Fetch user info using the token
      fetch(`${backend}/api/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(res => res.json())
        .then(data => {
          if (data.user) {
            localStorage.setItem("user", JSON.stringify(data.user));
            navigate("/dashboard");
          } else {
            navigate("/login");
          }
        })
        .catch(() => navigate("/login"));
    } else {
      navigate("/login");
    }
  }, []);

  return <div className="min-h-screen flex items-center justify-center">Signing you in...</div>;
}
