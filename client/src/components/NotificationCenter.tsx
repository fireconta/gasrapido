import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Bell, X, Check, CheckCheck, Trash2, Filter, Search,
  Clock, AlertCircle, Package, Truck, DollarSign, Users
} from 'lucide-react';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  icon?: string;
}

interface NotificationCenterProps {
  notifications: Notification[];
  unreadCount: number;
  onMarkAsRead?: (id: string) => void;
  onMarkAllAsRead?: () => void;
  onDelete?: (id: string) => void;
  onClearAll?: () => void;
}

/**
 * Centro de notificações com filtros e gerenciamento
 */
export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  notifications,
  unreadCount,
  onMarkAsRead,
  onMarkAllAsRead,
  onDelete,
  onClearAll,
}) => {
  const [filter, setFilter] = useState<string>('todos');
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const typeLabels: Record<string, string> = {
    novo_pedido: 'Novo Pedido',
    pedido_aceito: 'Pedido Aceito',
    pedido_em_entrega: 'Em Entrega',
    pedido_entregue: 'Entregue',
    pedido_cancelado: 'Cancelado',
    novo_entregador: 'Novo Entregador',
    entregador_online: 'Online',
    entregador_offline: 'Offline',
    pagamento_recebido: 'Pagamento',
    erro_entrega: 'Erro',
    aviso_estoque: 'Estoque',
    mensagem_admin: 'Mensagem',
  };

  const typeColors: Record<string, string> = {
    novo_pedido: 'bg-blue-100 text-blue-700',
    pedido_aceito: 'bg-green-100 text-green-700',
    pedido_em_entrega: 'bg-purple-100 text-purple-700',
    pedido_entregue: 'bg-green-100 text-green-700',
    pedido_cancelado: 'bg-red-100 text-red-700',
    novo_entregador: 'bg-blue-100 text-blue-700',
    entregador_online: 'bg-green-100 text-green-700',
    entregador_offline: 'bg-gray-100 text-gray-700',
    pagamento_recebido: 'bg-green-100 text-green-700',
    erro_entrega: 'bg-red-100 text-red-700',
    aviso_estoque: 'bg-yellow-100 text-yellow-700',
    mensagem_admin: 'bg-orange-100 text-orange-700',
  };

  const typeIcons: Record<string, React.ReactNode> = {
    novo_pedido: <Package className="w-4 h-4" />,
    pedido_aceito: <Check className="w-4 h-4" />,
    pedido_em_entrega: <Truck className="w-4 h-4" />,
    pedido_entregue: <Check className="w-4 h-4" />,
    pedido_cancelado: <X className="w-4 h-4" />,
    novo_entregador: <Users className="w-4 h-4" />,
    entregador_online: <Bell className="w-4 h-4" />,
    entregador_offline: <Bell className="w-4 h-4" />,
    pagamento_recebido: <DollarSign className="w-4 h-4" />,
    erro_entrega: <AlertCircle className="w-4 h-4" />,
    aviso_estoque: <AlertCircle className="w-4 h-4" />,
    mensagem_admin: <Bell className="w-4 h-4" />,
  };

  const filtered = notifications.filter((notif) => {
    const matchFilter = filter === 'todos' || (filter === 'nao_lidas' ? !notif.read : notif.read);
    const matchSearch =
      notif.title.toLowerCase().includes(search.toLowerCase()) ||
      notif.message.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Agora';
    if (minutes < 60) return `${minutes}m atrás`;
    if (hours < 24) return `${hours}h atrás`;
    if (days < 7) return `${days}d atrás`;
    return new Date(date).toLocaleDateString('pt-BR');
  };

  return (
    <div className="relative">
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 hover:bg-muted rounded-lg transition-colors"
      >
        <Bell className="w-6 h-6 text-foreground" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <Card className="absolute right-0 top-12 w-96 shadow-xl z-50 border border-border">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Notificações</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
                className="h-6 w-6 p-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>

          <CardContent className="space-y-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 text-sm"
              />
            </div>

            {/* Filters */}
            <div className="flex gap-2">
              <Button
                onClick={() => setFilter('todos')}
                variant={filter === 'todos' ? 'default' : 'outline'}
                size="sm"
                className="text-xs"
              >
                Todas
              </Button>
              <Button
                onClick={() => setFilter('nao_lidas')}
                variant={filter === 'nao_lidas' ? 'default' : 'outline'}
                size="sm"
                className="text-xs"
              >
                Não Lidas ({unreadCount})
              </Button>
              <Button
                onClick={() => setFilter('lidas')}
                variant={filter === 'lidas' ? 'default' : 'outline'}
                size="sm"
                className="text-xs"
              >
                Lidas
              </Button>
            </div>

            {/* Notifications List */}
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filtered.length === 0 ? (
                <div className="text-center py-8">
                  <Bell className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Nenhuma notificação</p>
                </div>
              ) : (
                filtered.map((notif) => (
                  <div
                    key={notif.id}
                    className={`p-3 rounded-lg border transition-colors ${
                      notif.read
                        ? 'bg-background border-border'
                        : 'bg-blue-50 border-blue-200'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Icon */}
                      <div
                        className={`p-2 rounded flex-shrink-0 ${
                          typeColors[notif.type] || 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {typeIcons[notif.type] || <Bell className="w-4 h-4" />}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium text-sm text-foreground">
                            {notif.title}
                          </p>
                          {!notif.read && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {notif.message}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge
                            variant="outline"
                            className={`text-xs ${
                              typeColors[notif.type] || 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {typeLabels[notif.type] || notif.type}
                          </Badge>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatTime(notif.timestamp)}
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-1 flex-shrink-0">
                        {!notif.read && (
                          <Button
                            onClick={() => onMarkAsRead?.(notif.id)}
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            title="Marcar como lida"
                          >
                            <Check className="w-3 h-3" />
                          </Button>
                        )}
                        <Button
                          onClick={() => onDelete?.(notif.id)}
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-red-500 hover:text-red-600"
                          title="Deletar"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Actions */}
            {notifications.length > 0 && (
              <div className="flex gap-2 pt-2 border-t border-border">
                <Button
                  onClick={() => onMarkAllAsRead?.()}
                  variant="outline"
                  size="sm"
                  className="flex-1 gap-1 text-xs"
                >
                  <CheckCheck className="w-3 h-3" />
                  Marcar Todas
                </Button>
                <Button
                  onClick={() => onClearAll?.()}
                  variant="outline"
                  size="sm"
                  className="flex-1 gap-1 text-xs"
                >
                  <Trash2 className="w-3 h-3" />
                  Limpar Tudo
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
