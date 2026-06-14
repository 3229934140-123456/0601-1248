import { useState, useEffect, useMemo } from 'react';
import {
  BarChart3, TrendingUp, TrendingDown, DollarSign, ShoppingCart,
  Users, Package, Download, RefreshCw, Calendar, ArrowUpRight,
  ArrowDownRight, BarChart2, PieChart, Activity, Target
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Legend,
  AreaChart, Area, PieChart as RechartsPieChart, Pie, Cell
} from 'recharts';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Table } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { useStore } from '@/store/useStore';
import { formatCurrency, formatPercent } from '@/utils/price';
import { formatDate } from '@/utils/date';
import { exportDashboardReport } from '@/utils/export';
import { cn } from '@/utils/cn';

const COLORS = ['#1e3a5f', '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7'];

const getTrendIcon = (value: number) => {
  if (value > 0) return <ArrowUpRight className="w-4 h-4 text-emerald-500" />;
  if (value < 0) return <ArrowDownRight className="w-4 h-4 text-red-500" />;
  return <Activity className="w-4 h-4 text-slate-400" />;
};

const getTrendColor = (value: number) => {
  if (value > 0) return 'text-emerald-600';
  if (value < 0) return 'text-red-600';
  return 'text-slate-600';
};

export const DashboardPage = () => {
  const { 
    dashboardStats, dailyTrend, productRanking, beforeAfterComparison,
    campaigns, loadDashboardData 
  } = useStore();
  
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('');
  const [dateRange, setDateRange] = useState<string>('14d');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (campaigns.length > 0 && !selectedCampaignId) {
      const activeCampaign = campaigns.find(c => c.status === 'active' || c.status === 'ended');
      setSelectedCampaignId(activeCampaign?.id || campaigns[0].id);
    }
  }, [campaigns, selectedCampaignId]);

  useEffect(() => {
    if (selectedCampaignId) {
      handleLoadData();
    }
  }, [selectedCampaignId, dateRange]);

  const selectedCampaign = useMemo(() => {
    return campaigns.find(c => c.id === selectedCampaignId) || null;
  }, [campaigns, selectedCampaignId]);

  const handleLoadData = async () => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    loadDashboardData(selectedCampaignId);
    setIsLoading(false);
  };

  const handleExport = () => {
    if (!selectedCampaign || !dashboardStats) return;
    exportDashboardReport(
      dashboardStats,
      dailyTrend,
      productRanking,
      beforeAfterComparison,
      selectedCampaign.name
    );
  };

  const statCards = useMemo(() => {
    if (!dashboardStats) return [];
    
    return [
      {
        title: '总成交额',
        value: formatCurrency(dashboardStats.totalRevenue),
        trend: dashboardStats.revenueGrowth,
        trendLabel: '环比',
        icon: DollarSign,
        color: 'from-blue-500 to-indigo-600',
        bg: 'bg-blue-50',
      },
      {
        title: '订单数',
        value: dashboardStats.totalOrders.toLocaleString(),
        trend: dashboardStats.ordersGrowth,
        trendLabel: '环比',
        icon: ShoppingCart,
        color: 'from-emerald-500 to-teal-600',
        bg: 'bg-emerald-50',
      },
      {
        title: '转化率',
        value: formatPercent(dashboardStats.conversionRate),
        trend: dashboardStats.conversionGrowth,
        trendLabel: '环比',
        icon: Target,
        color: 'from-violet-500 to-purple-600',
        bg: 'bg-violet-50',
      },
      {
        title: '访客数',
        value: dashboardStats.totalVisitors.toLocaleString(),
        trend: dashboardStats.visitorsGrowth,
        trendLabel: '环比',
        icon: Users,
        color: 'from-amber-500 to-orange-600',
        bg: 'bg-amber-50',
      },
      {
        title: '客单价',
        value: formatCurrency(dashboardStats.averageOrderValue),
        trend: dashboardStats.aovGrowth,
        trendLabel: '环比',
        icon: Package,
        color: 'from-rose-500 to-pink-600',
        bg: 'bg-rose-50',
      },
      {
        title: '活动ROI',
        value: dashboardStats.roi.toFixed(2) + 'x',
        trend: dashboardStats.roiGrowth,
        trendLabel: '目标',
        icon: TrendingUp,
        color: 'from-cyan-500 to-sky-600',
        bg: 'bg-cyan-50',
      },
    ];
  }, [dashboardStats]);

  const customTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-slate-200">
          <p className="text-sm font-medium text-slate-700 mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              <span className="font-medium">{entry.name}:</span> {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <BarChart3 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">效果看板</h1>
            <p className="text-sm text-slate-500">实时追踪活动数据，分析活动效果</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="secondary" 
            onClick={handleExport} 
            className="gap-2"
            disabled={!dashboardStats || isLoading}
          >
            <Download className="w-4 h-4" />
            导出复盘报告
          </Button>
          <Button 
            onClick={handleLoadData} 
            className="gap-2"
            loading={isLoading}
          >
            <RefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin')} />
            刷新数据
          </Button>
        </div>
      </div>

      <Card>
        <Card.Body className="flex flex-wrap items-center gap-6">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              选择活动
            </label>
            <Select
              value={selectedCampaignId}
              onChange={(e) => setSelectedCampaignId(e.target.value)}
              options={[
                { value: '', label: '请选择活动' },
                ...campaigns
                  .filter(c => c.status === 'active' || c.status === 'ended')
                  .map(c => ({ value: c.id, label: c.name || '未命名活动' }))
              ]}
            />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              时间范围
            </label>
            <Select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              options={[
                { value: '7d', label: '最近7天' },
                { value: '14d', label: '最近14天' },
                { value: '30d', label: '最近30天' },
                { value: '90d', label: '最近90天' },
              ]}
            />
          </div>
          <div className="flex-1 min-w-[200px]">
            <p className="text-sm text-slate-500 mb-2">活动时间</p>
            <div className="flex items-center gap-2 text-slate-700">
              <Calendar className="w-4 h-4 text-slate-400" />
              <span className="text-sm font-medium">
                {selectedCampaign 
                  ? `${formatDate(selectedCampaign.startTime)} ~ ${formatDate(selectedCampaign.endTime)}`
                  : '-'
                }
              </span>
            </div>
          </div>
          <div className="flex-1 min-w-[200px]">
            <p className="text-sm text-slate-500 mb-2">活动状态</p>
            {selectedCampaign && (
              <Badge 
                variant={selectedCampaign.status === 'active' ? 'success' : 'default'}
                pulse={selectedCampaign.status === 'active'}
              >
                {selectedCampaign.status === 'active' && '进行中'}
                {selectedCampaign.status === 'ended' && '已结束'}
                {selectedCampaign.status === 'approved' && '已通过'}
              </Badge>
            )}
          </div>
        </Card.Body>
      </Card>

      {isLoading && (
        <Card className="text-center py-16">
          <RefreshCw className="w-12 h-12 mx-auto mb-4 text-blue-500 animate-spin" />
          <p className="text-slate-500">正在加载数据...</p>
        </Card>
      )}

      {!isLoading && dashboardStats && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            {statCards.map((card, index) => {
              const Icon = card.icon;
              return (
                <Card 
                  key={card.title} 
                  className="overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 animate-in fade-in"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <Card.Body className="p-5">
                    <div className="flex items-start justify-between mb-4">
                      <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', card.bg)}>
                        <Icon className={cn('w-5 h-5 bg-gradient-to-br', card.color, 'bg-clip-text text-transparent')} />
                      </div>
                      <div className="flex items-center gap-1">
                        {getTrendIcon(card.trend)}
                        <span className={cn('text-sm font-medium', getTrendColor(card.trend))}>
                          {card.trend > 0 ? '+' : ''}{card.trend.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-slate-500 mb-1">{card.title}</p>
                    <p className="text-2xl font-bold text-slate-800">{card.value}</p>
                    <p className="text-xs text-slate-400 mt-1">{card.trendLabel}变化</p>
                  </Card.Body>
                </Card>
              );
            })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <Card.Header>
                <Card.Title className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-blue-500" />
                  销售趋势
                </Card.Title>
                <div className="flex items-center gap-4 text-sm text-slate-500">
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-full bg-blue-500" />
                    成交额
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-full bg-emerald-500" />
                    订单数
                  </span>
                </div>
              </Card.Header>
              <Card.Body>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={dailyTrend}>
                      <defs>
                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis 
                        dataKey="date" 
                        tick={{ fontSize: 12, fill: '#64748b' }}
                        axisLine={{ stroke: '#e2e8f0' }}
                      />
                      <YAxis 
                        yAxisId="left"
                        tick={{ fontSize: 12, fill: '#64748b' }}
                        axisLine={{ stroke: '#e2e8f0' }}
                        tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                      />
                      <YAxis 
                        yAxisId="right"
                        orientation="right"
                        tick={{ fontSize: 12, fill: '#64748b' }}
                        axisLine={{ stroke: '#e2e8f0' }}
                      />
                      <Tooltip content={customTooltip} />
                      <Area
                        yAxisId="left"
                        type="monotone"
                        dataKey="revenue"
                        name="成交额"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        fill="url(#colorRevenue)"
                        animationDuration={1500}
                      />
                      <Area
                        yAxisId="right"
                        type="monotone"
                        dataKey="orders"
                        name="订单数"
                        stroke="#10b981"
                        strokeWidth={2}
                        fill="url(#colorOrders)"
                        animationDuration={1500}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </Card.Body>
            </Card>

            <Card>
              <Card.Header>
                <Card.Title className="flex items-center gap-2">
                  <BarChart2 className="w-5 h-5 text-violet-500" />
                  活动前后对比
                </Card.Title>
              </Card.Header>
              <Card.Body>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={beforeAfterComparison} barCategoryGap="30%">
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis 
                        dataKey="metric" 
                        tick={{ fontSize: 12, fill: '#64748b' }}
                        axisLine={{ stroke: '#e2e8f0' }}
                      />
                      <YAxis 
                        tick={{ fontSize: 12, fill: '#64748b' }}
                        axisLine={{ stroke: '#e2e8f0' }}
                      />
                      <Tooltip content={customTooltip} />
                      <Legend 
                        wrapperStyle={{ paddingTop: '20px' }}
                        iconType="rect"
                      />
                      <Bar 
                        dataKey="before" 
                        name="活动前" 
                        fill="#94a3b8" 
                        radius={[4, 4, 0, 0]}
                        animationDuration={1000}
                      />
                      <Bar 
                        dataKey="after" 
                        name="活动后" 
                        fill="#1e3a5f" 
                        radius={[4, 4, 0, 0]}
                        animationDuration={1000}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card.Body>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <Card.Header>
                <Card.Title className="flex items-center gap-2">
                  <Package className="w-5 h-5 text-amber-500" />
                  商品销售排行
                </Card.Title>
                <span className="text-sm text-slate-500">Top 10 热销商品</span>
              </Card.Header>
              <Card.Body className="p-0">
                <Table>
                  <Table.Header>
                    <tr>
                      <th className="px-4 py-3 w-12">排名</th>
                      <th className="px-4 py-3">商品名称</th>
                      <th className="px-4 py-3 text-right">销量</th>
                      <th className="px-4 py-3 text-right">销售额</th>
                      <th className="px-4 py-3 text-right">转化率</th>
                      <th className="px-4 py-3 text-right">毛利</th>
                    </tr>
                  </Table.Header>
                  <Table.Body>
                    {productRanking.slice(0, 10).map((product, index) => (
                      <Table.Row key={product.productId} className="animate-in fade-in" style={{ animationDelay: `${index * 30}ms` }}>
                        <Table.Cell>
                          <div className={cn(
                            'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold',
                            index === 0 && 'bg-amber-100 text-amber-700',
                            index === 1 && 'bg-slate-100 text-slate-600',
                            index === 2 && 'bg-orange-100 text-orange-700',
                            index > 2 && 'bg-slate-50 text-slate-500'
                          )}>
                            {index + 1}
                          </div>
                        </Table.Cell>
                        <Table.Cell>
                          <div className="flex items-center gap-3">
                            <img
                              src={product.imageUrl}
                              alt={product.productName}
                              className="w-10 h-10 rounded-lg object-cover bg-slate-100"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="%23cbd5e1" stroke-width="2"%3E%3Crect x="3" y="3" width="18" height="18" rx="2" ry="2"%3E%3C/rect%3E%3Ccircle cx="8.5" cy="8.5" r="1.5"%3E%3C/circle%3E%3Cpolyline points="21 15 16 10 5 21"%3E%3C/polyline%3E%3C/svg%3E';
                              }}
                            />
                            <span className="font-medium text-slate-800">{product.productName}</span>
                          </div>
                        </Table.Cell>
                        <Table.Cell className="text-right font-medium text-slate-800">
                          {product.quantity.toLocaleString()}
                        </Table.Cell>
                        <Table.Cell className="text-right font-medium text-blue-600">
                          {formatCurrency(product.revenue)}
                        </Table.Cell>
                        <Table.Cell className="text-right">
                          <span className={cn(
                            'font-medium',
                            product.conversionRate >= 5 ? 'text-emerald-600' :
                            product.conversionRate >= 3 ? 'text-amber-600' : 'text-red-600'
                          )}>
                            {formatPercent(product.conversionRate)}
                          </span>
                        </Table.Cell>
                        <Table.Cell className="text-right font-medium text-emerald-600">
                          {formatCurrency(product.profit)}
                        </Table.Cell>
                      </Table.Row>
                    ))}
                  </Table.Body>
                </Table>
              </Card.Body>
            </Card>

            <div className="space-y-6">
              <Card>
                <Card.Header>
                  <Card.Title className="flex items-center gap-2">
                    <PieChart className="w-5 h-5 text-purple-500" />
                    流量来源分布
                  </Card.Title>
                </Card.Header>
                <Card.Body>
                  <div className="h-60">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPieChart>
                        <Pie
                          data={[
                            { name: '自然搜索', value: 35 },
                            { name: '付费推广', value: 28 },
                            { name: '活动会场', value: 20 },
                            { name: '私域流量', value: 12 },
                            { name: '其他', value: 5 },
                          ]}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          paddingAngle={3}
                          dataKey="value"
                          animationDuration={1000}
                        >
                          {COLORS.map((color, index) => (
                            <Cell key={`cell-${index}`} fill={color} />
                          ))}
                        </Pie>
                        <Tooltip content={customTooltip} />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-2 mt-4">
                    {[
                      { name: '自然搜索', value: 35, color: COLORS[0] },
                      { name: '付费推广', value: 28, color: COLORS[1] },
                      { name: '活动会场', value: 20, color: COLORS[2] },
                      { name: '私域流量', value: 12, color: COLORS[3] },
                      { name: '其他', value: 5, color: COLORS[4] },
                    ].map((item, index) => (
                      <div key={item.name} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                          <span className="text-slate-600">{item.name}</span>
                        </div>
                        <span className="font-medium text-slate-800">{item.value}%</span>
                      </div>
                    ))}
                  </div>
                </Card.Body>
              </Card>

              <Card>
                <Card.Header>
                  <Card.Title className="flex items-center gap-2">
                    <Target className="w-5 h-5 text-rose-500" />
                    活动目标达成
                  </Card.Title>
                </Card.Header>
                <Card.Body className="space-y-5">
                  {[
                    { name: '销售额目标', current: dashboardStats.totalRevenue, target: 150000 },
                    { name: '订单量目标', current: dashboardStats.totalOrders, target: 1000 },
                    { name: '转化率目标', current: dashboardStats.conversionRate * 100, target: 5 },
                    { name: 'ROI目标', current: dashboardStats.roi, target: 4 },
                  ].map((item, index) => {
                    const percentage = Math.min((item.current / item.target) * 100, 100);
                    const isComplete = percentage >= 100;
                    return (
                      <div key={item.name} className="animate-in fade-in" style={{ animationDelay: `${index * 100}ms` }}>
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-slate-600">{item.name}</span>
                          <span className={cn('font-medium', isComplete ? 'text-emerald-600' : 'text-slate-800')}>
                            {percentage.toFixed(1)}%
                          </span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className={cn(
                              'h-full rounded-full transition-all duration-1000',
                              isComplete ? 'bg-gradient-to-r from-emerald-400 to-emerald-500' : 'bg-gradient-to-r from-blue-400 to-indigo-500'
                            )}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <p className="text-xs text-slate-400 mt-1">
                          目标: {item.target.toLocaleString()}
                        </p>
                      </div>
                    );
                  })}
                </Card.Body>
              </Card>
            </div>
          </div>

          <Card>
            <Card.Header>
              <Card.Title className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-indigo-500" />
                活动效果分析
              </Card.Title>
            </Card.Header>
            <Card.Body>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-4 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl border border-emerald-100">
                  <TrendingUp className="w-6 h-6 text-emerald-600 mb-3" />
                  <h4 className="font-semibold text-slate-800 mb-2">活动亮点</h4>
                  <ul className="space-y-2 text-sm text-slate-600">
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-500 mt-0.5">✓</span>
                      销售额环比增长 {formatPercent(dashboardStats.revenueGrowth)}
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-500 mt-0.5">✓</span>
                      转化率提升 {formatPercent(dashboardStats.conversionGrowth)}
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-500 mt-0.5">✓</span>
                      Top商品贡献了 65% 的销售额
                    </li>
                  </ul>
                </div>
                <div className="p-4 bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border border-amber-100">
                  <TrendingDown className="w-6 h-6 text-amber-600 mb-3" />
                  <h4 className="font-semibold text-slate-800 mb-2">待优化点</h4>
                  <ul className="space-y-2 text-sm text-slate-600">
                    <li className="flex items-start gap-2">
                      <span className="text-amber-500 mt-0.5">!</span>
                      部分商品库存不足，影响转化
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-amber-500 mt-0.5">!</span>
                      客单价略低于预期 {(-dashboardStats.aovGrowth).toFixed(1)}%
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-amber-500 mt-0.5">!</span>
                      尾部商品动销率偏低
                    </li>
                  </ul>
                </div>
                <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
                  <Target className="w-6 h-6 text-blue-600 mb-3" />
                  <h4 className="font-semibold text-slate-800 mb-2">下次优化建议</h4>
                  <ul className="space-y-2 text-sm text-slate-600">
                    <li className="flex items-start gap-2">
                      <span className="text-blue-500 mt-0.5">→</span>
                      增加爆款商品库存备货
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-500 mt-0.5">→</span>
                      设置满减门槛提升客单价
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-500 mt-0.5">→</span>
                      优化商品组合推荐策略
                    </li>
                  </ul>
                </div>
              </div>
            </Card.Body>
          </Card>
        </>
      )}
    </div>
  );
};
