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
  const wb = XLSX.utils.book_new();

  const total = results.length;
  const safeCount = results.filter(r => r.riskCategories.includes('safe')).length;
  const belowCostCount = results.filter(r => r.riskCategories.includes('below_cost')).length;
  const couponBelowCostCount = results.filter(r => r.riskCategories.includes('coupon_below_cost')).length;
  const lowMarginCount = results.filter(r => r.riskCategories.includes('low_margin')).length;
  const highCount = results.filter(r => r.riskLevel === 'high').length;
  const mediumCount = results.filter(r => r.riskLevel === 'medium').length;
  const lowCount = results.filter(r => r.riskLevel === 'low').length;

  const summaryData = [
    { 指标: '总商品数', 数值: total },
    { 指标: '安全通过数量', 数值: safeCount },
    { 指标: '活动价低于成本数量', 数值: belowCostCount },
    { 指标: '叠券后低于成本数量', 数值: couponBelowCostCount },
    { 指标: '低毛利风险数量', 数值: lowMarginCount },
    { 指标: '高风险数量', 数值: highCount },
    { 指标: '中风险数量', 数值: mediumCount },
    { 指标: '低风险数量', 数值: lowCount },
  ];
  const summaryWs = XLSX.utils.json_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, summaryWs, '总体概览');

  const detailColumns = [
    { key: 'productName' as const, label: '商品名称' },
    { key: 'originalPrice' as const, label: '原价(元)' },
    { key: 'activityPrice' as const, label: '活动价(元)' },
    { key: 'costPrice' as const, label: '成本价(元)' },
    { key: 'activityMargin' as const, label: '活动毛利率%' },
    { key: 'finalPriceWithCoupons' as const, label: '叠券后价' },
    { key: 'finalMargin' as const, label: '叠券毛利率%' },
    { key: 'riskCategoriesText' as const, label: '风险类别' },
    { key: 'riskLevel' as const, label: '风险等级' },
    { key: 'processingStatus' as const, label: '处理状态' },
    { key: 'processingNote' as const, label: '处理备注' },
    { key: 'processedAt' as const, label: '处理时间' },
    { key: 'suggestionsText' as const, label: '建议' },
  ];

  const formatProcessingStatus = (status: string) => {
    switch (status) {
      case 'pending': return '待处理';
      case 'price_adjusted': return '已调价';
      case 'coupon_adjusted': return '已调券';
      case 'both_adjusted': return '已调价调券';
      case 'ignored': return '已忽略';
      default: return '待处理';
    }
  };

  const formatDetailRow = (r: PriceCheckResult) => ({
    productName: r.productName,
    originalPrice: r.originalPrice,
    activityPrice: r.activityPrice,
    costPrice: r.costPrice,
    activityMargin: r.activityMargin.toFixed(2),
    finalPriceWithCoupons: r.finalPriceWithCoupons,
    finalMargin: r.finalMargin.toFixed(2),
    riskCategoriesText: r.riskCategories.map(c => 
      c === 'below_cost' ? '活动价亏本' : 
      c === 'coupon_below_cost' ? '叠券亏本' : 
      c === 'low_margin' ? '低毛利预警' : '安全通过'
    ).join('、'),
    riskLevel: r.riskLevel === 'high' ? '高' : r.riskLevel === 'medium' ? '中' : '低',
    processingStatus: formatProcessingStatus(r.processingStatus || 'pending'),
    processingNote: r.processingNote || '',
    processedAt: r.processedAt || '',
    suggestionsText: r.suggestions.join('；'),
  });

  const belowCostRows = results.filter(r => r.riskCategories.includes('below_cost')).map(formatDetailRow);
  const belowCostWsData = belowCostRows.map(row => 
    detailColumns.reduce((acc, col) => {
      acc[col.label] = (row as any)[col.key];
      return acc;
    }, {} as Record<string, unknown>)
  );
  const belowCostWs = XLSX.utils.json_to_sheet(belowCostWsData);
  XLSX.utils.book_append_sheet(wb, belowCostWs, '活动价低于成本明细');

  const couponBelowCostRows = results.filter(r => r.riskCategories.includes('coupon_below_cost')).map(formatDetailRow);
  const couponBelowCostWsData = couponBelowCostRows.map(row => 
    detailColumns.reduce((acc, col) => {
      acc[col.label] = (row as any)[col.key];
      return acc;
    }, {} as Record<string, unknown>)
  );
  const couponBelowCostWs = XLSX.utils.json_to_sheet(couponBelowCostWsData);
  XLSX.utils.book_append_sheet(wb, couponBelowCostWs, '叠券后低于成本明细');

  const fullColumns = [
    { key: 'productName' as const, label: '商品名称' },
    { key: 'originalPrice' as const, label: '原价(元)' },
    { key: 'activityPrice' as const, label: '活动价(元)' },
    { key: 'costPrice' as const, label: '成本价(元)' },
    { key: 'activityMargin' as const, label: '活动毛利率%' },
    { key: 'finalPriceWithCoupons' as const, label: '叠券后价' },
    { key: 'finalMargin' as const, label: '叠券毛利率%' },
    { key: 'riskCategoriesText' as const, label: '风险类别' },
    { key: 'riskLevel' as const, label: '风险等级' },
    { key: 'processingStatus' as const, label: '处理状态' },
    { key: 'processingNote' as const, label: '处理备注' },
    { key: 'processedAt' as const, label: '处理时间' },
    { key: 'suggestionsText' as const, label: '建议' },
  ];
  const fullRows = results.map(r => ({
    productName: r.productName,
    originalPrice: r.originalPrice,
    activityPrice: r.activityPrice,
    costPrice: r.costPrice,
    activityMargin: r.activityMargin.toFixed(2),
    finalPriceWithCoupons: r.finalPriceWithCoupons,
    finalMargin: r.finalMargin.toFixed(2),
    riskCategoriesText: r.riskCategories.map(c => 
      c === 'below_cost' ? '活动价亏本' : 
      c === 'coupon_below_cost' ? '叠券亏本' : 
      c === 'low_margin' ? '低毛利预警' : '安全通过'
    ).join('、'),
    riskLevel: r.riskLevel === 'high' ? '高' : r.riskLevel === 'medium' ? '中' : '低',
    processingStatus: formatProcessingStatus(r.processingStatus || 'pending'),
    processingNote: r.processingNote || '',
    processedAt: r.processedAt || '',
    suggestionsText: r.suggestions.join('；'),
  }));
  const fullWsData = fullRows.map(row => 
    fullColumns.reduce((acc, col) => {
      acc[col.label] = (row as any)[col.key];
      return acc;
    }, {} as Record<string, unknown>)
  );
  const fullWs = XLSX.utils.json_to_sheet(fullWsData);
  XLSX.utils.book_append_sheet(wb, fullWs, '完整明细');

  XLSX.writeFile(wb, `价格校验报告_${campaignName}_${formatDate(new Date())}.xlsx`);
};

export const exportDashboardReport = (
  stats: DashboardStats,
  trendData: DailyTrend[],
  rankingData: ProductRanking[],
  comparisonData: BeforeAfterComparison[],
  campaignName: string,
  compareStats?: DashboardStats,
  compareRanking?: ProductRanking[],
  compareName?: string
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

  if (compareStats && compareRanking) {
    const nameA = campaignName;
    const nameB = compareName || '对比活动';

    const calcDiff = (a: number, b: number) => {
      if (b === 0) return a > 0 ? '100%' : '0%';
      return `${(((a - b) / b) * 100).toFixed(2)}%`;
    };

    const compareSummaryData = [
      { 指标: '成交额(元)', [nameA]: stats.totalRevenue.toLocaleString(), [nameB]: compareStats.totalRevenue.toLocaleString(), 差异: calcDiff(stats.totalRevenue, compareStats.totalRevenue) },
      { 指标: '订单数', [nameA]: stats.totalOrders.toLocaleString(), [nameB]: compareStats.totalOrders.toLocaleString(), 差异: calcDiff(stats.totalOrders, compareStats.totalOrders) },
      { 指标: '转化率(%)', [nameA]: (stats.conversionRate * 100).toFixed(2), [nameB]: (compareStats.conversionRate * 100).toFixed(2), 差异: calcDiff(stats.conversionRate * 100, compareStats.conversionRate * 100) },
      { 指标: '访客数', [nameA]: stats.totalVisitors.toLocaleString(), [nameB]: compareStats.totalVisitors.toLocaleString(), 差异: calcDiff(stats.totalVisitors, compareStats.totalVisitors) },
      { 指标: '客单价(元)', [nameA]: stats.averageOrderValue.toFixed(2), [nameB]: compareStats.averageOrderValue.toFixed(2), 差异: calcDiff(stats.averageOrderValue, compareStats.averageOrderValue) },
      { 指标: 'ROI', [nameA]: stats.roi.toFixed(2), [nameB]: compareStats.roi.toFixed(2), 差异: calcDiff(stats.roi, compareStats.roi) },
    ];

    const rankingMapA = new Map(rankingData.map(r => [r.productId, r]));
    const rankingMapB = new Map(compareRanking.map(r => [r.productId, r]));
    const intersectIds = [...rankingMapA.keys()].filter(id => rankingMapB.has(id));

    const rankingDiffData = intersectIds.map(id => {
      const rA = rankingMapA.get(id)!;
      const rB = rankingMapB.get(id)!;
      return {
        商品名称: rA.productName,
        [`${nameA}_成交额`]: rA.revenue.toLocaleString(),
        [`${nameB}_成交额`]: rB.revenue.toLocaleString(),
        成交额差异: calcDiff(rA.revenue, rB.revenue),
        [`${nameA}_销量`]: rA.quantity,
        [`${nameB}_销量`]: rB.quantity,
        销量差异: calcDiff(rA.quantity, rB.quantity),
      };
    }).sort((a, b) => {
      const diffA = parseFloat(a.成交额差异);
      const diffB = parseFloat(b.成交额差异);
      return diffB - diffA;
    });

    const compareWsData = [
      ...compareSummaryData,
      {},
      { 指标: '=== 交集商品排行差异 ===', [nameA]: '', [nameB]: '', 差异: '' },
      ...rankingDiffData,
    ];

    const compareWs = XLSX.utils.json_to_sheet(compareWsData);
    XLSX.utils.book_append_sheet(wb, compareWs, '活动对比');
  }

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
