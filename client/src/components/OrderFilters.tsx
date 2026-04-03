import React from 'react';
import { X, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export interface OrderFilterOptions {
  search?: string;
  status?: string[];
  paymentMethod?: string[];
  minValue?: number;
  maxValue?: number;
  neighborhood?: string;
  dateFrom?: string;
  dateTo?: string;
}

interface OrderFiltersProps {
  filters: OrderFilterOptions;
  onFiltersChange: (filters: OrderFilterOptions) => void;
  statusOptions?: { value: string; label: string }[];
  paymentOptions?: { value: string; label: string }[];
  neighborhoods?: string[];
  isOpen?: boolean;
  onToggle?: () => void;
}

export const OrderFilters: React.FC<OrderFiltersProps> = ({
  filters,
  onFiltersChange,
  statusOptions = [],
  paymentOptions = [],
  neighborhoods = [],
  isOpen = false,
  onToggle,
}) => {
  const hasActiveFilters =
    filters.search ||
    (filters.status && filters.status.length > 0) ||
    (filters.paymentMethod && filters.paymentMethod.length > 0) ||
    filters.minValue ||
    filters.maxValue ||
    filters.neighborhood ||
    filters.dateFrom ||
    filters.dateTo;

  const handleClearFilters = () => {
    onFiltersChange({});
  };

  const handleToggleStatus = (status: string) => {
    const newStatus = filters.status || [];
    if (newStatus.includes(status)) {
      onFiltersChange({
        ...filters,
        status: newStatus.filter((s) => s !== status),
      });
    } else {
      onFiltersChange({
        ...filters,
        status: [...newStatus, status],
      });
    }
  };

  const handleTogglePayment = (method: string) => {
    const newMethods = filters.paymentMethod || [];
    if (newMethods.includes(method)) {
      onFiltersChange({
        ...filters,
        paymentMethod: newMethods.filter((m) => m !== method),
      });
    } else {
      onFiltersChange({
        ...filters,
        paymentMethod: [...newMethods, method],
      });
    }
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onToggle}
          className="flex items-center gap-2 text-sm font-medium text-foreground hover:text-primary transition-colors"
        >
          <Filter className="w-4 h-4" />
          Filtros
          {hasActiveFilters && (
            <Badge variant="secondary" className="ml-1 text-xs">
              {Object.values(filters).filter(Boolean).length}
            </Badge>
          )}
        </button>
        {hasActiveFilters && (
          <Button
            onClick={handleClearFilters}
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Limpar tudo
          </Button>
        )}
      </div>

      {/* Filtros */}
      {isOpen && (
        <Card className="p-4 space-y-4">
          {/* Busca */}
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-2">
              Buscar
            </label>
            <Input
              type="text"
              placeholder="Nome, telefone, endereço..."
              value={filters.search || ''}
              onChange={(e) =>
                onFiltersChange({
                  ...filters,
                  search: e.target.value || undefined,
                })
              }
              className="text-sm"
            />
          </div>

          {/* Status */}
          {statusOptions.length > 0 && (
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-2">
                Status
              </label>
              <div className="flex flex-wrap gap-2">
                {statusOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleToggleStatus(option.value)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      filters.status?.includes(option.value)
                        ? 'bg-primary text-white'
                        : 'bg-muted text-foreground hover:bg-muted/80'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Forma de Pagamento */}
          {paymentOptions.length > 0 && (
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-2">
                Forma de Pagamento
              </label>
              <div className="flex flex-wrap gap-2">
                {paymentOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleTogglePayment(option.value)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      filters.paymentMethod?.includes(option.value)
                        ? 'bg-primary text-white'
                        : 'bg-muted text-foreground hover:bg-muted/80'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Bairro */}
          {neighborhoods.length > 0 && (
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-2">
                Bairro
              </label>
              <select
                value={filters.neighborhood || ''}
                onChange={(e) =>
                  onFiltersChange({
                    ...filters,
                    neighborhood: e.target.value || undefined,
                  })
                }
                className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm"
              >
                <option value="">Todos os bairros</option>
                {neighborhoods.map((neighborhood) => (
                  <option key={neighborhood} value={neighborhood}>
                    {neighborhood}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Intervalo de Valor */}
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-2">
              Intervalo de Valor
            </label>
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="number"
                placeholder="Mín."
                value={filters.minValue || ''}
                onChange={(e) =>
                  onFiltersChange({
                    ...filters,
                    minValue: e.target.value ? parseFloat(e.target.value) : undefined,
                  })
                }
                className="text-sm"
                step="0.01"
              />
              <Input
                type="number"
                placeholder="Máx."
                value={filters.maxValue || ''}
                onChange={(e) =>
                  onFiltersChange({
                    ...filters,
                    maxValue: e.target.value ? parseFloat(e.target.value) : undefined,
                  })
                }
                className="text-sm"
                step="0.01"
              />
            </div>
          </div>

          {/* Data */}
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-2">
              Período
            </label>
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="date"
                value={filters.dateFrom || ''}
                onChange={(e) =>
                  onFiltersChange({
                    ...filters,
                    dateFrom: e.target.value || undefined,
                  })
                }
                className="text-sm"
              />
              <Input
                type="date"
                value={filters.dateTo || ''}
                onChange={(e) =>
                  onFiltersChange({
                    ...filters,
                    dateTo: e.target.value || undefined,
                  })
                }
                className="text-sm"
              />
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};
