import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X, Download, Smartphone, Bell, BellOff } from "lucide-react";
import { usePushNotifications } from "@/hooks/usePushNotifications";

interface InstallPWABannerProps {
  delivererId?: number;
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallPWABanner({ delivererId }: InstallPWABannerProps) {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

  const { isSupported, isSubscribed, isLoading, subscribe, unsubscribe } =
    usePushNotifications(delivererId);

  useEffect(() => {
    // Verificar se já está instalado como PWA
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    setIsInstalled(isStandalone);

    // Detectar iOS
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    setIsIOS(ios);

    // Verificar se já foi dispensado
    const wasDismissed = localStorage.getItem("pwa-banner-dismissed");
    if (wasDismissed) return;

    // Capturar evento de instalação (Android/Chrome)
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
      setShowBanner(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    // No iOS, mostrar banner de instruções após 3s
    if (ios && !isStandalone) {
      setTimeout(() => setShowBanner(true), 3000);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
    };
  }, []);

  const handleInstall = async () => {
    if (isIOS) {
      setShowIOSInstructions(true);
      return;
    }
    if (!installPrompt) return;
    await installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === "accepted") {
      setIsInstalled(true);
      setShowBanner(false);
    }
    setInstallPrompt(null);
  };

  const handleDismiss = () => {
    setDismissed(true);
    setShowBanner(false);
    localStorage.setItem("pwa-banner-dismissed", "1");
  };

  // Não mostrar se já instalado, dispensado ou sem prompt
  if (isInstalled || dismissed || !showBanner) {
    // Mesmo assim, mostrar botão de notificações se suportado
    if (!isSupported || !delivererId) return null;

    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-slate-800 rounded-lg border border-slate-700">
        <Bell className="w-4 h-4 text-slate-400" />
        <span className="text-xs text-slate-400">
          {isSubscribed ? "Notificações ativas" : "Notificações desativadas"}
        </span>
        <Button
          size="sm"
          variant="ghost"
          className={`h-6 px-2 text-xs ${isSubscribed ? "text-red-400 hover:text-red-300" : "text-green-400 hover:text-green-300"}`}
          onClick={isSubscribed ? unsubscribe : subscribe}
          disabled={isLoading}
        >
          {isLoading ? "..." : isSubscribed ? <BellOff className="w-3 h-3" /> : <Bell className="w-3 h-3" />}
        </Button>
      </div>
    );
  }

  return (
    <>
      {/* Banner principal */}
      <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-slate-900 border-t border-slate-700 shadow-2xl">
        <div className="flex items-start gap-3 max-w-lg mx-auto">
          <div className="w-12 h-12 rounded-xl bg-red-500 flex items-center justify-center flex-shrink-0">
            <img
              src="https://d2xsxph8kpxj0f.cloudfront.net/310519663435268322/44rvVnKHrNsEvnUcNjSmaL/icon-192x192_8c6a4b97.png"
              alt="Gás Rápido"
              className="w-10 h-10 rounded-lg"
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold text-sm">Instalar app do Entregador</p>
            <p className="text-slate-400 text-xs mt-0.5">
              Receba notificações de novos pedidos mesmo com o celular bloqueado
            </p>
            <div className="flex gap-2 mt-3">
              <Button
                size="sm"
                className="bg-red-500 hover:bg-red-600 text-white text-xs h-8 px-3"
                onClick={handleInstall}
              >
                <Download className="w-3 h-3 mr-1" />
                {isIOS ? "Ver instruções" : "Instalar agora"}
              </Button>
              {isSupported && delivererId && !isSubscribed && (
                <Button
                  size="sm"
                  variant="outline"
                  className="border-slate-600 text-slate-300 text-xs h-8 px-3"
                  onClick={subscribe}
                  disabled={isLoading}
                >
                  <Bell className="w-3 h-3 mr-1" />
                  Ativar alertas
                </Button>
              )}
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="text-slate-500 hover:text-slate-300 flex-shrink-0 mt-0.5"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Modal de instruções iOS */}
      {showIOSInstructions && (
        <div className="fixed inset-0 z-[60] bg-black/80 flex items-end">
          <div className="bg-slate-900 rounded-t-2xl w-full p-6 border-t border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-bold text-lg">Instalar no iPhone/iPad</h3>
              <button
                onClick={() => setShowIOSInstructions(false)}
                className="text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">1</div>
                <div>
                  <p className="text-white text-sm font-medium">Toque no botão de compartilhar</p>
                  <p className="text-slate-400 text-xs mt-0.5">O ícone de quadrado com seta para cima na barra inferior do Safari</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">2</div>
                <div>
                  <p className="text-white text-sm font-medium">Role para baixo e toque em "Adicionar à Tela de Início"</p>
                  <p className="text-slate-400 text-xs mt-0.5">Procure o ícone de quadrado com um sinal de +</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">3</div>
                <div>
                  <p className="text-white text-sm font-medium">Toque em "Adicionar"</p>
                  <p className="text-slate-400 text-xs mt-0.5">O app aparecerá na sua tela inicial como qualquer outro aplicativo</p>
                </div>
              </div>
            </div>
            <Button
              className="w-full mt-6 bg-red-500 hover:bg-red-600 text-white"
              onClick={() => setShowIOSInstructions(false)}
            >
              Entendido
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
