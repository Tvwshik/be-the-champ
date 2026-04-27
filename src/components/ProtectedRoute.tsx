import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { ReactNode } from "react";

export function ProtectedRoute({ children, staffOnly = false }: { children: ReactNode; staffOnly?: boolean }) {
  const { user, loading, isStaff } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading…</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to={`/auth?next=${encodeURIComponent(location.pathname)}`} replace />;
  }

  if (staffOnly && !isStaff) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
