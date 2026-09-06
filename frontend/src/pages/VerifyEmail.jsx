import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import axios from "axios";

export default function VerifyEmail() {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const [message, setMessage] = useState("Verifying your email...");

  useEffect(() => {
    const token = params.get("token");

    if (!token) {
      setMessage("Invalid verification link.");

      setTimeout(() => {
        navigate("/login");
      }, 3000);

      return;
    }

    axios
      .get(`/api/auth/verify-email?token=${token}`)
      .then((res) => {
        setMessage(res.data.message);

        setTimeout(() => {
          navigate("/login");
        }, 3000);
      })
      .catch((err) => {
        setMessage(
          err.response?.data?.message || "Verification failed."
        );

        setTimeout(() => {
          navigate("/login");
        }, 3000);
      });
  }, [params, navigate]);

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
        fontSize: "22px",
      }}
    >
      {message}
    </div>
  );
}