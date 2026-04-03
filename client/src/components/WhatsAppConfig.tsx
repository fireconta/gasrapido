/**
 * WhatsAppConfig — componente de status do WhatsApp.
 * A configuração completa está em /admin/whatsapp (WhatsApp.tsx).
 */
import { trpc } from "@/lib/trpc";
import { CheckCircle2, MessageSquare, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function WhatsAppConfig() {
  const { data } = trpc.whatsapp.getStatus.useQuery();

  return (
    <div className="flex items-center gap-3 p-4 border rounded-lg bg-gray-50">
      <MessageSquare className="h-5 w-5 text-green-600 shrink-0" />
      <div className="flex-1">
        <p className="text-sm font-medium">WhatsApp Cloud API (Meta)</p>
        <p className="text-xs text-gray-500">Configure em Painel Admin → WhatsApp</p>
      </div>
      {data?.isActive ? (
        <Badge className="bg-green-100 text-green-700 border-green-200 flex items-center gap-1">
          <CheckCircle2 className="h-3 w-3" /> Ativo
        </Badge>
      ) : (
        <Badge className="bg-gray-100 text-gray-500 border-gray-200 flex items-center gap-1">
          <XCircle className="h-3 w-3" /> Inativo
        </Badge>
      )}
    </div>
  );
}
