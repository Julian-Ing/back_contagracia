import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { TenantContextService, getNextConsecutive } from '@contagracia/shared-modules';
import Decimal from 'decimal.js';
import { CreateDocumentDto } from './dto';

interface DocumentsQueryParams {
  search?: string;
  docType?: string;
  status?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
}

const SALES_DOC_TYPES = ['INVOICE', 'INVOICE_CREDIT_NOTE', 'INVOICE_DEBIT_NOTE'] as const;
const CHILD_DOC_TYPES = ['INVOICE_CREDIT_NOTE', 'INVOICE_DEBIT_NOTE'] as const;

@Injectable()
export class DocumentsService {
  constructor(private readonly tenantContext: TenantContextService) {}

  private async getTenantDb(companyId: string) {
    const tenantDb = await this.tenantContext.getTenantClient(companyId);
    if (!tenantDb) {
      throw new NotFoundException('Empresa no encontrada o inactiva');
    }
    return tenantDb;
  }

  /* ══════════════════════════════════════════════════════
     CATALOGS
     ══════════════════════════════════════════════════════ */

  async getTypeOperations(companyId: string) {
    const tenantDb = await this.getTenantDb(companyId);
    const records = await tenantDb.typeOperation.findMany({
      where: { is_active: true },
      select: { id: true, code: true, name: true },
      orderBy: { code: 'asc' },
    });
    return records.map((r: any) => ({
      value: r.id,
      label: `${r.code} - ${r.name}`,
      code: r.code,
    }));
  }

  /* ══════════════════════════════════════════════════════
     LIST DOCUMENTS
     ══════════════════════════════════════════════════════ */

  async findAll(companyId: string, params: DocumentsQueryParams = {}) {
    const tenantDb = await this.getTenantDb(companyId);
    const { search, docType, status, fromDate, toDate, page = 1, limit = 50 } = params;

    const allowedTypes = docType ? [docType] : [...SALES_DOC_TYPES];

    // --- Build shared filter conditions ---
    const dateFilter: any = {};
    if (fromDate) dateFilter.gte = new Date(fromDate);
    if (toDate) dateFilter.lte = new Date(toDate);
    const hasDateFilter = Object.keys(dateFilter).length > 0;

    // --- Search: find matching doc IDs and parent IDs of matched children ---
    let searchDocIds: string[] | undefined;
    let searchParentIds: string[] | undefined;

    if (search) {
      // Find third_party IDs matching search by identification_number
      const matchedThirdParties = await tenantDb.thirdParty.findMany({
        where: {
          identification_number: { contains: search, mode: 'insensitive' },
        },
        select: { id: true },
      });
      const tpIds = matchedThirdParties.map((tp) => tp.id);

      // Find all docs matching search (name, consecutive, or third_party identification)
      const searchWhere: any = {
        doc_type: { in: allowedTypes },
        ...(status ? { status } : {}),
        ...(hasDateFilter ? { doc_date: dateFilter } : {}),
        OR: [
          { consecutive: { contains: search, mode: 'insensitive' } },
          { third_party_name: { contains: search, mode: 'insensitive' } },
          ...(tpIds.length > 0 ? [{ third_party_id: { in: tpIds } }] : []),
        ],
      };

      const matchedDocs = await tenantDb.document.findMany({
        where: searchWhere,
        select: { id: true, referenced_doc_id: true },
      });

      searchDocIds = [];
      searchParentIds = [];
      for (const doc of matchedDocs) {
        searchDocIds.push(doc.id);
        if (doc.referenced_doc_id) {
          searchParentIds.push(doc.referenced_doc_id);
        }
      }
    }

    // --- Top-level where: INVOICE + orphan NC/ND ---
    const topLevelConditions: any[] = [
      {
        OR: [
          { doc_type: 'INVOICE' },
          {
            doc_type: { in: [...CHILD_DOC_TYPES] },
            referenced_doc_id: null,
          },
        ],
      },
    ];

    // Apply type filter
    topLevelConditions.push({ doc_type: { in: allowedTypes } });

    if (status) {
      topLevelConditions.push({ status });
    }
    if (hasDateFilter) {
      topLevelConditions.push({ doc_date: dateFilter });
    }

    // Apply search filter: match directly or be parent of matched child
    if (searchDocIds !== undefined) {
      const allMatchIds = [...new Set([...searchDocIds, ...(searchParentIds || [])])];
      if (allMatchIds.length === 0) {
        return { data: [], total: 0, page, limit, totalPages: 0, hasMore: false };
      }
      topLevelConditions.push({ id: { in: allMatchIds } });
    }

    const topLevelWhere = { AND: topLevelConditions };

    // --- Parallel: fetch paginated top-level + count ---
    const [topLevelDocs, total] = await Promise.all([
      tenantDb.document.findMany({
        where: topLevelWhere,
        include: {
          referencing_docs: {
            where: {
              doc_type: { in: [...CHILD_DOC_TYPES] as any },
              ...(status ? { status: status as any } : {}),
            },
            orderBy: { doc_date: 'desc' },
          },
        },
        orderBy: { doc_date: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      tenantDb.document.count({ where: topLevelWhere }),
    ]);

    // --- Batch-fetch ThirdParty for identification_number ---
    const thirdPartyIds = new Set<string>();
    for (const doc of topLevelDocs) {
      if (doc.third_party_id) thirdPartyIds.add(doc.third_party_id);
      for (const child of (doc as any).referencing_docs || []) {
        if (child.third_party_id) thirdPartyIds.add(child.third_party_id);
      }
    }

    const thirdPartyMap = new Map<string, { id: string; name: string | null; identification_number: string | null }>();
    if (thirdPartyIds.size > 0) {
      const thirdParties = await tenantDb.thirdParty.findMany({
        where: { id: { in: Array.from(thirdPartyIds) } },
        select: { id: true, name: true, identification_number: true },
      });
      for (const tp of thirdParties) {
        thirdPartyMap.set(tp.id, tp);
      }
    }

    // --- Map response ---
    const mapDoc = (doc: any) => {
      const tp = doc.third_party_id ? thirdPartyMap.get(doc.third_party_id) : null;
      return {
        id: doc.id,
        doc_type: doc.doc_type,
        consecutive: doc.consecutive,
        doc_date: doc.doc_date,
        due_date: doc.due_date,
        subtotal: Number(doc.subtotal),
        total_taxes: Number(doc.total_taxes),
        total_withholdings: Number(doc.total_withholdings),
        net_amount: Number(doc.net_amount),
        status: doc.status,
        sent_to_api: doc.sent_to_api,
        referenced_doc_id: doc.referenced_doc_id,
        third_party: tp
          ? { id: tp.id, name: tp.name, identification_number: tp.identification_number }
          : doc.third_party_name
            ? { id: doc.third_party_id, name: doc.third_party_name, identification_number: null }
            : null,
      };
    };

    const data = topLevelDocs.map((doc: any) => ({
      ...mapDoc(doc),
      referencing_docs: (doc.referencing_docs || []).map(mapDoc),
    }));

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      total,
      page,
      limit,
      totalPages,
      hasMore: page * limit < total,
    };
  }

  /* ══════════════════════════════════════════════════════
     CREATE DOCUMENT (draft or pending — no accounting)
     ══════════════════════════════════════════════════════ */

  async create(companyId: string, dto: CreateDocumentDto) {
    const tenantDb = await this.getTenantDb(companyId);

    // Validate third party exists
    const thirdParty = await tenantDb.thirdParty.findUnique({
      where: { id: dto.third_party_id },
      select: { id: true, name: true },
    });
    if (!thirdParty) {
      throw new BadRequestException('Tercero no encontrado');
    }

    // Validate items
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('El documento debe tener al menos un ítem');
    }

    const round4 = (v: Decimal) => v.toDecimalPlaces(4, Decimal.ROUND_HALF_UP);

    // Map consecutive type: drafts use 'document_draft', final uses specific type
    const finalConsecutiveMap: Record<string, string> = {
      INVOICE: 'invoice',
      INVOICE_CREDIT_NOTE: 'invoice_credit_note',
      INVOICE_DEBIT_NOTE: 'invoice_debit_note',
    };
    const isDraft = dto.status === 'DRAFT';
    const consecutiveType = isDraft
      ? 'document_draft'
      : finalConsecutiveMap[dto.doc_type];
    if (!consecutiveType) {
      throw new BadRequestException(`Tipo de documento no soportado: ${dto.doc_type}`);
    }

    // Determine payment_type from actual amounts
    const netAmountDec = new Decimal(dto.net_amount || '0');
    const totalPaidDec = (dto.payments || []).reduce(
      (acc: Decimal, p: any) => acc.plus(new Decimal(p.amount || '0')), new Decimal(0),
    );

    let paymentType: string | null = null;
    if (netAmountDec.isZero()) {
      // Zero document → nothing to pay
      paymentType = 'CASH';
    } else if (totalPaidDec.gte(netAmountDec)) {
      // Fully paid or overpaid → cash
      paymentType = 'CASH';
    } else if (dto.credit) {
      // Remaining balance goes to credit
      paymentType = 'CREDIT';
    } else if (totalPaidDec.gt(0)) {
      // Partial payment without credit config (shouldn't pass validation, but safe fallback)
      paymentType = 'CASH';
    }

    // Use transaction for atomicity
    const result = await tenantDb.$transaction(async (tx: any) => {
      const consecutive = await getNextConsecutive(tx, consecutiveType);

      // Create document
      const doc = await tx.document.create({
        data: {
          doc_type: dto.doc_type as any,
          status: dto.status as any,
          third_party_id: dto.third_party_id,
          third_party_name: thirdParty.name,
          consecutive,
          doc_date: new Date(dto.doc_date),
          due_date: dto.credit?.due_date ? new Date(dto.credit.due_date) : null,
          type_operation_id: dto.type_operation_id || null,
          payment_type: paymentType as any,
          payment_method_id: dto.credit?.payment_method_id || null,
          cost_center_id: dto.credit?.cost_center_id || null,
          notes: dto.notes || null,
          purchase_order_consecutive: dto.purchase_order_consecutive || null,
          purchase_order_date: dto.purchase_order_date ? new Date(dto.purchase_order_date) : null,
          subtotal: new Decimal(dto.subtotal || '0'),
          total_discounts: new Decimal(dto.total_discounts || '0'),
          total_taxes: new Decimal(dto.total_taxes || '0'),
          total_withholdings: new Decimal(dto.total_withholdings || '0'),
          net_amount: new Decimal(dto.net_amount || '0'),
          tax_details: dto.tax_details || null,
          withholding_details: dto.withholding_details || null,
        },
      });

      // Create items + item taxes
      for (const item of dto.items) {
        const qty = new Decimal(item.quantity || '0');
        const rawPrice = new Decimal(item.unit_price || '0');
        const rate = new Decimal(item.tax_rate || 0);

        // Lookup per_unit_amount from tax if applicable
        const taxInfo = item.tax_id
          ? await tx.tax.findUnique({ where: { id: item.tax_id }, select: { per_unit_amount: true } })
          : null;
        const perUnitSnapshot = taxInfo?.per_unit_amount ? new Decimal(taxInfo.per_unit_amount) : null;

        // Extract base price if tax_included (only for percentage taxes)
        const unitPrice = (!perUnitSnapshot && item.tax_included && rate.gt(0))
          ? round4(rawPrice.div(rate.div(100).plus(1)))
          : rawPrice;

        const lineSubtotal = round4(qty.times(unitPrice));

        // Discount
        const discInput = new Decimal(item.discount_input || '0');
        let discountAmount: Decimal;
        let discountRate: Decimal;

        if (item.is_discount_rate) {
          discountRate = discInput;
          discountAmount = round4(lineSubtotal.times(discInput).div(100));
        } else {
          discountAmount = Decimal.min(round4(discInput), lineSubtotal);
          discountRate = lineSubtotal.gt(0)
            ? round4(discountAmount.div(lineSubtotal).times(100))
            : new Decimal(0);
        }

        const netAmount = round4(lineSubtotal.minus(discountAmount));

        // Per-unit: tax = qty × per_unit_amount; Percentage: tax = net_amount × rate / 100
        const taxAmount = perUnitSnapshot
          ? round4(qty.times(perUnitSnapshot))
          : round4(netAmount.times(rate).div(100));
        const totalPrice = round4(netAmount.plus(taxAmount));

        const createdItem = await tx.documentItem.create({
          data: {
            document_id: doc.id,
            product_id: item.product_id || null,
            description: item.description || null,
            quantity: qty,
            unit_price: unitPrice,
            total_price: totalPrice,
            is_discount_rate: item.is_discount_rate,
            discount_rate: discountRate,
            discount_value: item.is_discount_rate ? new Decimal(0) : discountAmount,
            discount_rate_value: item.is_discount_rate ? discountAmount : new Decimal(0),
            discount_total_value: discountAmount,
            tax_details: item.tax_id ? { tax_id: item.tax_id, tax_rate: rate.toNumber(), tax_amount: taxAmount.toNumber(), per_unit_amount: perUnitSnapshot ? perUnitSnapshot.toNumber() : null } : null,
            storage_id: item.storage_id || null,
            cost_center_id: item.cost_center_id || null,
          },
        });

        // Create item tax record (including 0% taxes like AIU IVA 0%)
        if (item.tax_id) {
          await tx.documentItemTax.create({
            data: {
              document_item_id: createdItem.id,
              tax_id: item.tax_id,
              tax_rate: rate,
              tax_amount: taxAmount,
              per_unit_amount: perUnitSnapshot,
            },
          });
        }
      }

      // Create payment lines
      if (dto.payments && dto.payments.length > 0) {
        await tx.documentPayment.createMany({
          data: dto.payments.map(p => ({
            document_id: doc.id,
            company_payment_method_id: p.company_payment_method_id,
            bank_account_id: p.bank_account_id || null,
            prepayment_id: p.prepayment_id || null,
            cost_center_id: p.cost_center_id || null,
            amount: new Decimal(p.amount || '0'),
          })),
        });
      }

      // Create withholdings
      if (dto.withholdings && dto.withholdings.length > 0) {
        await tx.documentWithholding.createMany({
          data: dto.withholdings.map(w => ({
            document_id: doc.id,
            withholding_id: w.withholding_id,
            rate: new Decimal(w.rate),
            amount: new Decimal(w.amount || '0'),
            cost_center_id: w.cost_center_id || null,
          })),
        });
      }

      // Create AIU
      if (dto.aiu) {
        await tx.documentAiu.create({
          data: {
            document_id: doc.id,
            administrative_percentage: new Decimal(dto.aiu.administrative_percentage || '0'),
            administrative: new Decimal(dto.aiu.administrative || '0'),
            unexpected_percentage: new Decimal(dto.aiu.unexpected_percentage || '0'),
            unexpected: new Decimal(dto.aiu.unexpected || '0'),
            utility_percentage: new Decimal(dto.aiu.utility_percentage || '0'),
            utility: new Decimal(dto.aiu.utility || '0'),
          },
        });
      }

      return doc;
    });

    return {
      id: result.id,
      consecutive: result.consecutive,
      status: result.status,
    };
  }

  /* ══════════════════════════════════════════════════════
     FIND BY ID — full document with all relations
     ══════════════════════════════════════════════════════ */

  async findById(companyId: string, documentId: string) {
    const tenantDb = await this.getTenantDb(companyId);

    const doc = await tenantDb.document.findUnique({
      where: { id: documentId },
      include: {
        items: {
          include: {
            taxes: {
              include: {
                tax: { select: { id: true, name: true, rate: true } },
              },
            },
            storage: { select: { id: true, name: true, consecutive: true } },
            cost_center: { select: { id: true, name: true } },
          },
          orderBy: { id: 'asc' },
        },
        payments: {
          include: {
            company_payment_method: { select: { id: true, name: true } },
            bank_account: { select: { id: true, account_name: true, account_type: true } },
            prepayment: { select: { id: true, consecutive: true, prepayment_type: true } },
            cost_center: { select: { id: true, name: true } },
          },
          orderBy: { created_at: 'asc' },
        },
        withholdings: {
          include: {
            withholding: { select: { id: true, name: true, rate: true, tax_type_id: true } },
            cost_center: { select: { id: true, name: true } },
          },
          orderBy: { created_at: 'asc' },
        },
        aiu: true,
        type_operation: { select: { id: true, code: true, name: true } },
        payment_method: { select: { id: true, name: true } },
        cost_center: { select: { id: true, name: true } },
      },
    });

    if (!doc) {
      throw new NotFoundException('Documento no encontrado');
    }

    const d = doc as any;

    // Fetch third party details
    let thirdParty: any = null;
    if (d.third_party_id) {
      thirdParty = await tenantDb.thirdParty.findUnique({
        where: { id: d.third_party_id },
        select: { id: true, name: true, identification_number: true, email: true },
      });
    }

    // Fetch product details for items that have product_id
    const productIds = d.items
      .filter((i: any) => i.product_id)
      .map((i: any) => i.product_id);
    const productMap = new Map<string, any>();
    if (productIds.length > 0) {
      const products = await tenantDb.product.findMany({
        where: { id: { in: productIds } },
        select: {
          id: true,
          name: true,
          consecutive: true,
          barcode: true,
          is_service: true,
          parent_product_id: true,
          tax_included: true,
          unit: { select: { name: true } },
        },
      });
      for (const p of products) {
        productMap.set(p.id, p);
      }
    }

    // Map items
    const mappedItems = d.items.map((item: any) => {
      const product = item.product_id ? productMap.get(item.product_id) : null;
      const itemTax = item.taxes?.[0];
      return {
        id: item.id,
        product_id: item.product_id,
        product_name: product?.name || null,
        product_consecutive: product?.consecutive || null,
        product_barcode: product?.barcode || null,
        is_service: product?.is_service ?? false,
        parent_product_id: product?.parent_product_id || null,
        tax_included: product?.tax_included ?? false,
        unit_name: product?.unit?.name || null,
        description: item.description,
        quantity: Number(item.quantity),
        unit_price: Number(item.unit_price),
        total_price: Number(item.total_price),
        is_discount_rate: item.is_discount_rate,
        discount_rate: Number(item.discount_rate),
        discount_value: Number(item.discount_value),
        discount_rate_value: Number(item.discount_rate_value),
        discount_total_value: Number(item.discount_total_value),
        tax_id: itemTax?.tax_id || null,
        tax_name: itemTax?.tax
          ? (itemTax.per_unit_amount ? `${itemTax.tax.name} ($${Number(itemTax.per_unit_amount)}/ud)` : `${itemTax.tax.name} (${itemTax.tax.rate}%)`)
          : null,
        tax_rate: itemTax ? Number(itemTax.tax_rate) : 0,
        tax_per_unit_amount: itemTax?.per_unit_amount ? Number(itemTax.per_unit_amount) : null,
        tax_amount: itemTax ? Number(itemTax.tax_amount) : 0,
        storage_id: item.storage_id,
        storage_name: item.storage ? `${item.storage.consecutive} ${item.storage.name}` : null,
        cost_center_id: item.cost_center_id,
        cost_center_name: item.cost_center?.name || null,
      };
    });

    // Map payments
    const mappedPayments = d.payments.map((p: any) => ({
      id: p.id,
      company_payment_method_id: p.company_payment_method_id,
      company_payment_method_name: p.company_payment_method?.name || null,
      bank_account_id: p.bank_account_id,
      bank_account_name: p.bank_account?.account_name || null,
      bank_account_type: p.bank_account?.account_type || null,
      prepayment_id: p.prepayment_id,
      prepayment_consecutive: p.prepayment?.consecutive || null,
      prepayment_type: p.prepayment?.prepayment_type || null,
      cost_center_id: p.cost_center_id,
      cost_center_name: p.cost_center?.name || null,
      amount: Number(p.amount),
    }));

    // Map withholdings
    const mappedWithholdings = d.withholdings.map((w: any) => ({
      id: w.id,
      withholding_id: w.withholding_id,
      withholding_name: w.withholding?.name || null,
      tax_type_id: w.withholding?.tax_type_id ? Number(w.withholding.tax_type_id) : null,
      rate: Number(w.rate),
      amount: Number(w.amount),
      cost_center_id: w.cost_center_id,
      cost_center_name: w.cost_center?.name || null,
    }));

    return {
      id: d.id,
      doc_type: d.doc_type,
      status: d.status,
      consecutive: d.consecutive,
      doc_date: d.doc_date,
      due_date: d.due_date,
      payment_type: d.payment_type,
      type_operation: d.type_operation
        ? { id: d.type_operation.id, code: d.type_operation.code, name: d.type_operation.name }
        : null,
      notes: d.notes,
      purchase_order_consecutive: d.purchase_order_consecutive,
      purchase_order_date: d.purchase_order_date,
      subtotal: Number(d.subtotal),
      total_discounts: Number(d.total_discounts),
      total_taxes: Number(d.total_taxes),
      total_withholdings: Number(d.total_withholdings),
      net_amount: Number(d.net_amount),
      tax_details: d.tax_details,
      withholding_details: d.withholding_details,
      sent_to_api: d.sent_to_api,
      third_party: thirdParty
        ? { id: thirdParty.id, name: thirdParty.name, identification_number: thirdParty.identification_number, email: thirdParty.email }
        : null,
      // Credit config (from document-level fields)
      credit: d.due_date ? {
        due_date: d.due_date,
        payment_method_id: d.payment_method_id,
        payment_method_name: d.payment_method?.name || null,
        cost_center_id: d.cost_center_id,
        cost_center_name: d.cost_center?.name || null,
      } : null,
      items: mappedItems,
      payments: mappedPayments,
      withholdings: mappedWithholdings,
      aiu: d.aiu ? {
        administrative_percentage: Number(d.aiu.administrative_percentage),
        administrative: Number(d.aiu.administrative),
        unexpected_percentage: Number(d.aiu.unexpected_percentage),
        unexpected: Number(d.aiu.unexpected),
        utility_percentage: Number(d.aiu.utility_percentage),
        utility: Number(d.aiu.utility),
      } : null,
      created_at: d.created_at,
      updated_at: d.updated_at,
    };
  }

  /* ══════════════════════════════════════════════════════
     UPDATE — only drafts can be updated
     ══════════════════════════════════════════════════════ */

  async update(companyId: string, documentId: string, dto: CreateDocumentDto) {
    const tenantDb = await this.getTenantDb(companyId);

    const existing = await tenantDb.document.findUnique({
      where: { id: documentId },
      select: { id: true, status: true, consecutive: true },
    });
    if (!existing) throw new NotFoundException('Documento no encontrado');
    if (existing.status !== 'DRAFT') {
      throw new BadRequestException('Solo se pueden editar documentos en estado Borrador');
    }

    const thirdParty = await tenantDb.thirdParty.findUnique({
      where: { id: dto.third_party_id },
      select: { id: true, name: true },
    });
    if (!thirdParty) throw new BadRequestException('Tercero no encontrado');

    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('El documento debe tener al menos un ítem');
    }

    const round4 = (v: Decimal) => v.toDecimalPlaces(4, Decimal.ROUND_HALF_UP);

    // If status changes from DRAFT to non-DRAFT, promote consecutive
    const wasDraft = true; // we already checked
    const isNowFinal = dto.status !== 'DRAFT';

    // Determine payment_type
    const netAmountDec = new Decimal(dto.net_amount || '0');
    const totalPaidDec = (dto.payments || []).reduce(
      (acc: Decimal, p: any) => acc.plus(new Decimal(p.amount || '0')), new Decimal(0),
    );
    let paymentType: string | null = null;
    if (netAmountDec.isZero()) {
      paymentType = 'CASH';
    } else if (totalPaidDec.gte(netAmountDec)) {
      paymentType = 'CASH';
    } else if (dto.credit) {
      paymentType = 'CREDIT';
    } else if (totalPaidDec.gt(0)) {
      paymentType = 'CASH';
    }

    const result = await tenantDb.$transaction(async (tx: any) => {
      // If promoting from draft to final, get a new final consecutive
      let newConsecutive = existing.consecutive;
      if (isNowFinal) {
        const finalConsecutiveMap: Record<string, string> = {
          INVOICE: 'invoice',
          INVOICE_CREDIT_NOTE: 'invoice_credit_note',
          INVOICE_DEBIT_NOTE: 'invoice_debit_note',
        };
        const finalType = finalConsecutiveMap[dto.doc_type];
        if (!finalType) throw new BadRequestException(`Tipo no soportado: ${dto.doc_type}`);
        newConsecutive = await getNextConsecutive(tx, finalType);
      }

      // Delete old relations
      await tx.documentItemTax.deleteMany({
        where: { document_item: { document_id: documentId } },
      });
      await tx.documentItem.deleteMany({ where: { document_id: documentId } });
      await tx.documentPayment.deleteMany({ where: { document_id: documentId } });
      await tx.documentWithholding.deleteMany({ where: { document_id: documentId } });
      await tx.documentAiu.deleteMany({ where: { document_id: documentId } });

      // Update document
      const doc = await tx.document.update({
        where: { id: documentId },
        data: {
          status: dto.status as any,
          third_party_id: dto.third_party_id,
          third_party_name: thirdParty.name,
          consecutive: newConsecutive,
          doc_date: new Date(dto.doc_date),
          due_date: dto.credit?.due_date ? new Date(dto.credit.due_date) : null,
          type_operation_id: dto.type_operation_id || null,
          payment_type: paymentType as any,
          payment_method_id: dto.credit?.payment_method_id || null,
          cost_center_id: dto.credit?.cost_center_id || null,
          notes: dto.notes || null,
          purchase_order_consecutive: dto.purchase_order_consecutive || null,
          purchase_order_date: dto.purchase_order_date ? new Date(dto.purchase_order_date) : null,
          subtotal: new Decimal(dto.subtotal || '0'),
          total_discounts: new Decimal(dto.total_discounts || '0'),
          total_taxes: new Decimal(dto.total_taxes || '0'),
          total_withholdings: new Decimal(dto.total_withholdings || '0'),
          net_amount: new Decimal(dto.net_amount || '0'),
          tax_details: dto.tax_details || null,
          withholding_details: dto.withholding_details || null,
        },
      });

      // Recreate items + item taxes (same logic as create)
      for (const item of dto.items) {
        const qty = new Decimal(item.quantity || '0');
        const rawPrice = new Decimal(item.unit_price || '0');
        const rate = new Decimal(item.tax_rate || 0);

        // Lookup per_unit_amount from tax if applicable
        const taxInfo = item.tax_id
          ? await tx.tax.findUnique({ where: { id: item.tax_id }, select: { per_unit_amount: true } })
          : null;
        const perUnitSnapshot = taxInfo?.per_unit_amount ? new Decimal(taxInfo.per_unit_amount) : null;

        const unitPrice = (!perUnitSnapshot && item.tax_included && rate.gt(0))
          ? round4(rawPrice.div(rate.div(100).plus(1)))
          : rawPrice;
        const lineSubtotal = round4(qty.times(unitPrice));
        const discInput = new Decimal(item.discount_input || '0');
        let discountAmount: Decimal;
        let discountRate: Decimal;
        if (item.is_discount_rate) {
          discountRate = discInput;
          discountAmount = round4(lineSubtotal.times(discInput).div(100));
        } else {
          discountAmount = Decimal.min(round4(discInput), lineSubtotal);
          discountRate = lineSubtotal.gt(0)
            ? round4(discountAmount.div(lineSubtotal).times(100))
            : new Decimal(0);
        }
        const netAmount = round4(lineSubtotal.minus(discountAmount));

        // Per-unit: tax = qty × per_unit_amount; Percentage: tax = net_amount × rate / 100
        const taxAmount = perUnitSnapshot
          ? round4(qty.times(perUnitSnapshot))
          : round4(netAmount.times(rate).div(100));
        const totalPrice = round4(netAmount.plus(taxAmount));

        const createdItem = await tx.documentItem.create({
          data: {
            document_id: doc.id,
            product_id: item.product_id || null,
            description: item.description || null,
            quantity: qty,
            unit_price: unitPrice,
            total_price: totalPrice,
            is_discount_rate: item.is_discount_rate,
            discount_rate: discountRate,
            discount_value: item.is_discount_rate ? new Decimal(0) : discountAmount,
            discount_rate_value: item.is_discount_rate ? discountAmount : new Decimal(0),
            discount_total_value: discountAmount,
            tax_details: item.tax_id ? { tax_id: item.tax_id, tax_rate: rate.toNumber(), tax_amount: taxAmount.toNumber(), per_unit_amount: perUnitSnapshot ? perUnitSnapshot.toNumber() : null } : null,
            storage_id: item.storage_id || null,
            cost_center_id: item.cost_center_id || null,
          },
        });
        if (item.tax_id) {
          await tx.documentItemTax.create({
            data: {
              document_item_id: createdItem.id,
              tax_id: item.tax_id,
              tax_rate: rate,
              tax_amount: taxAmount,
              per_unit_amount: perUnitSnapshot,
            },
          });
        }
      }

      // Recreate payments
      if (dto.payments && dto.payments.length > 0) {
        await tx.documentPayment.createMany({
          data: dto.payments.map(p => ({
            document_id: doc.id,
            company_payment_method_id: p.company_payment_method_id,
            bank_account_id: p.bank_account_id || null,
            prepayment_id: p.prepayment_id || null,
            cost_center_id: p.cost_center_id || null,
            amount: new Decimal(p.amount || '0'),
          })),
        });
      }

      // Recreate withholdings
      if (dto.withholdings && dto.withholdings.length > 0) {
        await tx.documentWithholding.createMany({
          data: dto.withholdings.map(w => ({
            document_id: doc.id,
            withholding_id: w.withholding_id,
            rate: new Decimal(w.rate),
            amount: new Decimal(w.amount || '0'),
            cost_center_id: w.cost_center_id || null,
          })),
        });
      }

      // Recreate AIU
      if (dto.aiu) {
        await tx.documentAiu.create({
          data: {
            document_id: doc.id,
            administrative_percentage: new Decimal(dto.aiu.administrative_percentage || '0'),
            administrative: new Decimal(dto.aiu.administrative || '0'),
            unexpected_percentage: new Decimal(dto.aiu.unexpected_percentage || '0'),
            unexpected: new Decimal(dto.aiu.unexpected || '0'),
            utility_percentage: new Decimal(dto.aiu.utility_percentage || '0'),
            utility: new Decimal(dto.aiu.utility || '0'),
          },
        });
      }

      return doc;
    });

    return {
      id: result.id,
      consecutive: result.consecutive,
      status: result.status,
    };
  }

  /* ══════════════════════════════════════════════════════
     DELETE DRAFT — hard delete + release consecutive
     ══════════════════════════════════════════════════════ */

  async deleteDraft(companyId: string, documentId: string) {
    const tenantDb = await this.getTenantDb(companyId);

    const doc = await tenantDb.document.findUnique({
      where: { id: documentId },
      select: { id: true, status: true, consecutive: true },
    });
    if (!doc) throw new NotFoundException('Documento no encontrado');
    if (doc.status !== 'DRAFT') {
      throw new BadRequestException('Solo se pueden eliminar documentos en estado Borrador');
    }

    await tenantDb.$transaction(async (tx: any) => {
      // Delete relations (cascade should handle most, but be explicit)
      await tx.documentItemTax.deleteMany({
        where: { document_item: { document_id: documentId } },
      });
      await tx.documentItem.deleteMany({ where: { document_id: documentId } });
      await tx.documentPayment.deleteMany({ where: { document_id: documentId } });
      await tx.documentWithholding.deleteMany({ where: { document_id: documentId } });
      await tx.documentAiu.deleteMany({ where: { document_id: documentId } });

      // Delete document
      await tx.document.delete({ where: { id: documentId } });
    });

    return { deleted: true, id: documentId };
  }
}
