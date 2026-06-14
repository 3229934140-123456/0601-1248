import { create } from 'zustand';
import * as XLSX from 'xlsx';
import type {
  Product,
  Shop,
  Campaign,
  PromotionRule,
  PriceCheckResult,
  DashboardStats,
  DailyTrend,
  ProductRanking,
  BeforeAfterComparison,
  ProductFilters,
  StatusHistoryItem,
  ImportColumnMapping,
  ImportConflict,
  ImportValidationError,
  ProcessingStatus,
  ImportField,
} from '@/types';
import { defaultProductFilters } from '@/types';
import { mockProducts, mockShops } from '@/data/products';
import { mockCampaigns } from '@/data/campaigns';
import {
  mockDashboardStats,
  mockTrendData,
  mockRankingData,
  mockComparisonData,
  generateTrendData,
} from '@/data/dashboard';
import { runPriceCheck as runPriceCheckUtil } from '@/utils/price';
import { validateImportRow } from '@/utils/validation';

const LS_KEYS = {
  PRODUCTS: 'ecom_ops_products',
  CAMPAIGNS: 'ecom_ops_campaigns',
  PRICE_CHECK: 'ecom_ops_price_check',
};

const safeParseLS = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

const safeWriteLS = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
};

const parseExcelFile = async (file: File): Promise<string[][]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as string[][];
        resolve(jsonData);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
};

const generateId = () => `id-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

interface AppState {
  products: Product[];
  shops: Shop[];
  selectedProductIds: string[];
  filters: ProductFilters;
  campaigns: Campaign[];
  currentCampaign: Campaign | null;
  priceCheckResults: PriceCheckResult[];
  dashboardStats: DashboardStats | null;
  dailyTrend: DailyTrend[];
  productRanking: ProductRanking[];
  beforeAfterComparison: BeforeAfterComparison[];
  importConflicts: ImportConflict[];
  importValidationErrors: ImportValidationError[];
  compareCampaignId: string | null;
  compareStats: DashboardStats | null;
  compareTrend: DailyTrend[];
  compareRanking: ProductRanking[];
  compareComparison: BeforeAfterComparison[];

  setProducts: (products: Product[]) => void;
  importProducts: (shopId: string, newProducts: Product[]) => void;
  selectProduct: (id: string) => void;
  deselectProduct: (id: string) => void;
  toggleProductSelection: (id: string) => void;
  selectAllProducts: (ids: string[]) => void;
  clearSelection: () => void;
  setFilters: (filters: Partial<ProductFilters>) => void;
  resetFilters: () => void;
  createCampaign: (data: Partial<Campaign>) => Campaign;
  updateCampaign: (id: string, data: Partial<Campaign>) => void;
  setCurrentCampaign: (campaign: Campaign | null) => void;
  addRuleToCampaign: (campaignId: string, rule: PromotionRule) => void;
  updateRuleInCampaign: (campaignId: string, ruleId: string, rule: Partial<PromotionRule>) => void;
  removeRuleFromCampaign: (campaignId: string, ruleId: string) => void;
  addProductsToCampaign: (campaignId: string, productIds: string[]) => void;
  removeProductFromCampaign: (campaignId: string, productId: string) => void;
  submitCampaignForReview: (campaignId: string) => void;
  reviewCampaign: (campaignId: string, approved: boolean, comment: string) => void;
  revertCampaignToDraft: (campaignId: string) => void;
  runPriceCheck: (productIds: string[], rules: PromotionRule[]) => void;
  clearPriceCheckResults: () => void;
  loadDashboardData: (campaignId?: string, compareCampaignId?: string) => void;
  setImportConflicts: (conflicts: ImportConflict[]) => void;
  setImportValidationErrors: (errors: ImportValidationError[]) => void;
  resolveImportConflict: (sku: string, resolution: 'skip' | 'overwrite') => void;
  resolveAllConflicts: (resolution: 'skip' | 'overwrite') => void;
  processImportFile: (file: File, shopId: string) => Promise<{ columns: ImportColumnMapping[], data: Record<string, string>[], conflicts: ImportConflict[], errors: ImportValidationError[] }>;
  confirmImport: (shopId: string, data: Record<string, string>[], conflicts: ImportConflict[], mapping: ImportColumnMapping[]) => Product[];
  setPriceCheckProcessingStatus: (productId: string, status: ProcessingStatus, note?: string) => void;
  clearProcessingStatus: () => void;
}

export const useStore = create<AppState>((set, get) => ({
  products: safeParseLS<Product[]>(LS_KEYS.PRODUCTS, mockProducts),
  shops: mockShops,
  selectedProductIds: [],
  filters: { ...defaultProductFilters },
  campaigns: safeParseLS<Campaign[]>(LS_KEYS.CAMPAIGNS, mockCampaigns),
  currentCampaign: null,
  priceCheckResults: safeParseLS<PriceCheckResult[]>(LS_KEYS.PRICE_CHECK, []),
  dashboardStats: null,
  dailyTrend: [],
  productRanking: [],
  beforeAfterComparison: [],
  importConflicts: [],
  importValidationErrors: [],
  compareCampaignId: null,
  compareStats: null,
  compareTrend: [],
  compareRanking: [],
  compareComparison: [],

  setProducts: (products) => {
    set({ products });
    safeWriteLS(LS_KEYS.PRODUCTS, products);
  },

  importProducts: (shopId, newProducts) => {
    const shop = mockShops.find((s) => s.id === shopId);
    const shopName = shop?.name || '未知店铺';
    const now = new Date().toISOString();
    const enriched: Product[] = newProducts.map((p) => ({
      id: p.id || `prod-imp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      sku: p.sku || `SKU-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
      name: p.name,
      category: p.category || '其他',
      shopId,
      shopName,
      stock: Number(p.stock) || 0,
      costPrice: Number(p.costPrice) || 0,
      salePrice: Number(p.salePrice) || 0,
      grossMargin:
        Number(p.grossMargin) ||
        (Number(p.salePrice) > 0
          ? Math.round(((Number(p.salePrice) - Number(p.costPrice)) / Number(p.salePrice)) * 100)
          : 0),
      imageUrl:
        p.imageUrl ||
        `https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=${encodeURIComponent(
          p.name || '商品'
        )}&image_size=square`,
      createdAt: p.createdAt || now,
    }));

    const merged = [...enriched, ...get().products];
    set({ products: merged });
    safeWriteLS(LS_KEYS.PRODUCTS, merged);
  },

  selectProduct: (id) =>
    set((state) => ({
      selectedProductIds: state.selectedProductIds.includes(id)
        ? state.selectedProductIds
        : [...state.selectedProductIds, id],
    })),

  deselectProduct: (id) =>
    set((state) => ({
      selectedProductIds: state.selectedProductIds.filter((p) => p !== id),
    })),

  toggleProductSelection: (id) =>
    set((state) => ({
      selectedProductIds: state.selectedProductIds.includes(id)
        ? state.selectedProductIds.filter((p) => p !== id)
        : [...state.selectedProductIds, id],
    })),

  selectAllProducts: (ids) => set({ selectedProductIds: ids }),
  clearSelection: () => set({ selectedProductIds: [] }),

  setFilters: (filters) =>
    set((state) => ({
      filters: { ...state.filters, ...filters },
    })),

  resetFilters: () => set({ filters: { ...defaultProductFilters } }),

  createCampaign: (data) => {
    const now = new Date().toISOString();
    const submissionId = generateId();
    const history: StatusHistoryItem[] = [
      { id: generateId(), status: 'draft', changedAt: now, operator: '运营专员', submissionId },
    ];
    const newCampaign: Campaign = {
      id: data.id || `camp-${Date.now()}`,
      name: data.name || '',
      type: data.type || '会员专享',
      status: 'draft',
      startTime: data.startTime || now,
      endTime:
        data.endTime || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      productIds: data.productIds || [],
      rules: data.rules || [],
      statusHistory: data.statusHistory || history,
      createdAt: now,
      updatedAt: now,
    };
    const merged = [...get().campaigns, newCampaign];
    set({ campaigns: merged, currentCampaign: newCampaign });
    safeWriteLS(LS_KEYS.CAMPAIGNS, merged);
    return newCampaign;
  },

  updateCampaign: (id, data) => {
    const now = new Date().toISOString();
    const updated = get().campaigns.map((c) =>
      c.id === id ? { ...c, ...data, updatedAt: now } : c
    );
    set({
      campaigns: updated,
      currentCampaign:
        get().currentCampaign?.id === id
          ? { ...get().currentCampaign!, ...data, updatedAt: now }
          : get().currentCampaign,
    });
    safeWriteLS(LS_KEYS.CAMPAIGNS, updated);
  },

  setCurrentCampaign: (campaign) => set({ currentCampaign: campaign }),

  addRuleToCampaign: (campaignId, rule) => {
    const now = new Date().toISOString();
    const updated = get().campaigns.map((c) =>
      c.id === campaignId ? { ...c, rules: [...c.rules, rule], updatedAt: now } : c
    );
    set({
      campaigns: updated,
      currentCampaign:
        get().currentCampaign?.id === campaignId
          ? { ...get().currentCampaign!, rules: [...get().currentCampaign!.rules, rule], updatedAt: now }
          : get().currentCampaign,
    });
    safeWriteLS(LS_KEYS.CAMPAIGNS, updated);
  },

  updateRuleInCampaign: (campaignId, ruleId, rule) => {
    const now = new Date().toISOString();
    const updated = get().campaigns.map((c) =>
      c.id === campaignId
        ? {
            ...c,
            rules: c.rules.map((r) => (r.id === ruleId ? { ...r, ...rule } : r)),
            updatedAt: now,
          }
        : c
    );
    set({
      campaigns: updated,
      currentCampaign:
        get().currentCampaign?.id === campaignId
          ? {
              ...get().currentCampaign!,
              rules: get().currentCampaign!.rules.map((r) =>
                r.id === ruleId ? { ...r, ...rule } : r
              ),
              updatedAt: now,
            }
          : get().currentCampaign,
    });
    safeWriteLS(LS_KEYS.CAMPAIGNS, updated);
  },

  removeRuleFromCampaign: (campaignId, ruleId) => {
    const now = new Date().toISOString();
    const updated = get().campaigns.map((c) =>
      c.id === campaignId
        ? { ...c, rules: c.rules.filter((r) => r.id !== ruleId), updatedAt: now }
        : c
    );
    set({
      campaigns: updated,
      currentCampaign:
        get().currentCampaign?.id === campaignId
          ? {
              ...get().currentCampaign!,
              rules: get().currentCampaign!.rules.filter((r) => r.id !== ruleId),
              updatedAt: now,
            }
          : get().currentCampaign,
    });
    safeWriteLS(LS_KEYS.CAMPAIGNS, updated);
  },

  addProductsToCampaign: (campaignId, productIds) => {
    const now = new Date().toISOString();
    const updated = get().campaigns.map((c) =>
      c.id === campaignId
        ? { ...c, productIds: [...new Set([...c.productIds, ...productIds])], updatedAt: now }
        : c
    );
    set({
      campaigns: updated,
      currentCampaign:
        get().currentCampaign?.id === campaignId
          ? {
              ...get().currentCampaign!,
              productIds: [...new Set([...get().currentCampaign!.productIds, ...productIds])],
              updatedAt: now,
            }
          : get().currentCampaign,
    });
    safeWriteLS(LS_KEYS.CAMPAIGNS, updated);
  },

  removeProductFromCampaign: (campaignId, productId) => {
    const now = new Date().toISOString();
    const updated = get().campaigns.map((c) =>
      c.id === campaignId
        ? { ...c, productIds: c.productIds.filter((p) => p !== productId), updatedAt: now }
        : c
    );
    set({
      campaigns: updated,
      currentCampaign:
        get().currentCampaign?.id === campaignId
          ? {
              ...get().currentCampaign!,
              productIds: get().currentCampaign!.productIds.filter((p) => p !== productId),
              updatedAt: now,
            }
          : get().currentCampaign,
    });
    safeWriteLS(LS_KEYS.CAMPAIGNS, updated);
  },

  submitCampaignForReview: (campaignId) => {
    const now = new Date().toISOString();
    const submissionId = generateId();
    const updated = get().campaigns.map((c) => {
      if (c.id !== campaignId) return c;
      const nextHistory: StatusHistoryItem[] = [
        ...c.statusHistory,
        { id: generateId(), status: 'pending', changedAt: now, operator: '运营专员', comment: '提交审核', submissionId },
      ];
      return { ...c, status: 'pending' as const, statusHistory: nextHistory, updatedAt: now };
    });
    set({
      campaigns: updated,
      currentCampaign:
        get().currentCampaign?.id === campaignId
          ? (updated.find((c) => c.id === campaignId) || null)
          : get().currentCampaign,
    });
    safeWriteLS(LS_KEYS.CAMPAIGNS, updated);
  },

  reviewCampaign: (campaignId, approved, comment) => {
    const now = new Date().toISOString();
    const newStatus: 'approved' | 'rejected' = approved ? 'approved' : 'rejected';
    const updated = get().campaigns.map((c) => {
      if (c.id !== campaignId) return c;
      const lastPending = [...c.statusHistory].reverse().find(h => h.status === 'pending');
      const submissionId = lastPending?.submissionId || generateId();
      const nextHistory: StatusHistoryItem[] = [
        ...c.statusHistory,
        { id: generateId(), status: newStatus, changedAt: now, operator: '审核主管', comment, submissionId },
      ];
      return {
        ...c,
        status: newStatus,
        reviewComment: comment,
        statusHistory: nextHistory,
        updatedAt: now,
      };
    });
    set({
      campaigns: updated,
      currentCampaign:
        get().currentCampaign?.id === campaignId
          ? (updated.find((c) => c.id === campaignId) || null)
          : get().currentCampaign,
    });
    safeWriteLS(LS_KEYS.CAMPAIGNS, updated);
  },

  revertCampaignToDraft: (campaignId) => {
    const now = new Date().toISOString();
    const updated = get().campaigns.map((c) => {
      if (c.id !== campaignId) return c;
      const lastRejected = [...c.statusHistory].reverse().find(h => h.status === 'rejected');
      const submissionId = lastRejected?.submissionId || generateId();
      const nextHistory: StatusHistoryItem[] = [
        ...c.statusHistory,
        { id: generateId(), status: 'draft', changedAt: now, operator: '运营专员', comment: '驳回后重新编辑', submissionId },
      ];
      return { ...c, status: 'draft' as const, statusHistory: nextHistory, updatedAt: now };
    });
    set({
      campaigns: updated,
      currentCampaign:
        get().currentCampaign?.id === campaignId
          ? (updated.find((c) => c.id === campaignId) || null)
          : get().currentCampaign,
    });
    safeWriteLS(LS_KEYS.CAMPAIGNS, updated);
  },

  runPriceCheck: (productIds, rules) => {
    const { products } = get();
    const selectedProducts = products.filter((p) => productIds.includes(p.id));
    const results = runPriceCheckUtil(selectedProducts, rules).map(r => ({
      ...r,
      processingStatus: 'pending' as ProcessingStatus,
    }));
    set({ priceCheckResults: results });
    safeWriteLS(LS_KEYS.PRICE_CHECK, results);
  },

  clearPriceCheckResults: () => {
    set({ priceCheckResults: [] });
    safeWriteLS(LS_KEYS.PRICE_CHECK, []);
  },

  loadDashboardData: (campaignId, compareCampaignId) => {
    const generateForCampaign = (cid: string | undefined) => {
      const seed = cid
        ? Array.from(cid).reduce((acc, ch) => acc + ch.charCodeAt(0), 0)
        : 0;
      const rand = (min: number, max: number) => {
        const r = Math.abs(Math.sin(seed || Math.random() * 1000) * 10000) % 1 || Math.random();
        return min + r * (max - min);
      };

      let stats: DashboardStats = { ...mockDashboardStats };
      let trend: DailyTrend[] = mockTrendData;
      let ranking: ProductRanking[] = mockRankingData;
      let comparison: BeforeAfterComparison[] = mockComparisonData;

      if (cid) {
        const campaign = get().campaigns.find((c) => c.id === cid);
        const productCount = campaign?.productIds.length || 5;
        const typeMultiplier =
          campaign?.type === '双11狂欢' || campaign?.type === '618大促'
            ? 1.5
            : campaign?.type === '清仓甩卖'
              ? 1.2
              : campaign?.type === '节日特惠'
                ? 1.3
                : 1;

        const baseRevenue = 250000 + productCount * 25000 * typeMultiplier + seed * 120;
        const baseOrders = Math.round(1500 + productCount * 120 * typeMultiplier + seed * 0.5);
        const conversion = 3.2 + (typeMultiplier - 1) * 5 + (seed % 10) * 0.1;
        const aov = baseRevenue / Math.max(1, baseOrders);
        const visitors = Math.round(baseOrders / (conversion / 100));
        const roi = 2.8 + (typeMultiplier - 1) * 2 + (seed % 5) * 0.15;

        stats = {
          totalRevenue: Math.round(baseRevenue),
          totalOrders: baseOrders,
          conversionRate: conversion / 100,
          totalVisitors: visitors,
          averageOrderValue: aov,
          roi,
          revenueGrowth: 10 + (typeMultiplier - 1) * 30 + rand(-5, 15),
          ordersGrowth: 8 + (typeMultiplier - 1) * 25 + rand(-5, 12),
          conversionGrowth: 5 + (typeMultiplier - 1) * 18 + rand(-3, 8),
          visitorsGrowth: 6 + (typeMultiplier - 1) * 15 + rand(-4, 10),
          aovGrowth: 2 + (typeMultiplier - 1) * 8 + rand(-2, 5),
          roiGrowth: (typeMultiplier - 1) * 25 + rand(-3, 6),
        };

        trend = generateTrendData(14).map((t, idx) => {
          const wave = Math.sin((idx / 3) + seed) * 0.25 + 1;
          return {
            date: t.date,
            revenue: Math.round((t.revenue * typeMultiplier * wave) + seed * 80),
            orders: Math.round(t.orders * typeMultiplier * wave),
            visitors: Math.round(t.visitors * typeMultiplier * wave),
            conversionRate: t.conversionRate * (1 + (typeMultiplier - 1) * 0.5),
          };
        });

        ranking = mockRankingData.map((r, idx) => ({
          ...r,
          revenue: Math.round(r.revenue * (0.7 + rand(0, 1.1)) + seed * 50 * (10 - idx)),
          quantity: Math.round(r.quantity * (0.7 + rand(0, 1.1))),
          profit: Math.round(r.profit * (0.7 + rand(0, 1.1)) + seed * 20 * (10 - idx)),
          conversionRate: 2 + rand(1, 8),
        }));

        comparison = [
          { metric: '成交额', before: Math.round(stats.totalRevenue / (1 + stats.revenueGrowth / 100)), after: stats.totalRevenue },
          { metric: '订单数', before: Math.round(stats.totalOrders / (1 + stats.ordersGrowth / 100)), after: stats.totalOrders },
          { metric: '转化率', before: +((stats.conversionRate * 100) / (1 + stats.conversionGrowth / 100)).toFixed(2), after: +(stats.conversionRate * 100).toFixed(2) },
          { metric: '客单价', before: +(stats.averageOrderValue / (1 + stats.aovGrowth / 100)).toFixed(2), after: +stats.averageOrderValue.toFixed(2) },
          { metric: '访客数', before: Math.round(stats.totalVisitors / (1 + stats.visitorsGrowth / 100)), after: stats.totalVisitors },
        ];
      }

      return { stats, trend, ranking, comparison };
    };

    const mainData = generateForCampaign(campaignId);
    const compareData = compareCampaignId ? generateForCampaign(compareCampaignId) : null;

    set({
      dashboardStats: mainData.stats,
      dailyTrend: mainData.trend,
      productRanking: mainData.ranking,
      beforeAfterComparison: mainData.comparison,
      compareCampaignId: compareCampaignId || null,
      compareStats: compareData?.stats || null,
      compareTrend: compareData?.trend || [],
      compareRanking: compareData?.ranking || [],
      compareComparison: compareData?.comparison || [],
    });
  },

  setImportConflicts: (conflicts) => set({ importConflicts: conflicts }),
  setImportValidationErrors: (errors) => set({ importValidationErrors: errors }),

  resolveImportConflict: (sku, resolution) =>
    set((state) => ({
      importConflicts: state.importConflicts.map((c) =>
        c.sku === sku ? { ...c, resolution } : c
      ),
    })),

  resolveAllConflicts: (resolution) =>
    set((state) => ({
      importConflicts: state.importConflicts.map((c) => ({ ...c, resolution })),
    })),

  processImportFile: async (file, shopId) => {
    const rawData = await parseExcelFile(file);
    if (rawData.length < 2) {
      return { columns: [], data: [], conflicts: [], errors: [] };
    }

    const headerRow = rawData[0];
    const dataRows = rawData.slice(1);

    const autoMapColumn = (columnName: string): ImportField => {
      const name = columnName.toLowerCase();
      if (name.includes('商品') || name.includes('名称') || name.includes('name')) return 'name';
      if (name.includes('sku') || name.includes('编码') || name.includes('code')) return 'sku';
      if (name.includes('分类') || name.includes('category')) return 'category';
      if (name.includes('库存') || name.includes('stock')) return 'stock';
      if (name.includes('成本') || name.includes('cost')) return 'costPrice';
      if (name.includes('售价') || name.includes('价格') || name.includes('price') || name.includes('sale')) return 'salePrice';
      if (name.includes('图片') || name.includes('image')) return 'imageUrl';
      return 'ignore';
    };

    const columns: ImportColumnMapping[] = headerRow.map((name, index) => ({
      columnIndex: index,
      columnName: name,
      targetField: autoMapColumn(name),
    }));

    const data: Record<string, string>[] = dataRows.map((row) => {
      const record: Record<string, string> = {};
      columns.forEach((col) => {
        record[col.targetField] = String(row[col.columnIndex] ?? '');
      });
      return record;
    });

    const allErrors: ImportValidationError[] = [];
    data.forEach((row, index) => {
      const rowErrors = validateImportRow(row, index + 2);
      allErrors.push(...rowErrors);
    });

    const { products } = get();
    const existingSkus = new Map(
      products.filter((p) => p.shopId === shopId).map((p) => [p.sku, p.id])
    );

    const conflicts: ImportConflict[] = [];
    const seenSkus = new Set<string>();
    data.forEach((row) => {
      const sku = row.sku?.trim();
      if (sku && existingSkus.has(sku) && !seenSkus.has(sku)) {
        seenSkus.add(sku);
        conflicts.push({
          sku,
          existingProductId: existingSkus.get(sku)!,
          newProduct: {
            sku: row.sku,
            name: row.name,
            category: row.category,
            stock: row.stock ? Number(row.stock) : undefined,
            costPrice: row.costPrice ? Number(row.costPrice) : undefined,
            salePrice: row.salePrice ? Number(row.salePrice) : undefined,
            imageUrl: row.imageUrl,
          },
          resolution: 'pending',
        });
      }
    });

    set({ importConflicts: conflicts, importValidationErrors: allErrors });
    return { columns, data, conflicts, errors: allErrors };
  },

  confirmImport: (shopId, data, conflicts, mapping) => {
    const shop = mockShops.find((s) => s.id === shopId);
    const shopName = shop?.name || '未知店铺';
    const now = new Date().toISOString();

    const { products } = get();
    const existingProducts = new Map(products.map((p) => [p.id, p]));

    const skippedSkus = new Set(
      conflicts.filter((c) => c.resolution === 'skip').map((c) => c.sku)
    );

    const overwriteMap = new Map(
      conflicts.filter((c) => c.resolution === 'overwrite').map((c) => [c.sku, c.existingProductId])
    );

    const newProducts: Product[] = [];
    const updatedProducts: Product[] = [];

    data.forEach((row) => {
      const sku = row.sku?.trim();
      if (!sku || skippedSkus.has(sku)) return;

      const getValue = (field: ImportField) => row[field] ?? '';

      if (overwriteMap.has(sku)) {
        const existingId = overwriteMap.get(sku)!;
        const existing = existingProducts.get(existingId);
        if (existing) {
          updatedProducts.push({
            ...existing,
            name: getValue('name') || existing.name,
            category: getValue('category') || existing.category,
            stock: getValue('stock') ? Number(getValue('stock')) : existing.stock,
            costPrice: getValue('costPrice') ? Number(getValue('costPrice')) : existing.costPrice,
            salePrice: getValue('salePrice') ? Number(getValue('salePrice')) : existing.salePrice,
            imageUrl: getValue('imageUrl') || existing.imageUrl,
          });
        }
      } else {
        const costPrice = Number(getValue('costPrice')) || 0;
        const salePrice = Number(getValue('salePrice')) || 0;
        newProducts.push({
          id: `prod-imp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          sku: getValue('sku') || `SKU-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
          name: getValue('name'),
          category: getValue('category') || '其他',
          shopId,
          shopName,
          stock: Number(getValue('stock')) || 0,
          costPrice,
          salePrice,
          grossMargin:
            salePrice > 0 ? Math.round(((salePrice - costPrice) / salePrice) * 100) : 0,
          imageUrl:
            getValue('imageUrl') ||
            `https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=${encodeURIComponent(
              getValue('name') || '商品'
            )}&image_size=square`,
          createdAt: now,
        });
      }
    });

    const allProducts = [...products];
    updatedProducts.forEach((up) => {
      const idx = allProducts.findIndex((p) => p.id === up.id);
      if (idx !== -1) allProducts[idx] = up;
    });
    allProducts.unshift(...newProducts);

    set({
      products: allProducts,
      importConflicts: [],
      importValidationErrors: [],
    });
    safeWriteLS(LS_KEYS.PRODUCTS, allProducts);

    return [...newProducts, ...updatedProducts];
  },

  setPriceCheckProcessingStatus: (productId, status, note) => {
    const now = new Date().toISOString();
    const updated = get().priceCheckResults.map((r) =>
      r.productId === productId
        ? { ...r, processingStatus: status, processingNote: note, processedAt: now }
        : r
    );
    set({ priceCheckResults: updated });
    safeWriteLS(LS_KEYS.PRICE_CHECK, updated);
  },

  clearProcessingStatus: () => {
    const updated = get().priceCheckResults.map((r) => ({
      ...r,
      processingStatus: 'pending' as ProcessingStatus,
      processingNote: undefined,
      processedAt: undefined,
    }));
    set({ priceCheckResults: updated });
    safeWriteLS(LS_KEYS.PRICE_CHECK, updated);
  },
}));

export const useFilteredProducts = () => {
  const { products, filters } = useStore();
  return products.filter((p) => {
    if (filters.search && !p.name.toLowerCase().includes(filters.search.toLowerCase())) return false;
    if (filters.shopId && p.shopId !== filters.shopId) return false;
    if (filters.category && p.category !== filters.category) return false;
    if (p.stock < filters.minStock || p.stock > filters.maxStock) return false;
    if (p.grossMargin < filters.minMargin || p.grossMargin > filters.maxMargin) return false;
    return true;
  });
};
