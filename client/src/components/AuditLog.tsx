import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  LogIn, LogOut, Plus, Edit, Trash2, Eye, Download,
  Calendar, User, Clock, Filter
} from 'lucide-react';

interface AuditEntry {
  id: number;
  action: 'login' | 'logout' | 'create' | 'update' | 'delete' | 'view';
  description: string;
  user: string;
  timestamp: Date;
  details?: string;
  ipAddress?: string;
}

interface AuditLogProps {
  entries: AuditEntry[];
  isLoading?: boolean;
  onExport?: () => void;
}

/**
 * Componente para visualizar log de auditoria de ações
 */
export const AuditLog: React.FC<AuditLogProps> = ({
  entries,
  isLoading = false,
  onExport,
}) => {
  const [filterAction, setFilterAction] = React.useState<string>('');
  const [filterUser, setFilterUser] = React.useState<string>('');

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'login':
        return <LogIn className="w-4 h-4" />;
      case 'logout':
        return <LogOut className="w-4 h-4" />;
      case 'create':
        return <Plus className="w-4 h-4" />;
      case 'update':
        return <Edit className="w-4 h-4" />;
      case 'delete':
        return <Trash2 className="w-4 h-4" />;
      case 'view':
        return <Eye className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'login':
        return 'bg-green-100 text-green-700';
      case 'logout':
        return 'bg-gray-100 text-gray-700';
      case 'create':
        return 'bg-blue-100 text-blue-700';
      case 'update':
        return 'bg-yellow-100 text-yellow-700';
      case 'delete':
        return 'bg-red-100 text-red-700';
      case 'view':
        return 'bg-purple-100 text-purple-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      login: 'Login',
      logout: 'Logout',
      create: 'Criado',
      update: 'Atualizado',
      delete: 'Deletado',
      view: 'Visualizado',
    };
    return labels[action] || action;
  };

  const filteredEntries = entries.filter((entry) => {
    const matchAction = !filterAction || entry.action === filterAction;
    const matchUser = !filterUser || entry.user.toLowerCase().includes(filterUser.toLowerCase());
    return matchAction && matchUser;
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Log de Auditoria</CardTitle>
          {onExport && (
            <Button
              onClick={onExport}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <Download className="w-4 h-4" />
              Exportar
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Filtros */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Ação</label>
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="w-full mt-1 px-3 py-2 border border-border rounded-lg text-sm bg-background"
            >
              <option value="">Todas</option>
              <option value="login">Login</option>
              <option value="logout">Logout</option>
              <option value="create">Criado</option>
              <option value="update">Atualizado</option>
              <option value="delete">Deletado</option>
              <option value="view">Visualizado</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Usuário</label>
            <Input
              placeholder="Filtrar por usuário"
              value={filterUser}
              onChange={(e) => setFilterUser(e.target.value)}
              className="mt-1 text-sm"
            />
          </div>
        </div>

        {/* Lista */}
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-muted animate-pulse rounded" />
              ))}
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground">Nenhuma ação registrada</p>
            </div>
          ) : (
            filteredEntries.map((entry) => (
              <div
                key={entry.id}
                className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
              >
                {/* Icon */}
                <div className={`p-2 rounded ${getActionColor(entry.action)}`}>
                  {getActionIcon(entry.action)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{entry.description}</p>
                    <Badge variant="outline" className="text-xs">
                      {getActionLabel(entry.action)}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {entry.user}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {entry.timestamp.toLocaleTimeString('pt-BR')}
                    </div>
                  </div>
                  {entry.details && (
                    <p className="text-xs text-muted-foreground mt-1 truncate">
                      {entry.details}
                    </p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="text-xs text-muted-foreground pt-2 border-t border-border">
          Total: {filteredEntries.length} ações
        </div>
      </CardContent>
    </Card>
  );
};
