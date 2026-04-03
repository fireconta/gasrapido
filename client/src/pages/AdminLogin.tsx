import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Flame, Lock, User, ShieldCheck, Eye, EyeOff } from "lucide-react";

const LOGO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663440586062/arYUDk84fBUb5vUB52rDcp/gas-rapido-logo_36bc8fd2.png";
const ICON_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663440586062/arYUDk84fBUb5vUB52rDcp/gas-rapido-icon_35041320.png";

export default function AdminLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [, navigate] = useLocation();
  const loginMutation = trpc.adminAuth.login.useMutation();

  // Se já estiver autenticado como admin, redirecionar para o dashboard
  const { data: adminUser, isLoading: checkingAuth } = trpc.adminAuth.me.useQuery(undefined, {
    retry: false,
    staleTime: 10_000,
  });

  // Usar useEffect para redirecionar em vez de fazer durante render
  useEffect(() => {
    if (!checkingAuth && adminUser) {
      navigate("/dashboard");
    }
  }, [checkingAuth, adminUser, navigate]);

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Flame className="w-8 h-8 text-primary animate-pulse" />
          </div>
          <p className="text-white/60">Verificando autenticação...</p>
        </div>
      </div>
    );
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      toast.error("Preencha usuário e senha");
      return;
    }
    try {
      const result = await loginMutation.mutateAsync({ username, password });
      // Salvar token JWT no localStorage para autenticação sem cookie
      if (result.token) {
        localStorage.setItem("admin_token", result.token);
      }
      toast.success("Bem-vindo ao painel!");
      navigate("/dashboard");
    } catch (err: any) {
      toast.error("Credenciais inválidas", { description: "Verifique usuário e senha." });
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      {/* Decoração de fundo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-primary/5 rounded-full blur-2xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Card principal */}
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          {/* Header colorido */}
          <div className="bg-brand-gradient px-8 py-8 text-center">
            <img src={ICON_URL} alt="Gás Rápido" className="w-16 h-16 rounded-2xl mx-auto mb-4 shadow-lg border-2 border-white/30" />
            <h1
              className="text-2xl font-extrabold text-white mb-1"
              style={{ fontFamily: "'Sora', sans-serif" }}
            >
              Painel Administrativo
            </h1>
            <p className="text-white/70 text-sm">Gás Rápido — Acesso Restrito</p>
          </div>

          {/* Formulário */}
          <div className="px-8 py-8">
            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-sm font-semibold text-foreground">
                  Usuário
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="username"
                    type="text"
                    placeholder="admin"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="pl-10 h-11 border-border rounded-xl"
                    autoComplete="username"
                    autoFocus
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-semibold text-foreground">
                  Senha
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10 h-11 border-border rounded-xl"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-11 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl shadow-brand text-sm"
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Entrando...
                  </span>
                ) : (
                  "Entrar no Painel"
                )}
              </Button>
            </form>

            <div className="mt-6 flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="w-3.5 h-3.5" />
              Acesso seguro e criptografado
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-white/30 mt-4">
          Gás Rápido Admin v1.0
        </p>
      </div>
    </div>
  );
}
