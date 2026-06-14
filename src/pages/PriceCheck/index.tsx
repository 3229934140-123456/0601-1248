import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle, CheckCircle2, XCircle, Download, RefreshCw,
  ChevronDown, ChevronUp, Shield, AlertOctagon, TrendingDown,
  ArrowLeft, Filter, Info
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Table } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { useStore } from '@/store/useStore';
import { formatCurrency } from '@/utils/price';
import { exportPriceCheckReport } from '@/utils/export';
import { cn } from '@/utils/cn';
import type { PriceCheckResult, RiskCategory } from '@/types';

const riskLevelConfig = {
  high: { label: '高风险', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', icon: AlertOctagon },
  medium: { label: '中风险', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', icon: AlertTriangle },
  low: { label: '低风险', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', icon: Info },
};

const riskCategoryLabel: Record<RiskCategory, string> = {
  below_cost: '活动价亏本',
  coupon_below_cost: '叠券亏本',
  low_margin: '低毛利预警',
  safe: '安全通过',
};

const riskCategoryBadgeVariant: Record<RiskCategory, any> = {
  below_cost: 'danger',
  coupon_below_cost: 'warning',
  low_margin: 'info',
  safe: 'success',
};

export const PriceCheckPage = () => {
  const navigate = useNavigate();
  const { 
    priceCheckResults, campaigns, products, 
    runPriceCheck, clearPriceCheckResults 
  } = useStore();
  
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('');
  const [riskFilter, setRiskFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    if (campaigns.length > 0 && !selectedCampaignId) {
      setSelectedCampaignId(campaigns[0].id);
    }
  }, [campaigns, selectedCampaignId]);

  const selectedCampaign = useMemo(() => {
    return campaigns.find(c => c.id === selectedCampaignId) || null;
  }, [campaigns, selectedCampaignId]);

  const filteredResults = useMemo(() => {
    let results = priceCheckResults;
    if (riskFilter !== 'all') {
      results = results.filter(r => r.riskLevel === riskFilter);
    }
    if (categoryFilter !== 'all') {
      results = results.filter(r => r.riskCategories.includes(categoryFilter as RiskCategory));
    }
    return results;
  }, [priceCheckResults, riskFilter, categoryFilter]);

  const stats = useMemo(() => {
    const total = priceCheckResults.length;
    const high = priceCheckResults.filter(r => r.riskLevel === 'high').length;
    const medium = priceCheckResults.filter(r => r.riskLevel === 'medium').length;
    const low = priceCheckResults.filter(r => r.riskLevel === 'low').length;
    const passed = priceCheckResults.filter(r => r.riskCategories.includes('safe')).length;
    const belowCost = priceCheckResults.filter(r => r.riskCategories.includes('below_cost')).length;
    const couponBelowCost = priceCheckResults.filter(r => r.riskCategories.includes('coupon_below_cost')).length;
    const lowMargin = priceCheckResults.filter(r => r.riskCategories.includes('low_margin')).length;
    
    return { total, high, medium, low, passed, belowCost, couponBelowCost, lowMargin };
  }, [priceCheckResults]);

  const handleRunCheck = async () => {
    if (!selectedCampaign) return;
    
    setIsChecking(true);
    clearPriceCheckResults();
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    runPriceCheck(selectedCampaign.productIds, selectedCampaign.rules);
    setIsChecking(false);
  };

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  const handleExport = () => {
    if (!selectedCampaign || priceCheckResults.length === 0) return;
    exportPriceCheckReport(priceCheckResults, selectedCampaign.name);
  };

  const getRiskBadge = (riskLevel: PriceCheckResult['riskLevel']) => {
    const config = riskLevelConfig[riskLevel];
    const Icon = config.icon;
    return (
      <Badge 
        variant={riskLevel === 'high' ? 'danger' : riskLevel === 'medium' ? 'warning' : 'info'}
        pulse={riskLevel === 'high'}
      >
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
    );
  };

  const getRiskCategoryBadges = (categories: RiskCategory[]) => {
    return (
      <div className="flex flex-wrap gap-1">
        {categories.map((cat) => (
          <Badge key={cat} variant={riskCategoryBadgeVariant[cat]} size="sm">
            {riskCategoryLabel[cat]}
          </Badge>
        ))}
      </div>
    );
  };

  const renderMarginCell = (value: number) => {
    const isNegative = value < 0;
    return (
      <span className={cn(
        'font-medium',
        isNegative ? 'text-red-600' : 'text-slate-700'
      )}>
        {value.toFixed(2)}%
      </span>
    );
  };

  const groupSuggestionsByCategory = (result: PriceCheckResult) => {
    const belowCostSuggestions: string[] = [];
    const couponBelowCostSuggestions: string[] = [];
    const otherSuggestions: string[] = [];

    result.suggestions.forEach(s => {
      if (result.riskCategories.includes('below_cost') && 
          (s.includes('成本') || s.includes('活动价') || s.includes('亏本'))) {
        belowCostSuggestions.push(s);
      } else if (result.riskCategories.includes('coupon_below_cost') && 
                 (s.includes('券') || s.includes('叠券') || s.includes('叠加'))) {
        couponBelowCostSuggestions.push(s);
      } else {
        otherSuggestions.push(s);
      }
    });

    const groups: { title: string; suggestions: string[]; color: string; bg: string; icon: any }[] = [];
    
    if (belowCostSuggestions.length > 0 || result.riskCategories.includes('below_cost')) {
      groups.push({
        title: '活动价低于成本建议',
        suggestions: belowCostSuggestions.length > 0 ? belowCostSuggestions : otherSuggestions.splice(0, Math.ceil(otherSuggestions.length / 2)),
        color: 'text-red-600',
        bg: 'bg-red-50 border-red-200',
        icon: AlertOctagon
      });
    }
    
    if (couponBelowCostSuggestions.length > 0 || result.riskCategories.includes('coupon_below_cost')) {
      groups.push({
        title: '叠券后低于成本建议',
        suggestions: couponBelowCostSuggestions.length > 0 ? couponBelowCostSuggestions : otherSuggestions,
        color: 'text-amber-600',
        bg: 'bg-amber-50 border-amber-200',
        icon: AlertTriangle
      });
    }

    if (groups.length === 0) {
      groups.push({
        title: '风险说明与建议',
        suggestions: result.suggestions,
        color: riskLevelConfig[result.riskLevel].color,
        bg: `${riskLevelConfig[result.riskLevel].bg} ${riskLevelConfig[result.riskLevel].border}`,
        icon: riskLevelConfig[result.riskLevel].icon
      });
    }

    if (otherSuggestions.length > 0 && groups.length > 1) {
      const remaining = otherSuggestions.filter(s => 
        !groups[0].suggestions.includes(s) && !groups[1].suggestions.includes(s)
      );
      if (remaining.length > 0) {
        groups.push({
          title: '其他建议',
          suggestions: remaining,
          color: 'text-blue-600',
          bg: 'bg-blue-50 border-blue-200',
          icon: Info
        });
      }
    }

    return groups;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={() => navigate('/campaigns')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回活动
          </Button>
          <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-red-500/20">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">价格校验</h1>
            <p className="text-sm text-slate-500">检查活动价格是否低于成本，检测优惠券叠加风险</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="secondary" 
            onClick={handleExport} 
            className="gap-2"
            disabled={priceCheckResults.length === 0}
          >
            <Download className="w-4 h-4" />
            导出报告
          </Button>
          <Button 
            onClick={handleRunCheck} 
            className="gap-2"
            disabled={isChecking || !selectedCampaign}
            loading={isChecking}
          >
            <RefreshCw className={cn('w-4 h-4', isChecking && 'animate-spin')} />
            开始校验
          </Button>
        </div>
      </div>

      <Card>
        <Card.Body className="grid grid-cols-1 md:grid-cols-5 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              选择活动
            </label>
            <Select
              value={selectedCampaignId}
              onChange={(e) => setSelectedCampaignId(e.target.value)}
              options={[
                { value: '', label: '请选择活动' },
                ...campaigns.map(c => ({ value: c.id, label: c.name || '未命名活动' }))
              ]}
            />
          </div>
          <div>
            <p className="text-sm text-slate-500 mb-1">商品数量</p>
            <p className="text-2xl font-bold text-slate-800">
              {selectedCampaign?.productIds.length || 0}
            </p>
          </div>
          <div>
            <p className="text-sm text-slate-500 mb-1">促销规则</p>
            <p className="text-2xl font-bold text-slate-800">
              {selectedCampaign?.rules.length || 0} 条
            </p>
          </div>
          <div>
            <p className="text-sm text-slate-500 mb-1">活动时间</p>
            <p className="text-sm font-medium text-slate-700">
              {selectedCampaign ? `${selectedCampaign.startTime.split('T')[0]} ~ ${selectedCampaign.endTime.split('T')[0]}` : '-'}
            </p>
          </div>
          <div>
            <p className="text-sm text-slate-500 mb-1">活动状态</p>
            {selectedCampaign && (
              <Badge 
                variant={selectedCampaign.status === 'active' ? 'success' : selectedCampaign.status === 'pending' ? 'pending' : 'default'}
              >
                {selectedCampaign.status === 'draft' && '草稿'}
                {selectedCampaign.status === 'pending' && '待审核'}
                {selectedCampaign.status === 'approved' && '已通过'}
                {selectedCampaign.status === 'active' && '进行中'}
                {selectedCampaign.status === 'ended' && '已结束'}
              </Badge>
            )}
          </div>
        </Card.Body>
      </Card>

      {priceCheckResults.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">校验总数</p>
                  <p className="text-3xl font-bold text-slate-800 mt-1">{stats.total}</p>
                </div>
                <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center">
                  <Shield className="w-6 h-6 text-slate-600" />
                </div>
              </div>
            </Card>
            <Card className="p-4 border-l-4 border-l-emerald-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">校验通过</p>
                  <p className="text-3xl font-bold text-emerald-600 mt-1">{stats.passed}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    {stats.total > 0 ? ((stats.passed / stats.total) * 100).toFixed(1) : 0}%
                  </p>
                </div>
                <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                </div>
              </div>
            </Card>
            <Card className="p-4 border-l-4 border-l-blue-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">低风险</p>
                  <p className="text-3xl font-bold text-blue-600 mt-1">{stats.low}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Info className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </Card>
            <Card className="p-4 border-l-4 border-l-amber-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">中风险</p>
                  <p className="text-3xl font-bold text-amber-600 mt-1">{stats.medium}</p>
                </div>
                <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-amber-600" />
                </div>
              </div>
            </Card>
            <Card className="p-4 border-l-4 border-l-red-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">高风险</p>
                  <p className="text-3xl font-bold text-red-600 mt-1">{stats.high}</p>
                </div>
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center animate-pulse">
                  <AlertOctagon className="w-6 h-6 text-red-600" />
                </div>
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-4 border-l-4 border-l-red-600 bg-red-50/50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-red-600 font-medium">活动价低于成本</p>
                  <p className="text-3xl font-bold text-red-700 mt-1">{stats.belowCost}</p>
                  <p className="text-xs text-red-500 mt-1">
                    {stats.total > 0 ? ((stats.belowCost / stats.total) * 100).toFixed(1) : 0}% 占比
                  </p>
                </div>
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                  <AlertOctagon className="w-6 h-6 text-red-600" />
                </div>
              </div>
            </Card>
            <Card className="p-4 border-l-4 border-l-orange-500 bg-orange-50/50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-orange-600 font-medium">叠券后低于成本</p>
                  <p className="text-3xl font-bold text-orange-700 mt-1">{stats.couponBelowCost}</p>
                  <p className="text-xs text-orange-500 mt-1">
                    {stats.total > 0 ? ((stats.couponBelowCost / stats.total) * 100).toFixed(1) : 0}% 占比
                  </p>
                </div>
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-orange-600" />
                </div>
              </div>
            </Card>
            <Card className="p-4 border-l-4 border-l-yellow-500 bg-yellow-50/50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-yellow-700 font-medium">低毛利预警</p>
                  <p className="text-3xl font-bold text-yellow-700 mt-1">{stats.lowMargin}</p>
                  <p className="text-xs text-yellow-600 mt-1">
                    {stats.total > 0 ? ((stats.lowMargin / stats.total) * 100).toFixed(1) : 0}% 占比
                  </p>
                </div>
                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <TrendingDown className="w-6 h-6 text-yellow-600" />
                </div>
              </div>
            </Card>
            <Card className="p-4 border-l-4 border-l-emerald-500 bg-emerald-50/50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-emerald-700 font-medium">安全通过</p>
                  <p className="text-3xl font-bold text-emerald-700 mt-1">{stats.passed}</p>
                  <p className="text-xs text-emerald-600 mt-1">
                    {stats.total > 0 ? ((stats.passed / stats.total) * 100).toFixed(1) : 0}% 通过率
                  </p>
                </div>
                <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                </div>
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-4">
              <p className="text-sm text-slate-500 mb-3">风险分布</p>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-red-600">高风险</span>
                    <span className="font-medium">{stats.high} 个</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-red-500 rounded-full transition-all duration-500"
                      style={{ width: `${stats.total > 0 ? (stats.high / stats.total) * 100 : 0}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-amber-600">中风险</span>
                    <span className="font-medium">{stats.medium} 个</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-amber-500 rounded-full transition-all duration-500"
                      style={{ width: `${stats.total > 0 ? (stats.medium / stats.total) * 100 : 0}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-blue-600">低风险</span>
                    <span className="font-medium">{stats.low} 个</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-500 rounded-full transition-all duration-500"
                      style={{ width: `${stats.total > 0 ? (stats.low / stats.total) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-4 md:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-medium text-slate-700">风险说明</p>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Filter className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <Select
                      value={riskFilter}
                      onChange={(e) => setRiskFilter(e.target.value)}
                      options={[
                        { value: 'all', label: '全部风险' },
                        { value: 'high', label: '高风险' },
                        { value: 'medium', label: '中风险' },
                        { value: 'low', label: '低风险' },
                      ]}
                      className="pl-9"
                    />
                  </div>
                  <div className="relative">
                    <Filter className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <Select
                      value={categoryFilter}
                      onChange={(e) => setCategoryFilter(e.target.value)}
                      options={[
                        { value: 'all', label: '全部类别' },
                        { value: 'below_cost', label: '活动价低于成本' },
                        { value: 'coupon_below_cost', label: '叠券后低于成本' },
                        { value: 'low_margin', label: '低毛利风险' },
                        { value: 'safe', label: '安全通过' },
                      ]}
                      className="pl-9"
                    />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertOctagon className="w-4 h-4 text-red-600" />
                    <span className="font-medium text-red-700">高风险</span>
                  </div>
                  <p className="text-xs text-red-600">活动价低于成本价，存在直接亏损风险</p>
                </div>
                <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span className="font-medium text-amber-700">中风险</span>
                  </div>
                  <p className="text-xs text-amber-600">优惠券叠加后价格低于成本价</p>
                </div>
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-2 mb-1">
                    <Info className="w-4 h-4 text-blue-600" />
                    <span className="font-medium text-blue-700">低风险</span>
                  </div>
                  <p className="text-xs text-blue-600">利润率偏低，建议关注销量预期</p>
                </div>
              </div>
            </Card>
          </div>

          <Card>
            <Card.Header>
              <Card.Title className="flex items-center justify-between">
                校验结果详情
                <span className="text-sm font-normal text-slate-500">
                  共 {filteredResults.length} 条记录
                </span>
              </Card.Title>
            </Card.Header>
            <Card.Body className="p-0">
              {filteredResults.length === 0 ? (
                <div className="text-center py-16">
                  <Filter className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                  <p className="text-slate-500">没有匹配的校验结果</p>
                  <p className="text-sm text-slate-400 mt-1">请调整筛选条件或重新执行校验</p>
                </div>
              ) : (
                <Table>
                  <Table.Header>
                    <tr>
                      <th className="px-4 py-3 w-12"></th>
                      <th className="px-4 py-3">商品名称</th>
                      <th className="px-4 py-3">原价</th>
                      <th className="px-4 py-3">活动价</th>
                      <th className="px-4 py-3">成本价</th>
                      <th className="px-4 py-3">活动毛利率%</th>
                      <th className="px-4 py-3">叠加券后价</th>
                      <th className="px-4 py-3">叠券毛利率%</th>
                      <th className="px-4 py-3">低于成本</th>
                      <th className="px-4 py-3">叠券风险</th>
                      <th className="px-4 py-3">风险等级</th>
                      <th className="px-4 py-3">风险类别</th>
                    </tr>
                  </Table.Header>
                  <Table.Body>
                    {filteredResults.map((result, index) => {
                      const config = riskLevelConfig[result.riskLevel];
                      const isExpanded = expandedItems.has(result.productId);
                      const product = products.find(p => p.id === result.productId);
                      const suggestionGroups = groupSuggestionsByCategory(result);
                      
                      return (
                        <>
                          <Table.Row
                            key={result.productId}
                            className={cn(
                              'cursor-pointer transition-colors animate-in fade-in',
                              result.riskCategories.includes('below_cost') && 'bg-red-50/50'
                            )}
                            style={{ animationDelay: `${index * 30}ms` }}
                            onClick={() => toggleExpand(result.productId)}
                          >
                            <Table.Cell className="w-12">
                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4 text-slate-400" />
                              ) : (
                                <ChevronDown className="w-4 h-4 text-slate-400" />
                              )}
                            </Table.Cell>
                            <Table.Cell>
                              <div className="flex items-center gap-3">
                                {product && (
                                  <img
                                    src={product.imageUrl}
                                    alt={product.name}
                                    className="w-10 h-10 rounded-lg object-cover bg-slate-100"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="%23cbd5e1" stroke-width="2"%3E%3Crect x="3" y="3" width="18" height="18" rx="2" ry="2"%3E%3C/rect%3E%3Ccircle cx="8.5" cy="8.5" r="1.5"%3E%3C/circle%3E%3Cpolyline points="21 15 16 10 5 21"%3E%3C/polyline%3E%3C/svg%3E';
                                    }}
                                  />
                                )}
                                <span className="font-medium text-slate-800">{result.productName}</span>
                              </div>
                            </Table.Cell>
                            <Table.Cell className="text-slate-500 line-through">
                              {formatCurrency(result.originalPrice)}
                            </Table.Cell>
                            <Table.Cell className="font-medium text-slate-800">
                              {formatCurrency(result.activityPrice)}
                            </Table.Cell>
                            <Table.Cell className="text-slate-600">
                              {formatCurrency(result.costPrice)}
                            </Table.Cell>
                            <Table.Cell>
                              {renderMarginCell(result.activityMargin)}
                            </Table.Cell>
                            <Table.Cell className={cn(
                              'font-bold',
                              result.finalPriceWithCoupons <= result.costPrice ? 'text-red-600' : 'text-slate-800'
                            )}>
                              {formatCurrency(result.finalPriceWithCoupons)}
                            </Table.Cell>
                            <Table.Cell>
                              {renderMarginCell(result.finalMargin)}
                            </Table.Cell>
                            <Table.Cell>
                              {result.riskCategories.includes('below_cost') ? (
                                <Badge variant="danger" size="sm">
                                  <AlertOctagon className="w-3 h-3" />
                                  活动价亏本
                                </Badge>
                              ) : (
                                <CheckCircle2 className="w-5 h-5 text-slate-300" />
                              )}
                            </Table.Cell>
                            <Table.Cell>
                              {result.riskCategories.includes('coupon_below_cost') ? (
                                <Badge variant="warning" size="sm">
                                  <AlertTriangle className="w-3 h-3" />
                                  叠券亏本
                                </Badge>
                              ) : (
                                <CheckCircle2 className="w-5 h-5 text-slate-300" />
                              )}
                            </Table.Cell>
                            <Table.Cell>
                              {getRiskBadge(result.riskLevel)}
                            </Table.Cell>
                            <Table.Cell>
                              {getRiskCategoryBadges(result.riskCategories)}
                            </Table.Cell>
                          </Table.Row>
                          {isExpanded && (
                            <tr className={config.bg}>
                              <td colSpan={12} className="px-6 py-4 border-t border-slate-100">
                                <div className="space-y-4">
                                  {suggestionGroups.map((group, gIdx) => (
                                    <div key={gIdx} className={cn('p-4 rounded-lg border', group.bg)}>
                                      <div className="flex items-start gap-3">
                                        <group.icon className={cn('w-5 h-5 mt-0.5', group.color)} />
                                        <div className="flex-1">
                                          <p className={cn('font-medium mb-2', group.color)}>
                                            {group.title}
                                          </p>
                                          <ul className="space-y-2">
                                            {group.suggestions.map((suggestion, idx) => (
                                              <li key={idx} className="flex items-start gap-2 text-sm">
                                                <span className="text-slate-400 mt-1">•</span>
                                                <span className="text-slate-700">{suggestion}</span>
                                              </li>
                                            ))}
                                          </ul>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                  <div className="flex items-center gap-3 pt-2">
                                    <Button 
                                      size="sm" 
                                      variant="outline"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        navigate(`/campaigns/${selectedCampaignId}`);
                                      }}
                                    >
                                      调整活动规则
                                    </Button>
                                    <Button 
                                      size="sm" 
                                      variant="secondary"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setRiskFilter(result.riskLevel);
                                      }}
                                    >
                                      查看同类风险
                                    </Button>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </>
                      );
                    })}
                  </Table.Body>
                </Table>
              )}
            </Card.Body>
          </Card>
        </>
      )}

      {priceCheckResults.length === 0 && !isChecking && (
        <Card className="text-center py-16">
          <Shield className="w-20 h-20 mx-auto mb-4 text-slate-300" />
          <h3 className="text-xl font-semibold text-slate-800 mb-2">开始价格校验</h3>
          <p className="text-slate-500 mb-6 max-w-md mx-auto">
            系统将检查活动商品的价格是否低于成本价，并检测优惠券叠加后的潜在亏损风险
          </p>
          <Button onClick={handleRunCheck} disabled={!selectedCampaign} className="gap-2" size="lg">
            <RefreshCw className="w-5 h-5" />
            立即校验
          </Button>
          {!selectedCampaign && (
            <p className="text-sm text-amber-600 mt-3">请先选择一个活动</p>
          )}
        </Card>
      )}

      {isChecking && (
        <Card className="text-center py-16">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-blue-100 flex items-center justify-center animate-pulse">
            <RefreshCw className="w-10 h-10 text-blue-600 animate-spin" />
          </div>
          <h3 className="text-xl font-semibold text-slate-800 mb-2">正在执行价格校验</h3>
          <p className="text-slate-500">正在分析商品价格和促销规则...</p>
          <div className="mt-6 max-w-sm mx-auto">
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full animate-pulse" style={{ width: '70%' }} />
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};
