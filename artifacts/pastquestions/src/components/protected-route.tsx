import React from "react";
import { useAuth } from "@workspace/replit-auth-web";
import { Redirect } from "wouter";
import { useGetMe } from "@workspace/api-client-react";
import { Loader2 } from "lucide-react";

export function ProtectedRoute({
  component: Component,
  adminOnly = false,
  ...rest
}: {
  component: React.ComponentType<any>;
  adminOnly?: boolean;
  [key: string]: any;
}) {
  const { isAuthenticated, isLoading, login } = useAuth();
  const { data: user, isLoading: userLoading } = useGetMe({
    query: {
      enabled: isAuthenticated,
    },
  });

  if (isLoading || (isAuthenticated && userLoading)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    login();
    return null;
  }

  if (adminOnly && user?.role !== "admin") {
    return <Redirect to="/dashboard" />;
  }

  return <Component {...rest} />;
}
