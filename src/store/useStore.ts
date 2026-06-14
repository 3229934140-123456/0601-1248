import { create } from 'zustand';
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
} from '@/types';
import { defaultProductFilters } from '@/types';
import { mockProducts, mockShops } from '@/data/products';
import { mockCampaigns } from '@/data/campaigns';
import { mockDashboardStats, mockTrendData, mockRankingData, mockComparisonData } from '@/data/dashboard';
import { runPriceCheck } from '@/utils/price';

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

  setProducts: (products: Product[]) => void;
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
  runPriceCheck: (productIds: string[], rules: PromotionRule[]) => void;
  clearPriceCheckResults: () => void;
  loadDashboardData: (campaignId?: string) => void;
}

export const useStore = create<AppState>((set, get) => ({
  products: mockProducts,
  shops: mockShops,
  selectedProductIds: [],
  filters: { ...defaultProductFilters },
  campaigns: mockCampaigns,
  currentCampaign: null,
  priceCheckResults: [],
  dashboardStats: null,
  dailyTrend: [],
  productRanking: [],
  beforeAfterComparison: [],

  setProducts: (products) => set({ products }),

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
    const newCampaign: Campaign = {
      id: `camp-${Date.now()}`,
      name: data.name || '',
      type: data.type || '',
      status: 'draft',
      startTime: data.startTime || new Date().toISOString(),
      endTime: data.endTime || new Date().toISOString(),
      productIds: data.productIds || [],
      rules: data.rules || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    set((state) => ({
      campaigns: [...state.campaigns, newCampaign],
    }));
    return newCampaign;
  },

  updateCampaign: (id, data) =>
    set((state) => ({
      campaigns: state.campaigns.map((c) =>
        c.id === id ? { ...c, ...data, updatedAt: new Date().toISOString() } : c
      ),
      currentCampaign:
        state.currentCampaign?.id === id
          ? { ...state.currentCampaign, ...data, updatedAt: new Date().toISOString() }
          : state.currentCampaign,
    })),

  setCurrentCampaign: (campaign) => set({ currentCampaign: campaign }),

  addRuleToCampaign: (campaignId, rule) =>
    set((state) => ({
      campaigns: state.campaigns.map((c) =>
        c.id === campaignId ? { ...c, rules: [...c.rules, rule] } : c
      ),
      currentCampaign:
        state.currentCampaign?.id === campaignId
          ? { ...state.currentCampaign, rules: [...state.currentCampaign.rules, rule] }
          : state.currentCampaign,
    })),

  updateRuleInCampaign: (campaignId, ruleId, rule) =>
    set((state) => ({
      campaigns: state.campaigns.map((c) =>
        c.id === campaignId
          ? {
              ...c,
              rules: c.rules.map((r) => (r.id === ruleId ? { ...r, ...rule } : r)),
            }
          : c
      ),
      currentCampaign:
        state.currentCampaign?.id === campaignId
          ? {
              ...state.currentCampaign,
              rules: state.currentCampaign.rules.map((r) =>
                r.id === ruleId ? { ...r, ...rule } : r
              ),
            }
          : state.currentCampaign,
    })),

  removeRuleFromCampaign: (campaignId, ruleId) =>
    set((state) => ({
      campaigns: state.campaigns.map((c) =>
        c.id === campaignId
          ? { ...c, rules: c.rules.filter((r) => r.id !== ruleId) }
          : c
      ),
      currentCampaign:
        state.currentCampaign?.id === campaignId
          ? {
              ...state.currentCampaign,
              rules: state.currentCampaign.rules.filter((r) => r.id !== ruleId),
            }
          : state.currentCampaign,
    })),

  addProductsToCampaign: (campaignId, productIds) =>
    set((state) => ({
      campaigns: state.campaigns.map((c) =>
        c.id === campaignId
          ? { ...c, productIds: [...new Set([...c.productIds, ...productIds])] }
          : c
      ),
      currentCampaign:
        state.currentCampaign?.id === campaignId
          ? {
              ...state.currentCampaign,
              productIds: [...new Set([...state.currentCampaign.productIds, ...productIds])],
            }
          : state.currentCampaign,
    })),

  removeProductFromCampaign: (campaignId, productId) =>
    set((state) => ({
      campaigns: state.campaigns.map((c) =>
        c.id === campaignId
          ? { ...c, productIds: c.productIds.filter((p) => p !== productId) }
          : c
      ),
      currentCampaign:
        state.currentCampaign?.id === campaignId
          ? {
              ...state.currentCampaign,
              productIds: state.currentCampaign.productIds.filter((p) => p !== productId),
            }
          : state.currentCampaign,
    })),

  submitCampaignForReview: (campaignId) =>
    set((state) => ({
      campaigns: state.campaigns.map((c) =>
        c.id === campaignId ? { ...c, status: 'pending' } : c
      ),
    })),

  reviewCampaign: (campaignId, approved, comment) =>
    set((state) => ({
      campaigns: state.campaigns.map((c) =>
        c.id === campaignId
          ? {
              ...c,
              status: approved ? 'approved' : 'rejected',
              reviewComment: comment,
            }
          : c
      ),
    })),

  runPriceCheck: (productIds, rules) => {
    const { products } = get();
    const selectedProducts = products.filter((p) => productIds.includes(p.id));
    const results = runPriceCheck(selectedProducts, rules);
    set({ priceCheckResults: results });
  },

  clearPriceCheckResults: () => set({ priceCheckResults: [] }),

  loadDashboardData: () => {
    set({
      dashboardStats: mockDashboardStats,
      dailyTrend: mockTrendData,
      productRanking: mockRankingData,
      beforeAfterComparison: mockComparisonData,
    });
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
