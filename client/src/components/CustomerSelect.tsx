import { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { maskPhone } from '@/lib/masks';

export interface Customer {
  id: number;
  name: string;
  phone: string | null;
  whatsapp?: string | null;
  address?: string | null;
  addressNumber?: string | null;
  complement?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  email?: string | null;
  cpf?: string | null;
}

interface CustomerSelectProps {
  customers: Customer[];
  onSelect: (customer: Customer) => void;
  onClear?: () => void;
  selectedCustomer?: Customer | null;
  isLoading?: boolean;
  placeholder?: string;
  onSearch?: (query: string) => void;
}

export function CustomerSelect({
  customers,
  onSelect,
  onClear,
  selectedCustomer,
  isLoading = false,
  placeholder = "Buscar cliente...",
  onSearch,
}: CustomerSelectProps) {
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  // Quando onSearch é fornecido, a filtragem é feita pelo servidor (customers já vem filtrado)
  // Quando não é fornecido, filtramos localmente
  const filtered = onSearch
    ? customers
    : customers.filter((c) => {
        if (!search.trim()) return false;
        const query = search.toLowerCase();
        return (
          c.name.toLowerCase().includes(query) ||
          (c.phone?.includes(search.replace(/\D/g, '')) ?? false) ||
          c.email?.toLowerCase().includes(query)
        );
      });

  // Notificar o pai sobre mudanças na busca (para busca server-side)
  useEffect(() => {
    onSearch?.(search);
  }, [search]);

  const handleSelect = (customer: Customer) => {
    onSelect(customer);
    setSearch('');
    setIsOpen(false);
  };

  const handleClear = () => {
    setSearch('');
    setIsOpen(false);
    onClear?.();
  };

  // Montar linha de endereço para exibição
  const addressLine = selectedCustomer
    ? [
        selectedCustomer.address,
        selectedCustomer.addressNumber ? `nº ${selectedCustomer.addressNumber}` : null,
        selectedCustomer.complement,
        selectedCustomer.neighborhood,
      ]
        .filter(Boolean)
        .join(', ')
    : null;

  return (
    <div className="relative w-full">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input
          type="text"
          placeholder={placeholder}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          className="pl-9 pr-9"
          disabled={isLoading}
        />
        {(search || selectedCustomer) && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            type="button"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Dropdown de resultados */}
      {isOpen && search && filtered.length > 0 && (
        <Card className="absolute top-full left-0 right-0 mt-2 z-50 shadow-lg max-h-64 overflow-y-auto">
          <div className="divide-y">
            {filtered.map((customer) => (
              <button
                key={customer.id}
                onClick={() => handleSelect(customer)}
                className="w-full text-left px-4 py-3 hover:bg-muted transition-colors"
              >
                <div className="font-medium text-sm">{customer.name}</div>
                <div className="text-xs text-muted-foreground flex flex-wrap gap-2 mt-1">
                  {customer.phone && <span>📱 {maskPhone(customer.phone)}</span>}
                  {customer.address && (
                    <span>
                      📍 {customer.address}
                      {customer.addressNumber ? `, nº ${customer.addressNumber}` : ''}
                      {customer.neighborhood ? ` — ${customer.neighborhood}` : ''}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </Card>
      )}

      {/* Mensagem quando não há resultados */}
      {isOpen && search && filtered.length === 0 && (
        <Card className="absolute top-full left-0 right-0 mt-2 z-50 shadow-lg p-4">
          <p className="text-sm text-muted-foreground text-center">
            Nenhum cliente encontrado
          </p>
        </Card>
      )}

      {/* Cliente selecionado */}
      {selectedCustomer && !search && (
        <Card className="mt-2 p-3 bg-muted/50 border-primary/30">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm">{selectedCustomer.name}</div>
              <div className="text-xs text-muted-foreground space-y-1 mt-1">
                {selectedCustomer.phone && (
                  <div>📱 {maskPhone(selectedCustomer.phone)}</div>
                )}
                {addressLine && (
                  <div>📍 {addressLine}</div>
                )}
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClear}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
