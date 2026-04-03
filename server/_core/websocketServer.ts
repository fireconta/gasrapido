import { Server as HTTPServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { EventEmitter } from 'events';

export interface WebSocketMessage {
  type: 'subscribe' | 'unsubscribe' | 'notification' | 'ping' | 'pong';
  channel?: string;
  userId?: number;
  userRole?: 'admin' | 'deliverer' | 'customer';
  data?: any;
  timestamp?: Date;
}

interface ClientConnection {
  ws: WebSocket;
  userId?: number;
  userRole?: 'admin' | 'deliverer' | 'customer';
  channels: Set<string>;
  isAlive: boolean;
}

/**
 * Servidor WebSocket para notificações em tempo real
 * Gerencia conexões, canais e distribuição de mensagens
 */
export class WebSocketNotificationServer extends EventEmitter {
  private wss: WebSocketServer;
  private clients: Map<WebSocket, ClientConnection> = new Map();
  private channels: Map<string, Set<WebSocket>> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor(httpServer: HTTPServer) {
    super();
    // Usar noServer para controlar manualmente o upgrade
    this.wss = new WebSocketServer({ noServer: true });
    this.setupUpgrade(httpServer);
    this.setupConnections();
    this.startHeartbeat();
  }

  /**
   * Configurar upgrade manual para filtrar por path (evitar conflito com Vite HMR)
   */
  private setupUpgrade(httpServer: HTTPServer): void {
    httpServer.on('upgrade', (request, socket, head) => {
      const url = request.url || '';
      // Apenas aceitar conexões no path /ws (nosso WebSocket de notificações)
      if (url.startsWith('/ws')) {
        this.wss.handleUpgrade(request, socket as any, head, (ws) => {
          this.wss.emit('connection', ws, request);
        });
      }
      // Outras conexões WebSocket (Vite HMR) são ignoradas aqui
    });
  }

  /**
   * Configurar manipuladores de conexão
   */
  private setupConnections(): void {
    this.wss.on('connection', (ws: WebSocket) => {
      console.log('[WebSocket] Nova conexão');

      const client: ClientConnection = {
        ws,
        channels: new Set(),
        isAlive: true,
      };

      this.clients.set(ws, client);

      // Manipulador de mensagens
      ws.on('message', (data: Buffer) => {
        try {
          const message: WebSocketMessage = JSON.parse(data.toString());
          this.handleMessage(ws, message);
        } catch (e) {
          console.error('[WebSocket] Erro ao parsear mensagem:', e);
        }
      });

      // Manipulador de pong (heartbeat)
      ws.on('pong', () => {
        const client = this.clients.get(ws);
        if (client) {
          client.isAlive = true;
        }
      });

      // Manipulador de fechamento
      ws.on('close', () => {
        this.handleDisconnect(ws);
      });

      // Manipulador de erro
      ws.on('error', (error) => {
        console.error('[WebSocket] Erro:', error);
      });

      // Enviar mensagem de boas-vindas
      this.send(ws, {
        type: 'notification',
        data: {
          message: 'Conectado ao servidor de notificações',
          timestamp: new Date(),
        },
      });
    });
  }

  /**
   * Manipular mensagem recebida
   */
  private handleMessage(ws: WebSocket, message: WebSocketMessage): void {
    const client = this.clients.get(ws);
    if (!client) return;

    switch (message.type) {
      case 'subscribe':
        this.handleSubscribe(ws, message);
        break;
      case 'unsubscribe':
        this.handleUnsubscribe(ws, message);
        break;
      case 'ping':
        this.send(ws, { type: 'pong', timestamp: new Date() });
        break;
      default:
        console.warn('[WebSocket] Tipo de mensagem desconhecido:', message.type);
    }
  }

  /**
   * Manipular inscrição em canal
   */
  private handleSubscribe(ws: WebSocket, message: WebSocketMessage): void {
    const client = this.clients.get(ws);
    if (!client || !message.channel) return;

    // Atualizar informações do cliente
    if (message.userId) client.userId = message.userId;
    if (message.userRole) client.userRole = message.userRole;

    // Adicionar ao canal
    client.channels.add(message.channel);

    if (!this.channels.has(message.channel)) {
      this.channels.set(message.channel, new Set());
    }
    this.channels.get(message.channel)!.add(ws);

    console.log(
      `[WebSocket] Cliente inscrito no canal: ${message.channel} (userId: ${client.userId})`
    );

    // Enviar confirmação
    this.send(ws, {
      type: 'notification',
      data: {
        message: `Inscrito no canal: ${message.channel}`,
        channel: message.channel,
      },
    });
  }

  /**
   * Manipular desinscrição de canal
   */
  private handleUnsubscribe(ws: WebSocket, message: WebSocketMessage): void {
    const client = this.clients.get(ws);
    if (!client || !message.channel) return;

    client.channels.delete(message.channel);
    const channelClients = this.channels.get(message.channel);
    if (channelClients) {
      channelClients.delete(ws);
      if (channelClients.size === 0) {
        this.channels.delete(message.channel);
      }
    }

    console.log(`[WebSocket] Cliente desinscritos do canal: ${message.channel}`);
  }

  /**
   * Manipular desconexão
   */
  private handleDisconnect(ws: WebSocket): void {
    const client = this.clients.get(ws);
    if (!client) return;

    // Remover de todos os canais
    client.channels.forEach((channel) => {
      const channelClients = this.channels.get(channel);
      if (channelClients) {
        channelClients.delete(ws);
        if (channelClients.size === 0) {
          this.channels.delete(channel);
        }
      }
    });

    this.clients.delete(ws);
    console.log('[WebSocket] Cliente desconectado');
  }

  /**
   * Enviar mensagem para um cliente
   */
  private send(ws: WebSocket, message: WebSocketMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  /**
   * Enviar notificação para um canal específico
   */
  public broadcastToChannel(
    channel: string,
    notification: any,
    excludeWs?: WebSocket
  ): number {
    const clients = this.channels.get(channel);
    if (!clients) return 0;

    let count = 0;
    clients.forEach((ws) => {
      if (excludeWs && ws === excludeWs) return;
      this.send(ws, {
        type: 'notification',
        channel,
        data: notification,
        timestamp: new Date(),
      });
      count++;
    });

    return count;
  }

  /**
   * Enviar notificação para usuário específico
   */
  public broadcastToUser(
    userId: number,
    notification: any,
    excludeWs?: WebSocket
  ): number {
    let count = 0;
    this.clients.forEach((client, ws) => {
      if (client.userId === userId && (!excludeWs || ws !== excludeWs)) {
        this.send(ws, {
          type: 'notification',
          data: notification,
          timestamp: new Date(),
        });
        count++;
      }
    });
    return count;
  }

  /**
   * Enviar notificação para todos os usuários de um tipo
   */
  public broadcastToRole(
    role: 'admin' | 'deliverer' | 'customer',
    notification: any,
    excludeWs?: WebSocket
  ): number {
    let count = 0;
    this.clients.forEach((client, ws) => {
      if (client.userRole === role && (!excludeWs || ws !== excludeWs)) {
        this.send(ws, {
          type: 'notification',
          data: notification,
          timestamp: new Date(),
        });
        count++;
      }
    });
    return count;
  }

  /**
   * Enviar notificação para todos os clientes
   */
  public broadcastToAll(notification: any, excludeWs?: WebSocket): number {
    let count = 0;
    this.clients.forEach((client, ws) => {
      if (!excludeWs || ws !== excludeWs) {
        this.send(ws, {
          type: 'notification',
          data: notification,
          timestamp: new Date(),
        });
        count++;
      }
    });
    return count;
  }

  /**
   * Iniciar heartbeat para detectar conexões mortas
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      this.clients.forEach((client, ws) => {
        if (!client.isAlive) {
          ws.terminate();
          return;
        }
        client.isAlive = false;
        ws.ping();
      });
    }, 30000); // 30 segundos
  }

  /**
   * Obter estatísticas
   */
  public getStats() {
    return {
      totalConnections: this.clients.size,
      totalChannels: this.channels.size,
      channels: Array.from(this.channels.entries()).map(([name, clients]) => ({
        name,
        subscribers: clients.size,
      })),
      clientsByRole: {
        admin: Array.from(this.clients.values()).filter((c) => c.userRole === 'admin').length,
        deliverer: Array.from(this.clients.values()).filter((c) => c.userRole === 'deliverer')
          .length,
        customer: Array.from(this.clients.values()).filter((c) => c.userRole === 'customer')
          .length,
      },
    };
  }

  /**
   * Fechar servidor
   */
  public close(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    this.wss.close();
  }
}

// Exportar instância única
let wsServer: WebSocketNotificationServer | null = null;

export function initializeWebSocketServer(httpServer: HTTPServer): WebSocketNotificationServer {
  if (!wsServer) {
    wsServer = new WebSocketNotificationServer(httpServer);
    console.log('[WebSocket] Servidor WebSocket inicializado');
  }
  return wsServer;
}

export function getWebSocketServer(): WebSocketNotificationServer {
  if (!wsServer) {
    throw new Error('WebSocket server não foi inicializado');
  }
  return wsServer;
}
