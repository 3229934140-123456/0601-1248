import type { DashboardStats, DailyTrend, ProductRanking, BeforeAfterComparison } from '@/types';

export const mockDashboardStats: DashboardStats = {
  totalRevenue: 568920,
  totalOrders: 3421,
  conversionRate: 0.048,
  totalVisitors: 71270,
  averageOrderValue: 166.3,
  roi: 3.8,
  revenueGrowth: 23.5,
  ordersGrowth: 18.2,
  conversionGrowth: 12.3,
  visitorsGrowth: 8.7,
  aovGrowth: 4.5,
  roiGrowth: 2.1,
};

export const generateTrendData = (days: number = 14): DailyTrend[] => {
  const data: DailyTrend[] = [];
  const today = new Date();
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    
    const baseRevenue = 30000 + Math.random() * 60000;
    const baseOrders = Math.floor(150 + Math.random() * 300);
    const baseVisitors = Math.floor(baseOrders * (15 + Math.random() * 10));
    
    data.push({
      date: date.toISOString().split('T')[0],
      revenue: Math.round(baseRevenue),
      orders: baseOrders,
      visitors: baseVisitors,
      conversionRate: Number(((baseOrders / baseVisitors) * 100).toFixed(2)),
    });
  }
  
  return data;
};

export const mockTrendData = generateTrendData(14);

const productNames = [
  '无线蓝牙耳机 Pro',
  '智能手表 S5',
  '便携充电宝 20000mAh',
  '纯棉T恤 夏季新款',
  '真皮商务钱包',
  '防晒隔离霜 SPF50',
  '保湿精华液 50ml',
  '空气炸锅 5L',
  '运动跑鞋 减震款',
  '不锈钢保温杯',
];

export const mockRankingData: ProductRanking[] = productNames.map((name, index) => ({
  productId: `prod-${index + 1}`,
  productName: name,
  imageUrl: `https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=${encodeURIComponent(name)}&image_size=square`,
  revenue: Math.round(80000 - index * 7000 + Math.random() * 5000),
  quantity: Math.floor(500 - index * 40 + Math.random() * 50),
  profit: Math.round(25000 - index * 2200 + Math.random() * 2000),
  conversionRate: 3 + Math.random() * 6,
}));

export const mockComparisonData: BeforeAfterComparison[] = [
  { metric: '成交额', before: 460500, after: 568920 },
  { metric: '订单数', before: 2894, after: 3421 },
  { metric: '转化率', before: 4.27, after: 4.8 },
  { metric: '客单价', before: 159.1, after: 166.3 },
  { metric: '访客数', before: 67600, after: 71270 },
];
