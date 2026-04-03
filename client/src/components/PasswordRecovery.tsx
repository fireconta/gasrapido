import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Mail, CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

interface PasswordRecoveryProps {
  onBack: () => void;
  onResetToken?: (token: string) => void;
}

type Step = 'email' | 'token' | 'password' | 'success';

/**
 * Componente para recuperação de senha com múltiplas etapas
 */
export const PasswordRecovery: React.FC<PasswordRecoveryProps> = ({
  onBack,
  onResetToken,
}) => {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error('Informe o email');
      return;
    }

    setIsLoading(true);
    try {
      // Simular chamada de API
      setTimeout(() => {
        toast.success('Email de recuperação enviado!');
        setStep('token');
        setIsLoading(false);
      }, 1000);
    } catch (error) {
      toast.error('Erro ao enviar email');
      setIsLoading(false);
    }
  };

  const handleTokenSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      toast.error('Informe o token');
      return;
    }
    onResetToken?.(token);
    setStep('password');
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newPassword || !confirmPassword) {
      toast.error('Preencha todos os campos');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('Senha deve ter no mínimo 6 caracteres');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('As senhas não coincidem');
      return;
    }

    setIsLoading(true);
    try {
      // Simular chamada de API
      setTimeout(() => {
        toast.success('Senha redefinida com sucesso!');
        setStep('success');
        setIsLoading(false);
      }, 1000);
    } catch (error) {
      toast.error('Erro ao redefinir senha');
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="h-8 w-8 p-0"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <CardTitle className="text-lg">Recuperar Senha</CardTitle>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {step === 'email' && (
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Email</Label>
              <Input
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1"
                disabled={isLoading}
              />
            </div>

            <Alert className="bg-blue-50 border-blue-200">
              <Mail className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-sm text-blue-800">
                Enviaremos um código de recuperação para seu email
              </AlertDescription>
            </Alert>

            <Button
              type="submit"
              className="w-full bg-primary hover:bg-primary/90 text-white"
              disabled={isLoading}
            >
              {isLoading ? 'Enviando...' : 'Enviar Código'}
            </Button>
          </form>
        )}

        {step === 'token' && (
          <form onSubmit={handleTokenSubmit} className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Código de Recuperação</Label>
              <Input
                type="text"
                placeholder="Código recebido no email"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className="mt-1"
              />
            </div>

            <Alert className="bg-yellow-50 border-yellow-200">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-sm text-yellow-800">
                Verifique seu email para o código de recuperação
              </AlertDescription>
            </Alert>

            <Button
              type="submit"
              className="w-full bg-primary hover:bg-primary/90 text-white"
            >
              Verificar Código
            </Button>
          </form>
        )}

        {step === 'password' && (
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Nova Senha</Label>
              <Input
                type="password"
                placeholder="Mínimo 6 caracteres"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="mt-1"
                disabled={isLoading}
              />
            </div>

            <div>
              <Label className="text-sm font-medium">Confirmar Senha</Label>
              <Input
                type="password"
                placeholder="Confirme sua senha"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-1"
                disabled={isLoading}
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-primary hover:bg-primary/90 text-white"
              disabled={isLoading}
            >
              {isLoading ? 'Redefinindo...' : 'Redefinir Senha'}
            </Button>
          </form>
        )}

        {step === 'success' && (
          <div className="space-y-4 text-center py-4">
            <div className="flex justify-center">
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Sucesso!</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Sua senha foi redefinida com sucesso
              </p>
            </div>
            <Button
              onClick={onBack}
              className="w-full bg-primary hover:bg-primary/90 text-white"
            >
              Voltar ao Login
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
