import { Injectable, Logger } from '@nestjs/common';
import { Socket } from 'socket.io';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  companyId?: string;
  roleKey?: string;
  tabId?: string;
}

@Injectable()
export class PermissionsWsService {
  private readonly logger = new Logger(PermissionsWsService.name);
  private clients: Map<string, AuthenticatedSocket> = new Map();

  addClient(client: AuthenticatedSocket) {
    this.clients.set(client.id, client);
  }

  removeClient(clientId: string) {
    this.clients.delete(clientId);
  }

  getClient(clientId: string): AuthenticatedSocket | undefined {
    return this.clients.get(clientId);
  }

  getClientsByUserId(userId: string): AuthenticatedSocket[] {
    const result: AuthenticatedSocket[] = [];
    for (const client of this.clients.values()) {
      if (client.userId === userId) {
        result.push(client);
      }
    }
    return result;
  }

  getClientsByCompanyAndRole(companyId: string, roleKey: string): AuthenticatedSocket[] {
    const result: AuthenticatedSocket[] = [];
    for (const client of this.clients.values()) {
      if (client.companyId === companyId && client.roleKey === roleKey) {
        result.push(client);
      }
    }
    return result;
  }

  getConnectedCount(): number {
    return this.clients.size;
  }

  getStats(): { total: number; byCompany: Record<string, number> } {
    const byCompany: Record<string, number> = {};
    for (const client of this.clients.values()) {
      if (client.companyId) {
        byCompany[client.companyId] = (byCompany[client.companyId] || 0) + 1;
      }
    }
    return { total: this.clients.size, byCompany };
  }
}
