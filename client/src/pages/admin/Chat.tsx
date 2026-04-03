import { useState, useEffect, useRef, useCallback } from "react";
import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, MessageSquare, User, Wifi, WifiOff, Clock } from "lucide-react";
import { toast } from "sonner";

interface Deliverer {
  id: number;
  name: string;
  phone: string | null;
  isOnline: boolean;
}

interface ChatMsg {
  id: number;
  delivererId: number;
  orderId: number | null;
  senderRole: "admin" | "deliverer";
  message: string;
  readAt: Date | null;
  createdAt: Date;
}

export default function AdminChat() {
  const [selectedDeliverer, setSelectedDeliverer] = useState<Deliverer | null>(null);
  const [inputMsg, setInputMsg] = useState("");
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [lastMsgId, setLastMsgId] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const utils = trpc.useUtils();

  // Lista de conversas
  const { data: conversationsData, refetch: refetchConversations } = trpc.chat.adminGetConversations.useQuery(
    undefined,
    { refetchInterval: 5_000 }
  );
  const conversations = conversationsData?.conversations ?? [];

  // Buscar mensagens ao selecionar entregador
  const { data: messagesData, refetch: refetchMessages } = trpc.chat.adminGetMessages.useQuery(
    { delivererId: selectedDeliverer?.id ?? 0 },
    { enabled: !!selectedDeliverer, refetchOnMount: true }
  );

  // Polling de novas mensagens a cada 3s
  const { data: pollData } = trpc.chat.adminPollNewMessages.useQuery(
    { delivererId: selectedDeliverer?.id ?? 0, afterId: lastMsgId },
    {
      enabled: !!selectedDeliverer,
      refetchInterval: 3_000,
    }
  );

  // Mutation de envio
  const sendMutation = trpc.chat.adminSend.useMutation({
    onSuccess: () => {
      setInputMsg("");
      refetchMessages();
      refetchConversations();
      utils.chat.adminTotalUnread.invalidate();
    },
    onError: (err) => toast.error("Erro ao enviar mensagem: " + err.message),
  });

  // Carregar mensagens iniciais ao selecionar entregador
  useEffect(() => {
    if (messagesData?.messages) {
      setMessages(messagesData.messages as ChatMsg[]);
      const ids = messagesData.messages.map((m) => m.id);
      if (ids.length > 0) setLastMsgId(Math.max(...ids));
      utils.chat.adminTotalUnread.invalidate();
      refetchConversations();
    }
  }, [messagesData]);

  // Adicionar novas mensagens do polling
  useEffect(() => {
    if (pollData?.messages && pollData.messages.length > 0) {
      setMessages((prev) => {
        const existingIds = new Set(prev.map((m) => m.id));
        const newMsgs = (pollData.messages as ChatMsg[]).filter((m) => !existingIds.has(m.id));
        if (newMsgs.length === 0) return prev;
        const updated = [...prev, ...newMsgs].sort((a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
        const maxId = Math.max(...updated.map((m) => m.id));
        setLastMsgId(maxId);
        utils.chat.adminTotalUnread.invalidate();
        refetchConversations();
        return updated;
      });
    }
  }, [pollData]);

  // Scroll automático para o final
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focar no input ao selecionar entregador
  useEffect(() => {
    if (selectedDeliverer) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [selectedDeliverer]);

  const handleSelectDeliverer = useCallback((d: Deliverer) => {
    setSelectedDeliverer(d);
    setMessages([]);
    setLastMsgId(0);
  }, []);

  const handleSend = useCallback(() => {
    const msg = inputMsg.trim();
    if (!msg || !selectedDeliverer) return;
    sendMutation.mutate({ delivererId: selectedDeliverer.id, message: msg });
  }, [inputMsg, selectedDeliverer, sendMutation]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  function formatTime(date: Date | string) {
    return new Date(date).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  }

  function formatDate(date: Date | string) {
    const d = new Date(date);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === today.toDateString()) return "Hoje";
    if (d.toDateString() === yesterday.toDateString()) return "Ontem";
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  }

  // Agrupar mensagens por data
  const groupedMessages: { date: string; msgs: ChatMsg[] }[] = [];
  messages.forEach((msg) => {
    const dateLabel = formatDate(msg.createdAt);
    const last = groupedMessages[groupedMessages.length - 1];
    if (last && last.date === dateLabel) {
      last.msgs.push(msg);
    } else {
      groupedMessages.push({ date: dateLabel, msgs: [msg] });
    }
  });

  return (
    <AdminLayout title="Chat com Entregadores">
      <div className="flex h-[calc(100vh-8rem)] gap-0 rounded-2xl overflow-hidden border border-border shadow-sm bg-white">
        {/* ─── Lista de Conversas ─────────────────────────────────────────── */}
        <aside className="w-72 flex-shrink-0 border-r border-border flex flex-col bg-slate-50">
          <div className="p-4 border-b border-border">
            <h2 className="font-bold text-foreground text-base flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-primary" />
              Conversas
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {conversations.length} entregador{conversations.length !== 1 ? "es" : ""}
            </p>
          </div>

          <ScrollArea className="flex-1">
            {conversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-center px-4">
                <MessageSquare className="w-8 h-8 text-muted-foreground/30 mb-2" />
                <p className="text-sm text-muted-foreground">Nenhum entregador cadastrado</p>
              </div>
            ) : (
              <div className="py-2">
                {conversations.map(({ deliverer, lastMessage, unreadCount }) => {
                  const isSelected = selectedDeliverer?.id === deliverer.id;
                  return (
                    <button
                      key={deliverer.id}
                      onClick={() => handleSelectDeliverer(deliverer)}
                      className={`w-full px-4 py-3 flex items-start gap-3 transition-colors text-left hover:bg-slate-100 ${
                        isSelected ? "bg-primary/8 border-r-2 border-primary" : ""
                      }`}
                    >
                      {/* Avatar */}
                      <div className="relative flex-shrink-0">
                        <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center">
                          <span className="text-primary font-bold text-sm">
                            {deliverer.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <span
                          className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${
                            deliverer.isOnline ? "bg-green-500" : "bg-slate-300"
                          }`}
                        />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span className={`text-sm font-semibold truncate ${isSelected ? "text-primary" : "text-foreground"}`}>
                            {deliverer.name}
                          </span>
                          {lastMessage && (
                            <span className="text-[10px] text-muted-foreground flex-shrink-0">
                              {formatTime(lastMessage.createdAt)}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between gap-1 mt-0.5">
                          <p className="text-xs text-muted-foreground truncate">
                            {lastMessage
                              ? (lastMessage.senderRole === "admin" ? "Você: " : "") + lastMessage.message
                              : "Nenhuma mensagem ainda"}
                          </p>
                          {unreadCount > 0 && (
                            <Badge className="bg-green-500 text-white text-[10px] px-1.5 py-0 h-4 flex-shrink-0 rounded-full">
                              {unreadCount > 9 ? "9+" : unreadCount}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </aside>

        {/* ─── Janela de Mensagens ────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col">
          {!selectedDeliverer ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                <MessageSquare className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2">Selecione uma conversa</h3>
              <p className="text-sm text-muted-foreground max-w-xs">
                Escolha um entregador na lista à esquerda para iniciar ou continuar uma conversa.
              </p>
            </div>
          ) : (
            <>
              {/* Header da conversa */}
              <div className="px-5 py-3.5 border-b border-border flex items-center gap-3 bg-white">
                <div className="relative">
                  <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center">
                    <span className="text-primary font-bold text-sm">
                      {selectedDeliverer.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <span
                    className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${
                      selectedDeliverer.isOnline ? "bg-green-500" : "bg-slate-300"
                    }`}
                  />
                </div>
                <div>
                  <p className="font-semibold text-foreground text-sm">{selectedDeliverer.name}</p>
                  <p className={`text-xs flex items-center gap-1 ${selectedDeliverer.isOnline ? "text-green-600" : "text-muted-foreground"}`}>
                    {selectedDeliverer.isOnline ? (
                      <><Wifi className="w-3 h-3" /> Online</>
                    ) : (
                      <><WifiOff className="w-3 h-3" /> Offline</>
                    )}
                  </p>
                </div>
                {selectedDeliverer.phone && (
                  <a
                    href={`https://wa.me/55${selectedDeliverer.phone.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-auto text-xs text-green-600 hover:text-green-700 font-medium flex items-center gap-1 bg-green-50 px-3 py-1.5 rounded-lg hover:bg-green-100 transition-colors"
                  >
                    📱 WhatsApp
                  </a>
                )}
              </div>

              {/* Área de mensagens */}
              <ScrollArea className="flex-1 px-5 py-4">
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-40 text-center">
                    <Clock className="w-8 h-8 text-muted-foreground/30 mb-2" />
                    <p className="text-sm text-muted-foreground">Nenhuma mensagem ainda</p>
                    <p className="text-xs text-muted-foreground mt-1">Envie uma mensagem para começar</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {groupedMessages.map(({ date, msgs }) => (
                      <div key={date}>
                        {/* Separador de data */}
                        <div className="flex items-center gap-3 my-4">
                          <div className="flex-1 h-px bg-border" />
                          <span className="text-[11px] font-medium text-muted-foreground bg-slate-50 px-2 py-0.5 rounded-full border border-border">
                            {date}
                          </span>
                          <div className="flex-1 h-px bg-border" />
                        </div>

                        {msgs.map((msg, idx) => {
                          const isAdmin = msg.senderRole === "admin";
                          const prevMsg = idx > 0 ? msgs[idx - 1] : null;
                          const showAvatar = !prevMsg || prevMsg.senderRole !== msg.senderRole;

                          return (
                            <div
                              key={msg.id}
                              className={`flex items-end gap-2 ${isAdmin ? "flex-row-reverse" : "flex-row"} ${
                                showAvatar ? "mt-3" : "mt-0.5"
                              }`}
                            >
                              {/* Avatar */}
                              {showAvatar ? (
                                <div
                                  className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                                    isAdmin ? "bg-primary text-white" : "bg-slate-200 text-slate-600"
                                  }`}
                                >
                                  {isAdmin ? "A" : selectedDeliverer.name.charAt(0).toUpperCase()}
                                </div>
                              ) : (
                                <div className="w-7 flex-shrink-0" />
                              )}

                              {/* Balão */}
                              <div
                                className={`max-w-[70%] px-3.5 py-2 rounded-2xl text-sm leading-relaxed ${
                                  isAdmin
                                    ? "bg-primary text-white rounded-br-sm"
                                    : "bg-slate-100 text-foreground rounded-bl-sm"
                                }`}
                              >
                                {msg.orderId && (
                                  <p className={`text-[10px] font-semibold mb-1 ${isAdmin ? "text-white/70" : "text-primary"}`}>
                                    📦 Pedido #{msg.orderId}
                                  </p>
                                )}
                                <p className="whitespace-pre-wrap break-words">{msg.message}</p>
                                <p
                                  className={`text-[10px] mt-1 text-right ${
                                    isAdmin ? "text-white/60" : "text-muted-foreground"
                                  }`}
                                >
                                  {formatTime(msg.createdAt)}
                                  {isAdmin && msg.readAt && " ✓✓"}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </ScrollArea>

              {/* Input de mensagem */}
              <div className="px-4 py-3 border-t border-border bg-white">
                <div className="flex items-center gap-2">
                  <Input
                    ref={inputRef}
                    value={inputMsg}
                    onChange={(e) => setInputMsg(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={`Mensagem para ${selectedDeliverer.name}...`}
                    className="flex-1 rounded-xl border-border bg-slate-50 focus:bg-white transition-colors"
                    disabled={sendMutation.isPending}
                    maxLength={1000}
                  />
                  <Button
                    onClick={handleSend}
                    disabled={!inputMsg.trim() || sendMutation.isPending}
                    size="icon"
                    className="rounded-xl w-10 h-10 flex-shrink-0 bg-primary hover:bg-primary/90"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1.5 px-1">
                  Enter para enviar · O entregador receberá uma notificação push
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
