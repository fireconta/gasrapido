import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { Eye, EyeOff, Flame, Lock, User, KeyRound, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

type View = "login" | "forgot" | "reset";

export default function Login() {
  const [, navigate] = useLocation();
  const [view, setView] = useState<View>("login");
  const [showPassword, setShowPassword] = useState(false);

  // Login form
  const [loginForm, setLoginForm] = useState({ username: "", password: "" });

  // Forgot password form
  const [forgotEmail, setForgotEmail] = useState("");
  const [resetToken, setResetToken] = useState("");

  // Reset password form
  const [resetForm, setResetForm] = useState({ token: "", newPassword: "", confirm: "" });
  const [showNewPwd, setShowNewPwd] = useState(false);

  const utils = trpc.useUtils();

  const loginMutation = trpc.adminAuth.login.useMutation({
    onSuccess: () => {
      toast.success("Login realizado com sucesso!");
      utils.adminAuth.me.invalidate();
      navigate("/dashboard");
    },
    onError: (e) => toast.error(e.message),
  });

  const forgotMutation = trpc.adminAuth.requestReset.useMutation({
    onSuccess: (data: any) => {
      toast.success("Token gerado com sucesso!");
      if ((data as any)?.resetToken) {
        setResetToken((data as any).resetToken);
        setResetForm((f) => ({ ...f, token: (data as any).resetToken! }));
      }
      setView("reset");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const resetMutation = trpc.adminAuth.resetPassword.useMutation({
    onSuccess: () => {
      toast.success("Senha redefinida com sucesso! Faça login.");
      setView("login");
      setResetForm({ token: "", newPassword: "", confirm: "" });
    },
    onError: (e) => toast.error(e.message),
  });

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!loginForm.username || !loginForm.password) {
      toast.error("Preencha todos os campos");
      return;
    }
    loginMutation.mutate(loginForm);
  }

  function handleForgot(e: React.FormEvent) {
    e.preventDefault();
    if (!forgotEmail) { toast.error("Informe o email"); return; }
    forgotMutation.mutate({ email: forgotEmail });
  }

  function handleReset(e: React.FormEvent) {
    e.preventDefault();
    if (resetForm.newPassword !== resetForm.confirm) {
      toast.error("As senhas não coincidem");
      return;
    }
    resetMutation.mutate({ token: resetForm.token, password: resetForm.newPassword });
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-500 via-orange-600 to-orange-700 flex items-center justify-center p-4">
      {/* Background pattern */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-white/5 rounded-full" />
        <div className="absolute -bottom-32 -left-32 w-[500px] h-[500px] bg-white/5 rounded-full" />
        <div className="absolute top-1/2 left-1/4 w-64 h-64 bg-white/5 rounded-full" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo / Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-2xl shadow-2xl mb-4">
            <Flame className="w-10 h-10 text-orange-500" />
          </div>
          <h1 className="text-3xl font-bold text-white">Gás Rápido</h1>
          <p className="text-orange-100 mt-1 text-sm">Painel Administrativo</p>
        </div>

        <Card className="shadow-2xl border-0">
          <CardHeader className="pb-2 pt-6 px-6">
            {view === "login" && (
              <h2 className="text-xl font-bold text-center text-foreground">Entrar no sistema</h2>
            )}
            {view === "forgot" && (
              <div>
                <button onClick={() => setView("login")} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-2 transition-colors">
                  <ArrowLeft className="w-4 h-4" /> Voltar
                </button>
                <h2 className="text-xl font-bold text-foreground">Recuperar senha</h2>
                <p className="text-sm text-muted-foreground mt-1">Informe seu email para receber o token de recuperação.</p>
              </div>
            )}
            {view === "reset" && (
              <div>
                <button onClick={() => setView("forgot")} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-2 transition-colors">
                  <ArrowLeft className="w-4 h-4" /> Voltar
                </button>
                <h2 className="text-xl font-bold text-foreground">Nova senha</h2>
                <p className="text-sm text-muted-foreground mt-1">Insira o token recebido e defina sua nova senha.</p>
              </div>
            )}
          </CardHeader>

          <CardContent className="px-6 pb-6 pt-4">
            {/* ── LOGIN FORM ── */}
            {view === "login" && (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <Label htmlFor="username" className="text-sm font-medium">Usuário ou Email</Label>
                  <div className="relative mt-1">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="username"
                      type="text"
                      placeholder="admin"
                      className="pl-9"
                      value={loginForm.username}
                      onChange={(e) => setLoginForm((f) => ({ ...f, username: e.target.value }))}
                      autoComplete="username"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="password" className="text-sm font-medium">Senha</Label>
                  <div className="relative mt-1">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      className="pl-9 pr-10"
                      value={loginForm.password}
                      onChange={(e) => setLoginForm((f) => ({ ...f, password: e.target.value }))}
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setView("forgot")}
                    className="text-xs text-orange-600 hover:text-orange-700 font-medium transition-colors"
                  >
                    Esqueci minha senha
                  </button>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold h-11 text-base"
                  disabled={loginMutation.isPending}
                >
                  {loginMutation.isPending ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Entrando...
                    </span>
                  ) : "Entrar"}
                </Button>

                <div className="bg-orange-50 border border-orange-100 rounded-lg p-3 text-center">
                  <p className="text-xs text-orange-700">
                    <span className="font-semibold">Acesso padrão:</span> usuário <code className="bg-orange-100 px-1 rounded">admin</code> · senha <code className="bg-orange-100 px-1 rounded">Gas2026</code>
                  </p>
                </div>
              </form>
            )}

            {/* ── FORGOT PASSWORD FORM ── */}
            {view === "forgot" && (
              <form onSubmit={handleForgot} className="space-y-4">
                <div>
                  <Label htmlFor="forgot-email" className="text-sm font-medium">Email do administrador</Label>
                  <Input
                    id="forgot-email"
                    type="email"
                    placeholder="admin@gasrapido.com"
                    className="mt-1"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold h-11"
                  disabled={forgotMutation.isPending}
                >
                  {forgotMutation.isPending ? "Gerando token..." : "Gerar token de recuperação"}
                </Button>
                <p className="text-xs text-center text-muted-foreground">
                  O token será exibido na próxima tela para você redefinir a senha.
                </p>
              </form>
            )}

            {/* ── RESET PASSWORD FORM ── */}
            {view === "reset" && (
              <form onSubmit={handleReset} className="space-y-4">
                {resetToken && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <p className="text-xs font-semibold text-green-700 mb-1 flex items-center gap-1">
                      <KeyRound className="w-3.5 h-3.5" /> Token gerado
                    </p>
                    <code className="text-xs text-green-800 break-all">{resetToken}</code>
                  </div>
                )}
                <div>
                  <Label className="text-sm font-medium">Token de recuperação</Label>
                  <Input
                    placeholder="Cole o token aqui"
                    className="mt-1"
                    value={resetForm.token}
                    onChange={(e) => setResetForm((f) => ({ ...f, token: e.target.value }))}
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium">Nova senha</Label>
                  <div className="relative mt-1">
                    <Input
                      type={showNewPwd ? "text" : "password"}
                      placeholder="Mínimo 6 caracteres"
                      className="pr-10"
                      value={resetForm.newPassword}
                      onChange={(e) => setResetForm((f) => ({ ...f, newPassword: e.target.value }))}
                    />
                    <button type="button" onClick={() => setShowNewPwd((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {showNewPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium">Confirmar nova senha</Label>
                  <Input
                    type="password"
                    placeholder="Repita a nova senha"
                    className="mt-1"
                    value={resetForm.confirm}
                    onChange={(e) => setResetForm((f) => ({ ...f, confirm: e.target.value }))}
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold h-11"
                  disabled={resetMutation.isPending}
                >
                  {resetMutation.isPending ? "Redefinindo..." : "Redefinir senha"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-orange-100/70 text-xs mt-6">
          © {new Date().getFullYear()} Gás Rápido · Quirinópolis — GO
        </p>
      </div>
    </div>
  );
}
