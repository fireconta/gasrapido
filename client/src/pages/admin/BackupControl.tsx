import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AlertCircle, RefreshCw, Trash2, HardDrive, Clock,
  CheckCircle2, AlertTriangle, Database, Plus, Shield,
  Info, Calendar, Zap, XCircle, Bot, User, ToggleLeft, ToggleRight
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import AdminLayout from '@/components/AdminLayout';

function formatDate(d: Date | string | null | undefined) {
  if (!d) return '—';
  return new Date(d).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function padTwo(n: number) {
  return String(n).padStart(2, '0');
}

export default function BackupControl() {
  const [deleteFilename, setDeleteFilename] = useState<string | null>(null);
  const [showAddSchedule, setShowAddSchedule] = useState(false);
  const [newHour, setNewHour] = useState('');
  const [newMinute, setNewMinute] = useState('00');
  const [newLabel, setNewLabel] = useState('');
  const [deleteScheduleId, setDeleteScheduleId] = useState<number | null>(null);
  const utils = trpc.useUtils();

  const { data: backups = [], isLoading, refetch } = trpc.backups.list.useQuery(undefined, {
    refetchInterval: 60_000,
  });

  const { data: stats } = trpc.backups.stats.useQuery(undefined, {
    refetchInterval: 60_000,
  });

  const { data: schedules = [], isLoading: loadingSchedules } = trpc.backups.listSchedules.useQuery(undefined, {
    refetchInterval: 30_000,
  });

  const createMutation = trpc.backups.create.useMutation({
    onSuccess: (data: any) => {
      utils.backups.list.invalidate();
      utils.backups.stats.invalidate();
      // Se S3 falhou mas temos o conteúdo SQL, faz download direto
      if (data.sqlBase64) {
        try {
          const bytes = Uint8Array.from(atob(data.sqlBase64), (c: string) => c.charCodeAt(0));
          const blob = new Blob([bytes], { type: 'text/plain' });
          const link = document.createElement('a');
          link.href = URL.createObjectURL(blob);
          link.download = data.file;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(link.href);
        } catch {}
      }
      if (data.storageError) {
        toast.warning(`Backup criado (${data.size}) — download iniciado automaticamente.`);
      } else {
        toast.success(`Backup criado com sucesso! (${data.size})`);
      }
    },
    onError: (e: any) => toast.error(e.message || 'Erro ao criar backup'),
  });

  const deleteMutation = trpc.backups.delete.useMutation({
    onSuccess: () => {
      toast.success('Backup deletado com sucesso!');
      setDeleteFilename(null);
      utils.backups.list.invalidate();
      utils.backups.stats.invalidate();
    },
    onError: (e: any) => toast.error(e.message || 'Erro ao deletar backup'),
  });

  const addScheduleMutation = trpc.backups.addSchedule.useMutation({
    onSuccess: () => {
      toast.success('Agendamento adicionado com sucesso!');
      setShowAddSchedule(false);
      setNewHour('');
      setNewMinute('00');
      setNewLabel('');
      utils.backups.listSchedules.invalidate();
    },
    onError: (e: any) => toast.error(e.message || 'Erro ao adicionar agendamento'),
  });

  const updateScheduleMutation = trpc.backups.updateSchedule.useMutation({
    onSuccess: () => {
      utils.backups.listSchedules.invalidate();
    },
    onError: (e: any) => toast.error(e.message || 'Erro ao atualizar agendamento'),
  });

  const deleteScheduleMutation = trpc.backups.deleteSchedule.useMutation({
    onSuccess: () => {
      toast.success('Agendamento removido!');
      setDeleteScheduleId(null);
      utils.backups.listSchedules.invalidate();
    },
    onError: (e: any) => toast.error(e.message || 'Erro ao remover agendamento'),
  });

  function handleAddSchedule() {
    const h = parseInt(newHour);
    const m = parseInt(newMinute || '0');
    if (isNaN(h) || h < 0 || h > 23) {
      toast.error('Hora inválida (0–23)');
      return;
    }
    if (isNaN(m) || m < 0 || m > 59) {
      toast.error('Minuto inválido (0–59)');
      return;
    }
    addScheduleMutation.mutate({ hour: h, minute: m, label: newLabel || undefined });
  }

  const backupList = backups as any[];
  const scheduleList = schedules as any[];

  return (
    <AdminLayout title="Backup do Sistema">
      <div className="space-y-6">

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-border/60 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Backups</p>
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                  <Database className="w-4 h-4 text-blue-600" />
                </div>
              </div>
              <p className="text-2xl font-black text-foreground">{stats?.count ?? 0}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                <span className="text-green-600 font-semibold">{(stats as any)?.autoCount ?? 0} automáticos</span> · {(stats?.count ?? 0) - ((stats as any)?.autoCount ?? 0)} manuais
              </p>
            </CardContent>
          </Card>
          <Card className="border-border/60 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Espaço</p>
                <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center">
                  <HardDrive className="w-4 h-4 text-purple-600" />
                </div>
              </div>
              <p className="text-2xl font-black text-foreground">{stats?.totalSizeFormatted ?? '0 B'}</p>
              <p className="text-xs text-muted-foreground mt-0.5">total utilizado</p>
            </CardContent>
          </Card>
          <Card className="border-border/60 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Último backup</p>
                <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
                  <Clock className="w-4 h-4 text-green-600" />
                </div>
              </div>
              <p className="text-sm font-bold text-foreground">
                {backupList.length > 0 ? formatDate(backupList[0]?.createdAt) : 'Nenhum'}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">backup mais recente</p>
            </CardContent>
          </Card>
          <Card className={`border-border/60 shadow-sm ${(stats as any)?.failedCount > 0 ? 'border-red-200 bg-red-50/30' : ''}`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Falhas</p>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${(stats as any)?.failedCount > 0 ? 'bg-red-100' : 'bg-orange-50'}`}>
                  <Shield className={`w-4 h-4 ${(stats as any)?.failedCount > 0 ? 'text-red-600' : 'text-orange-600'}`} />
                </div>
              </div>
              <p className={`text-2xl font-black ${(stats as any)?.failedCount > 0 ? 'text-red-600' : 'text-foreground'}`}>
                {(stats as any)?.failedCount ?? 0}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">backups com falha</p>
            </CardContent>
          </Card>
        </div>

        {/* Agendamentos */}
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="border-b border-border/60 pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" />
                Agendamentos Automáticos
                <Badge variant="secondary" className="text-xs">{scheduleList.filter(s => s.isActive).length} ativos</Badge>
              </CardTitle>
              <Button size="sm" onClick={() => setShowAddSchedule(true)} className="gap-1.5">
                <Plus className="w-3.5 h-3.5" /> Adicionar Horário
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            {loadingSchedules ? (
              <div className="flex items-center justify-center py-6">
                <RefreshCw className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : scheduleList.length === 0 ? (
              <div className="text-center py-6">
                <Calendar className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Nenhum agendamento configurado</p>
                <Button size="sm" variant="outline" className="mt-3 gap-1.5" onClick={() => setShowAddSchedule(true)}>
                  <Plus className="w-3.5 h-3.5" /> Adicionar primeiro horário
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {scheduleList.map((s: any) => (
                  <div
                    key={s.id}
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${s.isActive ? 'border-green-200 bg-green-50/50' : 'border-border/60 bg-muted/20 opacity-60'}`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${s.isActive ? 'bg-green-100' : 'bg-muted'}`}>
                      <Clock className={`w-5 h-5 ${s.isActive ? 'text-green-600' : 'text-muted-foreground'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-foreground">{padTwo(s.hour)}:{padTwo(s.minute)}</p>
                      <p className="text-xs text-muted-foreground truncate">{s.label || 'Backup automático'}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => updateScheduleMutation.mutate({ id: s.id, isActive: !s.isActive })}
                        className="p-1 rounded hover:bg-white/80 transition-colors"
                        title={s.isActive ? 'Desativar' : 'Ativar'}
                      >
                        {s.isActive
                          ? <ToggleRight className="w-5 h-5 text-green-600" />
                          : <ToggleLeft className="w-5 h-5 text-muted-foreground" />}
                      </button>
                      <button
                        onClick={() => setDeleteScheduleId(s.id)}
                        className="p-1 rounded hover:bg-red-50 transition-colors"
                        title="Remover"
                      >
                        <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-3 flex items-start gap-2 text-xs text-muted-foreground bg-muted/30 rounded-lg p-3">
              <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-blue-500" />
              <span>Backups automáticos são executados diariamente nos horários configurados. Backups com mais de <strong>7 dias</strong> são deletados automaticamente às 03:00. Você receberá uma notificação ao concluir ou em caso de falha.</span>
            </div>
          </CardContent>
        </Card>

        {/* Ações manuais */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-foreground">Histórico de Backups</h2>
            <p className="text-sm text-muted-foreground">Backups manuais e automáticos dos últimos 7 dias</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => { refetch(); utils.backups.stats.invalidate(); }} className="gap-2">
              <RefreshCw className="w-4 h-4" /> Atualizar
            </Button>
            <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending} className="gap-2">
              {createMutation.isPending
                ? <><RefreshCw className="w-4 h-4 animate-spin" /> Criando...</>
                : <><Zap className="w-4 h-4" /> Criar Backup Agora</>}
            </Button>
          </div>
        </div>

        {/* Lista de backups */}
        <Card className="border-border/60 shadow-sm overflow-hidden">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-12 text-center">
                <RefreshCw className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3 animate-spin" />
                <p className="text-muted-foreground text-sm">Carregando backups...</p>
              </div>
            ) : backupList.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
                  <AlertCircle className="w-8 h-8 text-muted-foreground/40" />
                </div>
                <p className="font-semibold text-foreground">Nenhum backup encontrado</p>
                <p className="text-sm text-muted-foreground mt-1 mb-4">Crie o primeiro backup do sistema agora</p>
                <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending} className="gap-2">
                  <Plus className="w-4 h-4" /> Criar Primeiro Backup
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50 border-b border-border/60">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Arquivo</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tipo</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tamanho</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Data</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {backupList.map((backup) => {
                      const isAuto = backup.backupType === 'auto';
                      const isFailed = backup.backupStatus === 'failed';
                      return (
                        <tr key={backup.name} className={`hover:bg-muted/30 transition-colors ${isFailed ? 'bg-red-50/30' : ''}`}>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${isFailed ? 'bg-red-50' : isAuto ? 'bg-green-50' : 'bg-blue-50'}`}>
                                {isFailed
                                  ? <XCircle className="w-4 h-4 text-red-500" />
                                  : isAuto
                                    ? <Bot className="w-4 h-4 text-green-600" />
                                    : <User className="w-4 h-4 text-blue-600" />}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-foreground truncate max-w-xs">{backup.name}</p>
                                {isFailed && backup.errorMessage && (
                                  <p className="text-xs text-red-500 mt-0.5 truncate max-w-xs">{backup.errorMessage}</p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <Badge
                              variant="outline"
                              className={`text-[10px] font-semibold ${isAuto ? 'border-green-200 text-green-700 bg-green-50' : 'border-blue-200 text-blue-700 bg-blue-50'}`}
                            >
                              {isAuto ? '⚙ Automático' : '👤 Manual'}
                            </Badge>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-sm font-medium text-foreground">{isFailed ? '—' : backup.sizeFormatted}</p>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              {isFailed
                                ? <XCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                                : <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />}
                              <p className="text-sm text-foreground">{formatDate(backup.createdAt)}</p>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            {!isFailed && backup.url && (
                              <a href={backup.url} target="_blank" rel="noopener noreferrer" className="mr-2">
                                <Button size="sm" variant="outline" className="gap-1.5 text-xs h-7">
                                  Baixar
                                </Button>
                              </a>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10 h-7"
                              onClick={() => setDeleteFilename(backup.name)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

      </div>

      {/* Dialog: Adicionar agendamento */}
      <Dialog open={showAddSchedule} onOpenChange={setShowAddSchedule}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              Adicionar Horário de Backup
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold mb-1.5 block">Hora (0–23)</Label>
                <Input
                  type="number"
                  min={0}
                  max={23}
                  placeholder="ex: 13"
                  value={newHour}
                  onChange={e => setNewHour(e.target.value)}
                  className="h-9"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold mb-1.5 block">Minuto (0–59)</Label>
                <Input
                  type="number"
                  min={0}
                  max={59}
                  placeholder="ex: 00"
                  value={newMinute}
                  onChange={e => setNewMinute(e.target.value)}
                  className="h-9"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs font-semibold mb-1.5 block">Rótulo (opcional)</Label>
              <Input
                placeholder="ex: Backup da manhã"
                value={newLabel}
                onChange={e => setNewLabel(e.target.value)}
                className="h-9"
              />
            </div>
            {newHour !== '' && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/40 rounded-lg p-3">
                <Clock className="w-4 h-4 text-primary flex-shrink-0" />
                <span>Backup será executado todo dia às <strong className="text-foreground">{padTwo(parseInt(newHour) || 0)}:{padTwo(parseInt(newMinute) || 0)}</strong></span>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddSchedule(false)}>Cancelar</Button>
            <Button onClick={handleAddSchedule} disabled={addScheduleMutation.isPending || newHour === ''}>
              {addScheduleMutation.isPending ? 'Adicionando...' : 'Adicionar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Delete Backup */}
      <AlertDialog open={!!deleteFilename} onOpenChange={(o) => !o && setDeleteFilename(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Deletar backup?
            </AlertDialogTitle>
            <AlertDialogDescription>
              O arquivo <strong className="text-foreground">{deleteFilename}</strong> será permanentemente removido.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => deleteFilename && deleteMutation.mutate({ name: deleteFilename })}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deletando...' : 'Deletar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirm Delete Schedule */}
      <AlertDialog open={!!deleteScheduleId} onOpenChange={(o) => !o && setDeleteScheduleId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Remover agendamento?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Este horário de backup automático será removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => deleteScheduleId && deleteScheduleMutation.mutate({ id: deleteScheduleId })}
              disabled={deleteScheduleMutation.isPending}
            >
              {deleteScheduleMutation.isPending ? 'Removendo...' : 'Remover'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
