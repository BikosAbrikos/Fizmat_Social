import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ padding: 32, textAlign: "center" }}>Loading...</div>;
  return user ? children : <Navigate to="/login" replace />;
}
