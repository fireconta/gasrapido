import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { Eye, EyeOff, Truck, Mail, Lock, ArrowRight } from 'lucide-react';

const ICON_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663440586062/arYUDk84fBUb5vUB52rDcp/gas-rapido-icon_35041320.png";
const MOTOGAS_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663440586062/arYUDk84fBUb5vUB52rDcp/motogas_91d84c67.png";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function DelivererLogin() {
  const [, navigate] = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const utils = trpc.useUtils();

  const loginMutation = trpc.deliverers.login.useMutation({
    onSuccess: () => {
      toast.success('Login realizado com sucesso!');
      utils.deliverers.me.invalidate();
      navigate('/entregador');
    },
    onError: (e: any) => {
      toast.error(e.message || 'Erro ao fazer login');
      setIsLoading(false);
    },
  });

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();

    if (!email || !password) {
      toast.error('Preencha todos os campos');
      return;
    }

    setIsLoading(true);
    loginMutation.mutate({ email, password });
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-red-50 to-orange-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo */}
        <div className="text-center">
          <img src={ICON_URL} alt="Gás Rápido" className="w-16 h-16 rounded-2xl mx-auto mb-4 shadow-lg" />
          <h1 className="text-3xl font-bold text-gray-900">Gás Rápido</h1>
          <p className="text-gray-600 mt-1">Painel do Entregador</p>
        </div>

        {/* Card */}
        <Card className="shadow-lg border-0">
          <CardHeader className="space-y-2">
            <CardTitle className="text-2xl">Bem-vindo</CardTitle>
            <p className="text-sm text-muted-foreground">
              Faça login com suas credenciais para acessar o painel
            </p>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Info */}
            <Alert className="bg-orange-50 border-orange-200">
              <AlertDescription className="text-sm text-orange-800">
                Use o email e senha fornecidos pelo administrador
              </AlertDescription>
            </Alert>

            {/* Form */}
            <form onSubmit={handleLogin} className="space-y-4">
              {/* Email */}
              <div>
                <Label className="text-sm font-medium">Email</Label>
                <div className="relative mt-1">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <Label className="text-sm font-medium">Senha</Label>
                <div className="relative mt-1">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Digite sua senha"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                    disabled={isLoading}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <Eye className="w-4 h-4 text-muted-foreground" />
                    )}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <Button
                type="submit"
                className="w-full bg-primary hover:bg-primary/90 text-white gap-2 h-10"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Entrando...
                  </>
                ) : (
                  <>
                    Entrar
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </form>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="px-2 bg-background text-muted-foreground">Ou</span>
              </div>
            </div>

            {/* Links */}
            <div className="space-y-2">
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => navigate('/')}
              >
                Voltar ao Site
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-sm text-gray-600">
          <p>Problemas para fazer login?</p>
          <p>Contate o administrador para obter suas credenciais</p>
        </div>
      </div>
    </div>
  );
}
