import { Injectable, NotFoundException } from '@nestjs/common';
import { TenantContextService } from '@contagracia/shared-modules';
import { ArApType, ArApStatus, PaymentReceiptType } from '@prisma/client-tenant';

/* ── DTOs ─────────────────────────────────────────────────── */

export interface SummaryByThirdPartyParams {
  type: ArApType;
  search?: string;
  bucket?: 'all' | 'overdue' | '0-30' | '31-60' | '60+';
  tab?: 'pending' | 'paid' | 'all';
  dateFrom?: string;    // emisión desde YYYY-MM-DD
  dateTo?: string;      // emisión hasta YYYY-MM-DD
  dueDateFrom?: string; // vencimiento desde YYYY-MM-DD
  dueDateTo?: string;   // vencimiento hasta YYYY-MM-DD
  page?: number;
  limit?: number;
}

export interface ThirdPartyDetailParams {
  type: ArApType;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  dueDateFrom?: string;
  dueDateTo?: string;
  page?: number;
  limit?: number;
  statuses?: ArApStatus[];
  overdue?: 'all' | 'overdue' | 'current';
}

export interface PaymentReceiptsParams {
  type: PaymentReceiptType;
  exclude_types?: PaymentReceiptType[];
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

/* ── Service ──────────────────────────────────────────────── */

@Injectable()
export class ArApService {
  constructor(private readonly tenantContext: TenantContextService) {}

  private async getTenantDb(companyId: string) {
    const tenantDb = await this.tenantContext.getTenantClient(companyId);
    if (!tenantDb) {
      throw new NotFoundException('Empresa no encontrada o inactiva');
    }
    return tenantDb;
  }

  /**
   * Lista de tipos de documento (ar_ap_sources)
   */
  async getSources(companyId: string): Promise<{ key: string; description: string }[]> {
    const tenantDb = await this.getTenantDb(companyId);
    const sources = await tenantDb.arApSource.findMany({
      orderBy: { description: 'asc' },
    });
    return sources.map(s => ({ key: s.key, description: s.description }));
  }

  /**
   * Resumen de saldos agrupado por tercero (cliente o proveedor)
   * Con paginación, búsqueda, filtro de fechas y tab (pending/paid)
   */
  async getSummaryByThirdParty(companyId: string, params: SummaryByThirdPartyParams): Promise<{
    data: { third_party_id: string; third_party_name: string; third_party_document: string; total_amount: number; total_paid: number; total_balance: number; total_docs: number; pending_docs: number; paid_docs: number; last_doc_date: string | null; last_payment_date: string | null; avg_overdue_days: number }[];
    total: number; page: number; totalPages: number;
  }> {
    const tenantDb = await this.getTenantDb(companyId);
    const { type, search, bucket, tab = 'all', dateFrom, dateTo, dueDateFrom, dueDateTo, page = 1, limit = 20 } = params;

    // Build where clause
    const where: any = {
      type,
      status: { not: ArApStatus.VOIDED },
    };

    // Fuzzy search por nombre o número de identificación del tercero (pg_trgm)
    if (search) {
      const searchPattern = `%${search}%`;
      const fuzzyMatches = await tenantDb.$queryRaw<Array<{ id: string }>>`
        SELECT "id" FROM "third_parties"
        WHERE "name" ILIKE ${searchPattern}
        OR "identification_number" ILIKE ${searchPattern}
        OR word_similarity(${search}, COALESCE("name", '')) > 0.3
        OR word_similarity(${search}, COALESCE("identification_number", '')) > 0.3
      `;
      const matchIds = fuzzyMatches.map(r => r.id);
      if (matchIds.length > 0) {
        where.third_party_id = { in: matchIds };
      } else {
        return { data: [], total: 0, page, totalPages: 0 };
      }
    }

    if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) where.date.gte = new Date(dateFrom + 'T00:00:00');
      if (dateTo) where.date.lte = new Date(dateTo + 'T23:59:59');
    }

    if (dueDateFrom || dueDateTo) {
      where.due_date = {};
      if (dueDateFrom) where.due_date.gte = new Date(dueDateFrom + 'T00:00:00');
      if (dueDateTo) where.due_date.lte = new Date(dueDateTo + 'T23:59:59');
    }

    // Get all matching ArAp records with third party info
    const records = await tenantDb.arAp.findMany({
      where,
      select: {
        id: true,
        third_party_id: true,
        amount: true,
        paid: true,
        balance: true,
        status: true,
        date: true,
        due_date: true,
        third_party: {
          select: {
            id: true,
            name: true,
            identification_number: true,
          },
        },
      },
    });

    // Get last payment date per third party
    const paymentWhere: any = {
      is_voided: false,
      ar_ap: { type, status: { not: ArApStatus.VOIDED } },
    };
    if (dateFrom || dateTo) {
      paymentWhere.date = {};
      if (dateFrom) paymentWhere.date.gte = new Date(dateFrom + 'T00:00:00');
      if (dateTo) paymentWhere.date.lte = new Date(dateTo + 'T23:59:59');
    }

    const payments = await tenantDb.payment.findMany({
      where: paymentWhere,
      select: {
        date: true,
        ar_ap: { select: { third_party_id: true } },
      },
      orderBy: { date: 'desc' },
    });

    const lastPaymentByThirdParty = new Map<string, Date>();
    for (const p of payments) {
      const tid = p.ar_ap.third_party_id;
      if (!lastPaymentByThirdParty.has(tid)) {
        lastPaymentByThirdParty.set(tid, p.date);
      }
    }

    // Group by third party
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayMs = today.getTime();

    const grouped = new Map<string, {
      third_party_id: string;
      third_party_name: string;
      third_party_document: string;
      total_amount: number;
      total_paid: number;
      total_balance: number;
      total_docs: number;
      pending_docs: number;
      paid_docs: number;
      last_doc_date: Date | null;
      last_payment_date: Date | null;
      overdue_days_sum: number;
      overdue_count: number;
      has_bucket_match: boolean;
    }>();

    for (const r of records) {
      const tid = r.third_party_id;
      if (!grouped.has(tid)) {
        grouped.set(tid, {
          third_party_id: tid,
          third_party_name: r.third_party.name || '',
          third_party_document: r.third_party.identification_number || '',
          total_amount: 0,
          total_paid: 0,
          total_balance: 0,
          total_docs: 0,
          pending_docs: 0,
          paid_docs: 0,
          last_doc_date: null,
          last_payment_date: lastPaymentByThirdParty.get(tid) || null,
          overdue_days_sum: 0,
          overdue_count: 0,
          has_bucket_match: false,
        });
      }

      const g = grouped.get(tid)!;
      const amount = Number(r.amount);
      const paid = Number(r.paid);
      const balance = Number(r.balance);

      g.total_amount += amount;
      g.total_paid += paid;
      g.total_balance += balance;

      g.total_docs += 1;
      if (r.status === ArApStatus.PENDING || r.status === ArApStatus.PARTIAL) {
        g.pending_docs += 1;
      }
      if (r.status === ArApStatus.PAID) {
        g.paid_docs += 1;
      }

      if (!g.last_doc_date || r.date > g.last_doc_date) {
        g.last_doc_date = r.date;
      }

      // Bucket filtering
      if (bucket && bucket !== 'all' && r.due_date && balance > 0) {
        const dueMs = new Date(r.due_date).getTime();
        const diffDays = Math.floor((dueMs - todayMs) / 86400000);
        switch (bucket) {
          case 'overdue': if (diffDays < 0) g.has_bucket_match = true; break;
          case '0-30': if (diffDays >= 0 && diffDays <= 30) g.has_bucket_match = true; break;
          case '31-60': if (diffDays >= 31 && diffDays <= 60) g.has_bucket_match = true; break;
          case '60+': if (diffDays >= 61) g.has_bucket_match = true; break;
        }
      } else if (!bucket || bucket === 'all') {
        g.has_bucket_match = true;
      }

      // Overdue days for average
      if (r.due_date && balance > 0) {
        const dueMs = new Date(r.due_date).getTime();
        const overdueDays = Math.max(0, Math.floor((todayMs - dueMs) / 86400000));
        if (overdueDays > 0) {
          g.overdue_days_sum += overdueDays;
          g.overdue_count += 1;
        }
      }
    }

    // Filter by bucket + tab, build response
    let filtered = Array.from(grouped.values()).filter((g) => g.has_bucket_match);

    if (tab === 'pending') {
      filtered = filtered.filter((g) => g.total_balance > 0);
    } else if (tab === 'paid') {
      filtered = filtered.filter((g) => g.total_balance <= 0 && g.total_paid > 0);
    }

    const sorted = filtered
      .map((g) => ({
        third_party_id: g.third_party_id,
        third_party_name: g.third_party_name,
        third_party_document: g.third_party_document,
        total_amount: g.total_amount,
        total_paid: g.total_paid,
        total_balance: g.total_balance,
        total_docs: g.total_docs,
        pending_docs: g.pending_docs,
        paid_docs: g.paid_docs,
        last_doc_date: g.last_doc_date?.toISOString().slice(0, 10) || null,
        last_payment_date: g.last_payment_date?.toISOString().slice(0, 10) || null,
        avg_overdue_days: g.overdue_count > 0 ? Math.round(g.overdue_days_sum / g.overdue_count) : 0,
      }))
      .sort((a, b) => b.total_balance - a.total_balance);

    const total = sorted.length;
    const totalPages = Math.ceil(total / limit);
    const data = sorted.slice((page - 1) * limit, page * limit);

    return { data, total, page, totalPages };
  }

  /**
   * Detalle de documentos y pagos de un tercero
   * Con búsqueda y filtro de fechas
   */
  async getThirdPartyDetail(companyId: string, thirdPartyId: string, params: ThirdPartyDetailParams): Promise<{
    transactions: { id: string; source_key: string; source_description: string; description: string | null; source_number: string | null; consecutive: string | null; date: string; due_date: string | null; amount: number; paid: number; balance: number; status: string; account_code: string | null; account_name: string | null; days_overdue: number; days_due: number }[];
    payments: { id: string; consecutive: string | null; date: string; amount: number; payment_method_name: string | null; source_description: string | null; receipt_id: string | null; receipt_consecutive: string | null; description: string | null; ar_ap_consecutive: string | null; ar_ap_source_number: string | null }[];
    txTotal: number; txPage: number; txTotalPages: number;
  }> {
    const tenantDb = await this.getTenantDb(companyId);
    const { type, search, dateFrom, dateTo, dueDateFrom, dueDateTo, page = 1, limit = 10, statuses, overdue } = params;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayMs = today.getTime();

    // Build where for ArAp
    const arApWhere: any = {
      third_party_id: thirdPartyId,
      type,
      status: statuses && statuses.length > 0
        ? { in: statuses }
        : { not: ArApStatus.VOIDED },
    };

    // Filtro vencido/al día
    if (overdue === 'overdue') {
      if (!arApWhere.AND) arApWhere.AND = [];
      arApWhere.AND.push({ due_date: { lt: today } }, { balance: { gt: 0 } });
    } else if (overdue === 'current') {
      if (!arApWhere.AND) arApWhere.AND = [];
      arApWhere.AND.push({ OR: [{ due_date: { gte: today } }, { due_date: null }] });
    }

    if (dateFrom || dateTo) {
      arApWhere.date = {};
      if (dateFrom) arApWhere.date.gte = new Date(dateFrom + 'T00:00:00');
      if (dateTo) arApWhere.date.lte = new Date(dateTo + 'T23:59:59');
    }

    if (dueDateFrom || dueDateTo) {
      arApWhere.due_date = {};
      if (dueDateFrom) arApWhere.due_date.gte = new Date(dueDateFrom + 'T00:00:00');
      if (dueDateTo) arApWhere.due_date.lte = new Date(dueDateTo + 'T23:59:59');
    }

    // Fuzzy search con word_similarity
    if (search) {
      const searchPattern = `%${search}%`;
      const fuzzyMatches = await tenantDb.$queryRaw<Array<{ id: string }>>`
        SELECT a."id" FROM "ar_ap" a
        WHERE a."third_party_id" = ${thirdPartyId}
        AND (
          a."consecutive" ILIKE ${searchPattern}
          OR a."source_number" ILIKE ${searchPattern}
          OR COALESCE(a."description", '') ILIKE ${searchPattern}
          OR word_similarity(${search}, COALESCE(a."consecutive", '')) > 0.3
          OR word_similarity(${search}, COALESCE(a."source_number", '')) > 0.3
          OR word_similarity(${search}, COALESCE(a."description", '')) > 0.3
        )
      `;
      const matchIds = fuzzyMatches.map(r => r.id);
      if (matchIds.length === 0) {
        return { transactions: [], payments: [], txTotal: 0, txPage: page, txTotalPages: 0 };
      }
      arApWhere.id = { in: matchIds };
    }

    // Count + paginated query
    const [arApRecords, txTotal] = await Promise.all([
      tenantDb.arAp.findMany({
        where: arApWhere,
        include: {
          source: { select: { key: true, description: true } },
          account: { select: { name: true } },
        },
        orderBy: { date: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      tenantDb.arAp.count({ where: arApWhere }),
    ]);

    const txTotalPages = Math.ceil(txTotal / limit);

    const transactions = arApRecords.map((r) => {
      const dueMs = r.due_date ? new Date(r.due_date).getTime() : null;
      const daysOverdue = dueMs ? Math.max(0, Math.floor((todayMs - dueMs) / 86400000)) : 0;

      return {
        id: r.id,
        source_key: r.source_key,
        source_description: r.source.description,
        description: r.description || null,
        source_number: r.source_number,
        consecutive: r.consecutive,
        date: r.date.toISOString().slice(0, 10),
        due_date: r.due_date?.toISOString().slice(0, 10) || null,
        amount: Number(r.amount),
        paid: Number(r.paid),
        balance: Number(r.balance),
        status: r.status,
        account_code: r.account_code || null,
        account_name: r.account?.name || null,
        days_overdue: Number(r.balance) > 0 ? daysOverdue : 0,
        days_due: dueMs ? Math.floor((dueMs - todayMs) / 86400000) : 0,
      };
    });

    // Get payments for ALL ArAp of this third party (not paginated)
    const allArApIds = search
      ? arApWhere.id.in
      : (await tenantDb.arAp.findMany({ where: { third_party_id: thirdPartyId, type, status: { not: ArApStatus.VOIDED } }, select: { id: true } })).map(r => r.id);

    const paymentRecords = allArApIds.length > 0
      ? await tenantDb.payment.findMany({
          where: { ar_ap_id: { in: allArApIds }, is_voided: false },
          include: {
            ar_ap: {
              select: { consecutive: true, source_number: true, source: { select: { description: true } } },
            },
            payment_receipt: { select: { id: true, consecutive: true } },
            payment_receipt_line: {
              select: {
                company_payment_method: { select: { name: true } },
              },
            },
          },
          orderBy: { date: 'desc' },
        })
      : [];

    const paymentsList = paymentRecords.map((p) => ({
      id: p.id,
      consecutive: p.consecutive,
      date: p.date.toISOString().slice(0, 10),
      amount: Number(p.amount),
      payment_method_name: p.payment_receipt_line?.company_payment_method?.name || null,
      source_description: p.ar_ap?.source?.description || null,
      receipt_id: p.payment_receipt?.id || null,
      receipt_consecutive: p.payment_receipt?.consecutive || null,
      description: p.description,
      ar_ap_consecutive: p.ar_ap?.consecutive || null,
      ar_ap_source_number: p.ar_ap?.source_number || null,
    }));

    return { transactions, payments: paymentsList, txTotal, txPage: page, txTotalPages };
  }

  /**
   * Pagos de un tercero — paginados con filtros
   */
  async getThirdPartyPayments(companyId: string, thirdPartyId: string, params: {
    type: ArApType;
    search?: string;
    dateFrom?: string;
    dateTo?: string;
    sourceKey?: string;
    paymentMethodId?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    data: { id: string; consecutive: string | null; date: string; amount: number; payment_method_name: string | null; source_description: string | null; receipt_id: string | null; receipt_consecutive: string | null; description: string | null; ar_ap_consecutive: string | null; ar_ap_source_number: string | null }[];
    total: number; page: number; totalPages: number;
  }> {
    const tenantDb = await this.getTenantDb(companyId);
    const { type, search, dateFrom, dateTo, sourceKey, paymentMethodId, page = 1, limit = 10 } = params;

    // Build where
    const where: any = {
      is_voided: false,
      ar_ap: {
        third_party_id: thirdPartyId,
        type,
        status: { not: ArApStatus.VOIDED },
      },
    };

    // Date filter on payment date
    if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) where.date.gte = new Date(dateFrom + 'T00:00:00');
      if (dateTo) where.date.lte = new Date(dateTo + 'T23:59:59');
    }

    // Source key filter (document type)
    if (sourceKey) {
      where.ar_ap.source_key = sourceKey;
    }

    // Payment method filter
    if (paymentMethodId) {
      where.payment_receipt_line = { company_payment_method_id: paymentMethodId };
    }

    // Search filter — need raw query for fuzzy
    if (search) {
      const searchPattern = `%${search}%`;
      const fuzzyMatches = await tenantDb.$queryRaw<Array<{ id: string }>>`
        SELECT p."id" FROM "payments" p
        JOIN "ar_ap" a ON a."id" = p."ar_ap_id"
        WHERE a."third_party_id" = ${thirdPartyId}::uuid
        AND a."type" = ${type}::"ArApType"
        AND p."is_voided" = false
        AND (
          COALESCE(p."consecutive", '') ILIKE ${searchPattern}
          OR COALESCE(p."description", '') ILIKE ${searchPattern}
          OR COALESCE(a."consecutive", '') ILIKE ${searchPattern}
          OR COALESCE(a."source_number", '') ILIKE ${searchPattern}
        )
      `;
      const matchIds = fuzzyMatches.map(r => r.id);
      if (matchIds.length === 0) {
        return { data: [], total: 0, page, totalPages: 0 };
      }
      where.id = { in: matchIds };
    }

    const [records, total] = await Promise.all([
      tenantDb.payment.findMany({
        where,
        include: {
          ar_ap: {
            select: { consecutive: true, source_number: true, source: { select: { description: true } } },
          },
          payment_receipt: { select: { id: true, consecutive: true } },
          payment_receipt_line: {
            select: { company_payment_method: { select: { name: true } } },
          },
        },
        orderBy: { date: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      tenantDb.payment.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    const data = records.map((p) => ({
      id: p.id,
      consecutive: p.consecutive,
      date: p.date.toISOString().slice(0, 10),
      amount: Number(p.amount),
      payment_method_name: p.payment_receipt_line?.company_payment_method?.name || null,
      source_description: p.ar_ap?.source?.description || null,
      receipt_id: p.payment_receipt?.id || null,
      receipt_consecutive: p.payment_receipt?.consecutive || null,
      description: p.description,
      ar_ap_consecutive: p.ar_ap?.consecutive || null,
      ar_ap_source_number: p.ar_ap?.source_number || null,
    }));

    return { data, total, page, totalPages };
  }

  /**
   * Listado de recibos de caja / comprobantes de egreso
   * Con paginación, búsqueda y filtro de fechas
   */
  async getPaymentReceipts(companyId: string, params: PaymentReceiptsParams): Promise<{
    data: { id: string; consecutive: string | null; description: string | null; third_party_name: string | null; third_party_document: string | null; date: string; amount: number; income_amount: number; expense_amount: number; bank_amount: number; document_amount: number; client_prepayment_amount: number; supplier_prepayment_amount: number; status: string; has_journal: boolean }[];
    total: number; page: number; limit: number; totalPages: number;
  }> {
    const tenantDb = await this.getTenantDb(companyId);
    const { type, exclude_types, search, dateFrom, dateTo, page = 1, limit = 20 } = params;

    const where: any = { type };

    if (exclude_types && exclude_types.length > 0) {
      where.type = { equals: type, notIn: exclude_types };
    }

    if (search) {
      where.OR = [
        { consecutive: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { third_party: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) where.date.gte = new Date(dateFrom + 'T00:00:00');
      if (dateTo) where.date.lte = new Date(dateTo + 'T23:59:59');
    }

    const [receipts, total] = await Promise.all([
      tenantDb.paymentReceipt.findMany({
        where,
        include: {
          third_party: { select: { name: true, identification_number: true } },
          lines: { select: { kind: true, debit: true, credit: true } },
        },
        orderBy: [{ date: 'desc' }, { consecutive: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      tenantDb.paymentReceipt.count({ where }),
    ]);

    const isReceivable = type === PaymentReceiptType.RECEIVABLE;

    const data = receipts.map((r) => {
      let income_amount = 0;
      let expense_amount = 0;
      let bank_amount = 0;
      let document_amount = 0;
      let client_prepayment_amount = 0;
      let supplier_prepayment_amount = 0;

      for (const line of r.lines) {
        const amount = Number(line.debit) + Number(line.credit);
        switch (line.kind) {
          case 'DOC':
            document_amount += amount;
            break;
          case 'BANK':
            bank_amount += amount;
            break;
          case 'ACCOUNT':
            if (isReceivable) {
              income_amount += Number(line.debit);
              expense_amount += Number(line.credit);
            } else {
              expense_amount += Number(line.debit);
              income_amount += Number(line.credit);
            }
            break;
          case 'PREP_USED':
            if (isReceivable) {
              client_prepayment_amount += amount;
            } else {
              supplier_prepayment_amount += amount;
            }
            break;
        }
      }

      return {
        id: r.id,
        consecutive: r.consecutive,
        description: r.description,
        third_party_name: r.third_party?.name || null,
        third_party_document: r.third_party?.identification_number || null,
        date: r.date.toISOString().slice(0, 10),
        amount: Number(r.amount),
        income_amount,
        expense_amount,
        bank_amount,
        document_amount,
        client_prepayment_amount,
        supplier_prepayment_amount,
        status: r.status,
        has_journal: !!r.journal_entry_id,
      };
    });

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
