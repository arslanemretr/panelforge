import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";

interface Props {
  children: React.ReactNode;
  /** Gerekli minimum yetki seviyesi */
  require?: "operator" | "engineer" | "admin";
}

export function RequireAuth({ children, require: need }: Props) {
  const { user, isOperator, isEngineer, isAdmin } = useAuthStore();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (need === "admin"    && !isAdmin())    return <Navigate to="/projects" replace />;
  if (need === "engineer" && !isEngineer()) return <Navigate to="/projects" replace />;
  if (need === "operator" && !isOperator()) return <Navigate to="/projects" replace />;

  return <>{children}</>;
}
