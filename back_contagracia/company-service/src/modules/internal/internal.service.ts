import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class InternalService {
  private readonly logger = new Logger(InternalService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getChartOfAccounts(): Promise<any> {
    try {
      const accounts = await this.prisma.chartOfAccount.findMany({
        orderBy: { code: 'asc' },
      });

      // Construir árbol jerárquico
      const accountMap = new Map<string, any>();
      const roots: any[] = [];

      // Primer paso: crear mapa de todas las cuentas (usando code como key)
      for (const account of accounts) {
        accountMap.set(account.code, {
          code: account.code,
          name: account.name,
          type: account.type,
          is_active: account.is_active,
          children: [],
        });
      }

      // Segundo paso: construir jerarquía
      for (const account of accounts) {
        const node = accountMap.get(account.code);
        if (account.parent_code) {
          const parent = accountMap.get(account.parent_code);
          if (parent) {
            parent.children.push(node);
          }
        } else {
          roots.push(node);
        }
      }

      return {
        total: accounts.length,
        tree: roots,
        flat: accounts.map((a) => ({
          code: a.code,
          name: a.name,
          type: a.type,
          parent_code: a.parent_code,
        })),
      };
    } catch (error) {
      this.logger.error('Error getChartOfAccounts:', error);
      throw error;
    }
  }

  async getAccountingConfigs(): Promise<any> {
    try {
      const configs = await this.prisma.accountingConfig.findMany({
        include: {
          account: {
            select: {
              code: true,
              name: true,
              type: true,
            },
          },
        },
        orderBy: { key: 'asc' },
      });

      return {
        total: configs.length,
        configs: configs.map((c) => ({
          key: c.key,
          description: c.description,
          default: c.default,
          account: c.account
            ? {
                code: c.account.code,
                name: c.account.name,
                type: c.account.type,
              }
            : null,
        })),
      };
    } catch (error) {
      this.logger.error('Error getAccountingConfigs:', error);
      throw error;
    }
  }

  async getFullView(): Promise<any> {
    const [puc, configs] = await Promise.all([
      this.getChartOfAccounts(),
      this.getAccountingConfigs(),
    ]);

    return {
      chart_of_accounts: puc,
      accounting_configs: configs,
    };
  }
}
