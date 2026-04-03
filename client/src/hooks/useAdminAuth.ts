import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { useEffect } from "react";

export function useAdminAuth() {
  const { data: adminUser, isLoading } = trpc.adminAuth.me.useQuery(undefined, {
    retry: false,
    staleTime: 30_000,
  });

  const utils = trpc.useUtils();
  const [, navigate] = useLocation();

  // Redirecionar para login se não autenticado
  useEffect(() => {
    if (!isLoading && !adminUser) {
      navigate("/admin/login");
    }
  }, [adminUser, isLoading, navigate]);

  const logoutMutation = trpc.adminAuth.logout.useMutation({
    onSuccess: () => {
      // Limpar token JWT do localStorage
      try {
        localStorage.removeItem("admin_token");
      } catch {}
      utils.adminAuth.me.invalidate();
      navigate("/admin/login");
    },
  });

  return {
    adminUser: adminUser ?? null,
    isLoading,
    isAuthenticated: !!adminUser,
    logout: () => logoutMutation.mutate(),
    isLoggingOut: logoutMutation.isPending,
  };
}
