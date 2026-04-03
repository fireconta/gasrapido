import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle, Info } from 'lucide-react';

type ConfirmType = 'confirm' | 'warning' | 'danger' | 'info';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: string;
  type?: ConfirmType;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

const typeConfig: Record<
  ConfirmType,
  {
    icon: React.ReactNode;
    color: string;
    buttonColor: string;
  }
> = {
  confirm: {
    icon: <CheckCircle className="w-6 h-6 text-blue-500" />,
    color: 'text-blue-500',
    buttonColor: 'bg-blue-600 hover:bg-blue-700',
  },
  warning: {
    icon: <AlertCircle className="w-6 h-6 text-yellow-500" />,
    color: 'text-yellow-500',
    buttonColor: 'bg-yellow-600 hover:bg-yellow-700',
  },
  danger: {
    icon: <AlertCircle className="w-6 h-6 text-red-500" />,
    color: 'text-red-500',
    buttonColor: 'bg-red-600 hover:bg-red-700',
  },
  info: {
    icon: <Info className="w-6 h-6 text-cyan-500" />,
    color: 'text-cyan-500',
    buttonColor: 'bg-cyan-600 hover:bg-cyan-700',
  },
};

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title,
  description,
  type = 'confirm',
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  onConfirm,
  onCancel,
  isLoading = false,
}) => {
  const config = typeConfig[type];

  const handleConfirm = async () => {
    try {
      await onConfirm();
    } catch (error) {
      console.error('Erro ao confirmar:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            {config.icon}
            <DialogTitle>{title}</DialogTitle>
          </div>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
          <Button
            onClick={onCancel}
            variant="outline"
            disabled={isLoading}
            className="sm:flex-1"
          >
            {cancelLabel}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isLoading}
            className={`${config.buttonColor} text-white sm:flex-1`}
          >
            {isLoading ? 'Processando...' : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
