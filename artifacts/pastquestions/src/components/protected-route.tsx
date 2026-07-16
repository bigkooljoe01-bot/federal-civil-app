import React from "react";
import { useLocalAuth } from "@/hooks/use-local-auth";
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
  const { isAuthenticated, isLoading } = useLocalAuth();
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
    return <Redirect to="/login" />;
  }

  if (adminOnly && user?.role !== "admin") {
    return <Redirect to="/practice" />;
  }

  return <Component {...rest} />;
}
