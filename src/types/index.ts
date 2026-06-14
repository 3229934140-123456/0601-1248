export type ImportField = 'name' | 'sku' | 'category' | 'stock' | 'costPrice' | 'salePrice' | 'imageUrl' | 'ignore';

export interface ImportColumnMapping {
  columnIndex: number;
  columnName: string;
  targetField: ImportField;
}

export interface ImportConflict {
  sku: string;
  existingProductId: string;
  newProduct: Partial<Product>;
  resolution: 'skip' | 'overwrite' | 'pending';
}

export interface ImportValidationError {
  row: number;
  field: string;
  message: string;
  value: string;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  shopId: string;
  shopName: string;
  stock: number;
  costPrice: number;
  salePrice: number;
  grossMargin: number;
  imageUrl: string;
  createdAt: string;
}

export interface Shop {
  id: string;
  name: string;
  platform: 'taobao' | 'jd' | 'pdd' | 'douyin';
  status: 'active' | 'inactive';
}

export interface PromotionRule {
  id: string;
  type: 'discount' | 'fullReduce' | 'gift';
  condition: {
    minAmount?: number;
    minQuantity?: number;
  };
  benefit: {
    discountRate?: number;
    reduceAmount?: number;
    giftProductId?: string;
    giftQuantity?: number;
  };
}

export interface StatusHistoryItem {
  id: string;
  status: Campaign['status'];
  changedAt: string;
  comment?: string;
  operator?: string;
  submissionId?: string;
}

export interface Campaign {
  id: string;
  name: string;
  type: string;
  status: 'draft' | 'pending' | 'approved' | 'rejected' | 'active' | 'ended';
  startTime: string;
  endTime: string;
  productIds: string[];
  rules: PromotionRule[];
  reviewComment?: string;
  statusHistory: StatusHistoryItem[];
  createdAt: string;
  updatedAt: string;
}

export type RiskCategory = 'below_cost' | 'coupon_below_cost' | 'low_margin' | 'safe';

export type ProcessingStatus = 'pending' | 'price_adjusted' | 'coupon_adjusted' | 'both_adjusted' | 'ignored';

export interface PriceCheckResult {
  productId: string;
  productName: string;
  originalPrice: number;
  activityPrice: number;
  costPrice: number;
  belowCost: boolean;
  couponStackRisk: boolean;
  finalPriceWithCoupons: number;
  activityMargin: number;
  finalMargin: number;
  riskCategories: RiskCategory[];
  riskLevel: 'high' | 'medium' | 'low';
  suggestions: string[];
  processingStatus: ProcessingStatus;
  processingNote?: string;
  processedAt?: string;
}

export interface DashboardStats {
  totalRevenue: number;
  totalOrders: number;
  conversionRate: number;
  totalVisitors: number;
  averageOrderValue: number;
  roi: number;
  revenueGrowth: number;
  ordersGrowth: number;
  conversionGrowth: number;
  visitorsGrowth: number;
  aovGrowth: number;
  roiGrowth: number;
}

export interface DailyTrend {
  date: string;
  revenue: number;
  orders: number;
  visitors: number;
  conversionRate: number;
}

export interface ProductRanking {
  productId: string;
  productName: string;
  imageUrl: string;
  revenue: number;
  quantity: number;
  profit: number;
  conversionRate: number;
}

export interface BeforeAfterComparison {
  metric: string;
  before: number;
  after: number;
}

export interface ProductFilters {
  search: string;
  shopId: string;
  category: string;
  minStock: number;
  maxStock: number;
  minMargin: number;
  maxMargin: number;
}

export const defaultProductFilters: ProductFilters = {
  search: '',
  shopId: '',
  category: '',
  minStock: 0,
  maxStock: 99999,
  minMargin: 0,
  maxMargin: 100,
};
