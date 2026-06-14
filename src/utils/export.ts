import * as XLSX from 'xlsx';
import type { Product, Campaign, PriceCheckResult, ProductRanking, DailyTrend, DashboardStats, BeforeAfterComparison } from '@/types';
import { calculateActivityPrice } from './price';
import { formatDate } from './date';

interface ExportOptions {
  filename: string;
  sheetName?: string;
}

const exportToExcel = <T>(data: T[], columns: { key: keyof T; label: string }[], options: ExportOptions) => {
  const worksheetData = data.map(row => 
    columns.reduce((acc, col) => {
      acc[col.label] = row[col.key];
      return acc;
    }, {} as Record<string, unknown>)
  );

  const worksheet = XLSX.utils.json_to_sheet(worksheetData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, options.sheetName || 'Sheet1');
  XLSX.writeFile(workbook, `${options.filename}.xlsx`);
};

export const exportSignUpList = (products: Product[], campaign: Campaign) => {
  const columns = [
    { key: 'sku' as keyof Product, label: '商品SKU' },
    { key: 'name' as keyof Product, label: '商品名称' },
    { key: 'category' as keyof Product, label: '商品分类' },
    { key: 'shopName' as keyof Product, label: '所属店铺' },
    { key: 'salePrice' as keyof Product, label: '原价(元)' },
    { key: 'costPrice' as keyof Product, label: '成本价(元)' },
    { key: 'stock' as keyof Product, label: '库存数量' },
  ];

  const extraColumns = [
    { key: 'activityPrice' as keyof (Product & { activityPrice: number; discount: string }), label: '活动价(元)' },
    { key: 'discount' as keyof (Product & { activityPrice: number; discount: string }), label: '优惠力度' },
  ];

  const dataWithActivityPrice = products.map(p => ({
    ...p,
    activityPrice: calculateActivityPrice(p.salePrice, campaign.rules),
    discount: `${Math.round((1 - calculateActivityPrice(p.salePrice, campaign.rules) / p.salePrice) * 100)}% OFF`,
  }));

  exportToExcel(dataWithActivityPrice, [...columns, ...extraColumns] as any, {
    filename: `活动报名清单_${campaign.name}_${formatDate(new Date())}`,
    sheetName: '报名清单',
  });
};

export const exportPriceCheckReport = (results: PriceCheckResult[], campaignName: string) => {
  const columns = [
    { key: 'productName' as keyof PriceCheckResult, label: '商品名称' },
    { key: 'originalPrice' as keyof PriceCheckResult, label: '原价(元)' },
    { key: 'activityPrice' as keyof PriceCheckResult, label: '活动价(元)' },
    { key: 'costPrice' as keyof PriceCheckResult, label: '成本价(元)' },
    { key: 'finalPriceWithCoupons' as keyof PriceCheckResult, label: '叠加券后价(元)' },
    { key: 'belowCost' as keyof PriceCheckResult, label: '低于成本' },
    { key: 'couponStackRisk' as keyof PriceCheckResult, label: '叠券风险' },
    { key: 'riskLevel' as keyof PriceCheckResult, label: '风险等级' },
  ];

  const formattedResults = results.map(r => ({
    ...r,
    belowCost: r.belowCost ? '是' : '否',
    couponStackRisk: r.couponStackRisk ? '是' : '否',
    riskLevel: r.riskLevel === 'high' ? '高' : r.riskLevel === 'medium' ? '中' : '低',
  }));

  exportToExcel(formattedResults, columns, {
    filename: `价格校验报告_${campaignName}_${formatDate(new Date())}`,
    sheetName: '校验结果',
  });
};

export const exportDashboardReport = (
  stats: DashboardStats,
  trendData: DailyTrend[],
  rankingData: ProductRanking[],
  comparisonData: BeforeAfterComparison[],
  campaignName: string
) => {
  const summaryData = [
    { 指标: '成交总额', 数值: `¥${stats.totalRevenue.toLocaleString()}` },
    { 指标: '订单数量', 数值: stats.totalOrders },
    { 指标: '转化率', 数值: `${(stats.conversionRate * 100).toFixed(2)}%` },
    { 指标: '访客数', 数值: stats.totalVisitors.toLocaleString() },
    { 指标: '客单价', 数值: `¥${stats.averageOrderValue.toFixed(2)}` },
    { 指标: '活动ROI', 数值: `${stats.roi.toFixed(2)}x` },
  ];

  const trendColumns = [
    { key: 'date' as keyof DailyTrend, label: '日期' },
    { key: 'revenue' as keyof DailyTrend, label: '成交额(元)' },
    { key: 'orders' as keyof DailyTrend, label: '订单数' },
    { key: 'visitors' as keyof DailyTrend, label: '访客数' },
    { key: 'conversionRate' as keyof DailyTrend, label: '转化率(%)' },
  ];

  const rankingColumns = [
    { key: 'productName' as keyof ProductRanking, label: '商品名称' },
    { key: 'revenue' as keyof ProductRanking, label: '成交额(元)' },
    { key: 'quantity' as keyof ProductRanking, label: '销量' },
    { key: 'profit' as keyof ProductRanking, label: '毛利(元)' },
    { key: 'conversionRate' as keyof ProductRanking, label: '转化率(%)' },
  ];

  const wb = XLSX.utils.book_new();

  const summaryWs = XLSX.utils.json_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, summaryWs, '核心指标');

  const trendWs = XLSX.utils.json_to_sheet(
    trendData.map(row => 
      trendColumns.reduce((acc, col) => {
        acc[col.label] = row[col.key];
        return acc;
      }, {} as Record<string, unknown>)
    )
  );
  XLSX.utils.book_append_sheet(wb, trendWs, '每日趋势');

  const rankingWs = XLSX.utils.json_to_sheet(
    rankingData.map(row => 
      rankingColumns.reduce((acc, col) => {
        acc[col.label] = row[col.key];
        return acc;
      }, {} as Record<string, unknown>)
    )
  );
  XLSX.utils.book_append_sheet(wb, rankingWs, '商品排行');

  const comparisonWs = XLSX.utils.json_to_sheet(comparisonData);
  XLSX.utils.book_append_sheet(wb, comparisonWs, '活动前后对比');

  XLSX.writeFile(wb, `活动复盘报告_${campaignName}_${formatDate(new Date())}.xlsx`);
};

export const exportToCSV = <T>(data: T[], filename: string) => {
  if (data.length === 0) return;
  
  const headers = Object.keys(data[0]).join(',');
  const rows = data.map(row => 
    Object.values(row).map(v => 
      typeof v === 'string' && v.includes(',') ? `"${v}"` : v
    ).join(',')
  );
  
  const csvContent = [headers, ...rows].join('\n');
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.csv`;
  link.click();
  URL.revokeObjectURL(url);
};
