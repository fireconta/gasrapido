import { useState } from "react";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  User, Lock, Eye, EyeOff, Shield, Clock,
  Mail, BadgeCheck, KeyRound, Save, AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export default function AdminPerfil() {
  const { adminUser } = useAdminAuth();

  // Estado do formulário de alteração de senha
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const updatePasswordMutation = trpc.adminAuth.updatePassword.useMutation({
    onSuccess: () => {
      toast.success("Senha alterada com sucesso!", {
        description: "Sua nova senha já está ativa.",
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (err) => {
      toast.error("Erro ao alterar senha", {
        description: err.message,
      });
    },
  });

  function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();

    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("Preencha todos os campos");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("A nova senha deve ter pelo menos 6 caracteres");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("As senhas não coincidem", {
        description: "A nova senha e a confirmação devem ser iguais.",
      });
      return;
    }

    if (currentPassword === newPassword) {
      toast.error("A nova senha deve ser diferente da atual");
      return;
    }

    updatePasswordMutation.mutate({ currentPassword, newPassword, confirmPassword });
  }

  // Força da senha
  function getPasswordStrength(pwd: string): { label: string; color: string; width: string } {
    if (!pwd) return { label: "", color: "bg-muted", width: "0%" };
    let score = 0;
    if (pwd.length >= 8) score++;
    if (pwd.length >= 12) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;

    if (score <= 1) return { label: "Muito fraca", color: "bg-red-500", width: "20%" };
    if (score === 2) return { label: "Fraca", color: "bg-orange-500", width: "40%" };
    if (score === 3) return { label: "Média", color: "bg-yellow-500", width: "60%" };
    if (score === 4) return { label: "Forte", color: "bg-green-500", width: "80%" };
    return { label: "Muito forte", color: "bg-emerald-500", width: "100%" };
  }

  const strength = getPasswordStrength(newPassword);
  const adminName = (adminUser as any)?.name ?? "Administrador";
  const adminEmail = adminUser?.email ?? "";
  const adminUsername = adminUser?.username ?? "";
  const adminInitial = adminName.charAt(0).toUpperCase();

  return (
    <AdminLayout>
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        {/* Cabeçalho */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Meu Perfil</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Gerencie suas informações pessoais e segurança da conta.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Coluna esquerda — Card de perfil */}
          <div className="lg:col-span-1 space-y-4">
            {/* Avatar e info */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center gap-4">
                  <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center shadow-lg">
                    <span className="text-white text-3xl font-bold">{adminInitial}</span>
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-foreground">{adminName}</h2>
                    <p className="text-sm text-muted-foreground">{adminEmail}</p>
                  </div>
                  <Badge variant="secondary" className="gap-1.5">
                    <Shield className="w-3 h-3" />
                    Administrador
                  </Badge>
                </div>

                <Separator className="my-4" />

                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                      <User className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">Usuário</p>
                      <p className="font-medium text-foreground truncate">{adminUsername}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">E-mail</p>
                      <p className="font-medium text-foreground truncate">{adminEmail || "—"}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                      <BadgeCheck className="w-4 h-4 text-green-500" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Status</p>
                      <p className="font-medium text-green-600">Conta ativa</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Dicas de segurança */}
            <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
              <CardContent className="pt-4 pb-4">
                <div className="flex gap-3">
                  <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-amber-800 dark:text-amber-400">Dicas de segurança</p>
                    <ul className="text-xs text-amber-700 dark:text-amber-500 space-y-1">
                      <li>• Use pelo menos 8 caracteres</li>
                      <li>• Combine letras, números e símbolos</li>
                      <li>• Não reutilize senhas antigas</li>
                      <li>• Não compartilhe suas credenciais</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Coluna direita — Formulário de senha */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <KeyRound className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Alterar Senha</CardTitle>
                    <CardDescription className="text-xs mt-0.5">
                      Escolha uma senha forte para proteger sua conta.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent>
                <form onSubmit={handleChangePassword} className="space-y-5">
                  {/* Senha atual */}
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword" className="text-sm font-medium">
                      Senha atual
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="currentPassword"
                        type={showCurrent ? "text" : "password"}
                        placeholder="Digite sua senha atual"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="pl-10 pr-10 h-11"
                        autoComplete="current-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrent(!showCurrent)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        tabIndex={-1}
                      >
                        {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <Separator />

                  {/* Nova senha */}
                  <div className="space-y-2">
                    <Label htmlFor="newPassword" className="text-sm font-medium">
                      Nova senha
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="newPassword"
                        type={showNew ? "text" : "password"}
                        placeholder="Mínimo 6 caracteres"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="pl-10 pr-10 h-11"
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNew(!showNew)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        tabIndex={-1}
                      >
                        {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>

                    {/* Barra de força da senha */}
                    {newPassword && (
                      <div className="space-y-1.5 pt-1">
                        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${strength.color}`}
                            style={{ width: strength.width }}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Força da senha:{" "}
                          <span className={`font-medium ${
                            strength.label === "Muito forte" || strength.label === "Forte"
                              ? "text-green-600"
                              : strength.label === "Média"
                              ? "text-yellow-600"
                              : "text-red-500"
                          }`}>
                            {strength.label}
                          </span>
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Confirmar nova senha */}
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="text-sm font-medium">
                      Confirmar nova senha
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="confirmPassword"
                        type={showConfirm ? "text" : "password"}
                        placeholder="Repita a nova senha"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className={`pl-10 pr-10 h-11 ${
                          confirmPassword && confirmPassword !== newPassword
                            ? "border-red-400 focus-visible:ring-red-400"
                            : confirmPassword && confirmPassword === newPassword
                            ? "border-green-400 focus-visible:ring-green-400"
                            : ""
                        }`}
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirm(!showConfirm)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        tabIndex={-1}
                      >
                        {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {confirmPassword && confirmPassword !== newPassword && (
                      <p className="text-xs text-red-500">As senhas não coincidem.</p>
                    )}
                    {confirmPassword && confirmPassword === newPassword && (
                      <p className="text-xs text-green-600">As senhas coincidem.</p>
                    )}
                  </div>

                  {/* Botão */}
                  <div className="pt-2">
                    <Button
                      type="submit"
                      className="w-full h-11 font-semibold gap-2"
                      disabled={
                        updatePasswordMutation.isPending ||
                        !currentPassword ||
                        !newPassword ||
                        !confirmPassword ||
                        newPassword !== confirmPassword
                      }
                    >
                      {updatePasswordMutation.isPending ? (
                        <>
                          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Salvando...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          Salvar nova senha
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            {/* Card de informações da sessão */}
            <Card className="mt-4">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                    <Clock className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Sessão atual</CardTitle>
                    <CardDescription className="text-xs mt-0.5">
                      Informações sobre seu acesso atual.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-3 rounded-lg bg-muted/50 space-y-1">
                    <p className="text-xs text-muted-foreground">Tipo de autenticação</p>
                    <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-primary" />
                      JWT — Token local
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50 space-y-1">
                    <p className="text-xs text-muted-foreground">Duração da sessão</p>
                    <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-primary" />
                      30 dias
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50 space-y-1 sm:col-span-2">
                    <p className="text-xs text-muted-foreground">Nível de acesso</p>
                    <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
                      <BadgeCheck className="w-3.5 h-3.5 text-green-500" />
                      Acesso total ao painel administrativo
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
