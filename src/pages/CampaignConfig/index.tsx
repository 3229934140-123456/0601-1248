import { useState, useMemo, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Plus, Tag, Calendar, Gift, Percent, TrendingUp,
  ChevronRight, CheckCircle2, Clock, XCircle, Edit2,
  Trash2, Eye, Download, ArrowLeft, PlusCircle, MinusCircle,
  Check, X, ShoppingCart, Zap, BarChart3, AlertTriangle
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Table } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { useStore } from '@/store/useStore';
import { formatDate, formatDateTime, getCalendarGrid, isDateInRange } from '@/utils/date';
import { formatCurrency, calculateActivityPrice } from '@/utils/price';
import { exportSignUpList } from '@/utils/export';
import { validateCampaign, ValidationError } from '@/utils/validation';
import { createNewRule } from '@/data/campaigns';
import { cn } from '@/utils/cn';
import type { Campaign, PromotionRule, StatusHistoryItem } from '@/types';

const campaignTypes = ['618大促', '双11狂欢', '新品上市', '清仓甩卖', '会员专享', '节日特惠'];

const statusConfig: Record<Campaign['status'], { label: string; variant: any; icon: any }> = {
  draft: { label: '草稿', variant: 'default', icon: Edit2 },
  pending: { label: '待审核', variant: 'pending', icon: Clock },
  approved: { label: '已通过', variant: 'success', icon: CheckCircle2 },
  rejected: { label: '已驳回', variant: 'danger', icon: XCircle },
  active: { label: '进行中', variant: 'success', icon: Zap },
  ended: { label: '已结束', variant: 'default', icon: CheckCircle2 },
};

const steps = [
  { id: 'info', label: '活动信息', icon: Tag },
  { id: 'rules', label: '促销规则', icon: Percent },
  { id: 'products', label: '商品清单', icon: ShoppingCart },
  { id: 'preview', label: '预览提交', icon: Eye },
];

export const CampaignConfigPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const {
    campaigns, products, currentCampaign, setCurrentCampaign,
    createCampaign, updateCampaign, addRuleToCampaign,
    updateRuleInCampaign, removeRuleFromCampaign,
    addProductsToCampaign, removeProductFromCampaign,
    submitCampaignForReview, reviewCampaign, revertCampaignToDraft
  } = useStore();

  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<Partial<Campaign>>({});
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewComment, setReviewComment] = useState('');
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [showProductPicker, setShowProductPicker] = useState(false);
  const [statusFilter, setStatusFilter] = useState<Campaign['status'] | 'all'>('all');
  const [expandedDate, setExpandedDate] = useState<string | null>(null);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);

  const isEditMode = !!id;

  const activeCampaign = useMemo(() => {
    if (isEditMode) {
      return campaigns.find(c => c.id === id) || null;
    }
    return currentCampaign;
  }, [campaigns, id, currentCampaign, isEditMode]);

  useEffect(() => {
    if (id === 'new') {
      const newCampaign = createCampaign({
        name: '',
        type: campaignTypes[0],
        status: 'draft',
        startTime: new Date().toISOString().split('T')[0],
        endTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        productIds: [],
        rules: [],
      });
      setCurrentCampaign(newCampaign);
      setFormData(newCampaign);
      navigate(`/campaigns/${newCampaign.id}`);
    }
  }, [id]);

  const campaignProducts = useMemo(() => {
    if (!activeCampaign) return [];
    return products.filter(p => activeCampaign.productIds.includes(p.id));
  }, [activeCampaign, products]);

  const calendarDays = useMemo(() => {
    return getCalendarGrid(calendarMonth.getFullYear(), calendarMonth.getMonth());
  }, [calendarMonth]);

  const filteredCampaigns = useMemo(() => {
    return statusFilter !== 'all'
      ? campaigns.filter(c => c.status === statusFilter)
      : campaigns;
  }, [campaigns, statusFilter]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: campaigns.length };
    campaigns.forEach(c => {
      counts[c.status] = (counts[c.status] || 0) + 1;
    });
    return counts;
  }, [campaigns]);

  const getCampaignsForDate = (date: Date) => {
    return campaigns.filter(c => isDateInRange(date, c.startTime, c.endTime));
  };

  const groupedStatusHistory = useMemo(() => {
    if (!activeCampaign) return [];
    const groups: { submissionId: string; items: StatusHistoryItem[]; roundNumber: number }[] = [];
    const seenSubmissions = new Map<string, number>();
    
    activeCampaign.statusHistory.forEach(item => {
      const subId = item.submissionId || 'default';
      if (!seenSubmissions.has(subId)) {
        seenSubmissions.set(subId, seenSubmissions.size + 1);
        groups.push({
          submissionId: subId,
          roundNumber: seenSubmissions.get(subId)!,
          items: []
        });
      }
      const group = groups.find(g => g.submissionId === subId)!;
      group.items.push(item);
    });
    
    return groups;
  }, [activeCampaign]);

  const timelineRef = useRef<HTMLDivElement | null>(null);

  const handleCreateNew = () => {
    const newCampaign = createCampaign({
      name: '',
      type: campaignTypes[0],
      status: 'draft',
      startTime: new Date().toISOString().split('T')[0],
      endTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      productIds: [],
      rules: [],
    });
    setCurrentCampaign(newCampaign);
    setFormData(newCampaign);
    navigate(`/campaigns/${newCampaign.id}`);
  };

  const handleEdit = (campaign: Campaign) => {
    setCurrentCampaign(campaign);
    setFormData(campaign);
    navigate(`/campaigns/${campaign.id}`);
  };

  const handleSave = () => {
    if (!activeCampaign) return;
    
    const validationErrors = validateCampaign({
      name: formData.name || '',
      startTime: formData.startTime || '',
      endTime: formData.endTime || '',
      productIds: activeCampaign.productIds,
      rules: activeCampaign.rules,
    });

    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors([]);
    updateCampaign(activeCampaign.id, formData);
  };

  const handleSubmitForReview = () => {
    if (!activeCampaign) return;
    
    const validationErrors = validateCampaign({
      name: formData.name || '',
      startTime: formData.startTime || '',
      endTime: formData.endTime || '',
      productIds: activeCampaign.productIds,
      rules: activeCampaign.rules,
    }, 'submit');

    if (validationErrors.length > 0) {
      setValidationErrors(validationErrors);
      setShowValidationModal(true);
      return;
    }

    handleSave();
    if (errors.length === 0) {
      submitCampaignForReview(activeCampaign.id);
    }
  };

  const handleReview = (approved: boolean) => {
    if (!activeCampaign) return;
    reviewCampaign(activeCampaign.id, approved, reviewComment);
    setShowReviewModal(false);
    setReviewComment('');
  };

  const handleAddRule = (type: PromotionRule['type']) => {
    if (!activeCampaign) return;
    const newRule = createNewRule(type);
    addRuleToCampaign(activeCampaign.id, newRule);
  };

  const handleUpdateRule = (ruleId: string, updates: Partial<PromotionRule>) => {
    if (!activeCampaign) return;
    updateRuleInCampaign(activeCampaign.id, ruleId, updates);
  };

  const handleRemoveRule = (ruleId: string) => {
    if (!activeCampaign) return;
    removeRuleFromCampaign(activeCampaign.id, ruleId);
  };

  const handleExport = () => {
    if (!activeCampaign) return;
    exportSignUpList(campaignProducts, activeCampaign);
  };

  const handleGoToPriceCheck = () => {
    if (!activeCampaign) return;
    useStore.getState().runPriceCheck(activeCampaign.productIds, activeCampaign.rules);
    navigate('/price-check');
  };

  const getStatusBadge = (status: Campaign['status']) => {
    const config = statusConfig[status];
    const Icon = config.icon;
    return (
      <Badge variant={config.variant} pulse={status === 'pending'}>
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
    );
  };

  if (!isEditMode) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/20">
              <Tag className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">活动配置</h1>
              <p className="text-sm text-slate-500">创建和管理您的促销活动</p>
            </div>
          </div>
          <Button onClick={handleCreateNew} className="gap-2">
            <Plus className="w-4 h-4" />
            新建活动
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">全部活动</p>
                <p className="text-2xl font-bold text-slate-800 mt-1">{campaigns.length}</p>
              </div>
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Calendar className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">进行中</p>
                <p className="text-2xl font-bold text-emerald-600 mt-1">
                  {campaigns.filter(c => c.status === 'active').length}
                </p>
              </div>
              <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                <Zap className="w-5 h-5 text-emerald-600" />
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">待审核</p>
                <p className="text-2xl font-bold text-amber-600 mt-1">
                  {campaigns.filter(c => c.status === 'pending').length}
                </p>
              </div>
              <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">已结束</p>
                <p className="text-2xl font-bold text-slate-600 mt-1">
                  {campaigns.filter(c => c.status === 'ended').length}
                </p>
              </div>
              <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-slate-600" />
              </div>
            </div>
          </Card>
        </div>

        <Card className="p-4">
          <div className="flex flex-wrap items-center gap-2">
            {(['all', 'draft', 'pending', 'approved', 'rejected', 'active', 'ended'] as const).map((status) => {
              const label = status === 'all' ? '全部' : statusConfig[status].label;
              const count = statusCounts[status] || 0;
              const isActive = statusFilter === status;
              return (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
                    isActive
                      ? 'bg-[#1e3a5f] text-white shadow-md'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  )}
                >
                  {label}
                  <span className={cn(
                    'px-2 py-0.5 rounded-full text-xs font-bold',
                    isActive ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                  )}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card>
              <Card.Header>
                <Card.Title>活动列表</Card.Title>
              </Card.Header>
              <Card.Body className="p-0">
                <Table>
                  <Table.Header>
                    <tr>
                      <th className="px-4 py-3">活动名称</th>
                      <th className="px-4 py-3">类型</th>
                      <th className="px-4 py-3">时间</th>
                      <th className="px-4 py-3">商品数</th>
                      <th className="px-4 py-3">状态</th>
                      <th className="px-4 py-3">操作</th>
                    </tr>
                  </Table.Header>
                  <Table.Body>
                    {filteredCampaigns.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                          暂无匹配的活动
                        </td>
                      </tr>
                    ) : (
                      filteredCampaigns.map((campaign, index) => (
                        <Table.Row
                          key={campaign.id}
                          onClick={() => handleEdit(campaign)}
                          className="cursor-pointer animate-in fade-in"
                          style={{ animationDelay: `${index * 50}ms` }}
                        >
                          <Table.Cell>
                            <div className="font-medium text-slate-800">{campaign.name || '未命名活动'}</div>
                            <div className="text-xs text-slate-500">创建于 {formatDate(campaign.createdAt)}</div>
                          </Table.Cell>
                          <Table.Cell>
                            <span className="text-sm text-slate-600">{campaign.type}</span>
                          </Table.Cell>
                          <Table.Cell>
                            <span className="text-sm text-slate-600">
                              {formatDate(campaign.startTime)} - {formatDate(campaign.endTime)}
                            </span>
                          </Table.Cell>
                          <Table.Cell>
                            <span className="font-medium">{campaign.productIds.length}</span>
                          </Table.Cell>
                          <Table.Cell>
                            {getStatusBadge(campaign.status)}
                          </Table.Cell>
                          <Table.Cell>
                            <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleEdit(campaign); }}>
                              <Edit2 className="w-4 h-4" />
                            </Button>
                          </Table.Cell>
                        </Table.Row>
                      ))
                    )}
                  </Table.Body>
                </Table>
              </Card.Body>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <Card.Header>
                <Card.Title className="flex items-center justify-between">
                  活动日历
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1))}>
                      <ChevronRight className="w-4 h-4 rotate-180" />
                    </Button>
                    <span className="text-sm font-normal">
                      {calendarMonth.getFullYear()}年{calendarMonth.getMonth() + 1}月
                    </span>
                    <Button variant="ghost" size="sm" onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1))}>
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </Card.Title>
              </Card.Header>
              <Card.Body>
                <div className="grid grid-cols-7 gap-1 text-center">
                  {['日', '一', '二', '三', '四', '五', '六'].map(day => (
                    <div key={day} className="text-xs text-slate-500 font-medium py-2">{day}</div>
                  ))}
                  {calendarDays.map((day, index) => {
                    if (!day) return <div key={index} className="min-h-16" />;
                    
                    const dayCampaigns = getCampaignsForDate(day);
                    const isToday = day.toDateString() === new Date().toDateString();
                    const dateStr = day.toISOString().split('T')[0];
                    const isExpanded = expandedDate === dateStr;
                    
                    const displayCampaigns = dayCampaigns.slice(0, 2);
                    const extraCount = dayCampaigns.length - 2;
                    
                    return (
                      <div key={index}>
                        <div
                          onClick={() => setExpandedDate(isExpanded ? null : dateStr)}
                          className={cn(
                            'min-h-16 flex flex-col items-start p-1 text-sm rounded-lg transition-colors cursor-pointer',
                            isToday && 'bg-[#1e3a5f] text-white',
                            dayCampaigns.length > 0 && !isToday && 'bg-amber-50 hover:bg-amber-100',
                            dayCampaigns.length === 0 && !isToday && 'text-slate-600 hover:bg-slate-50',
                            isExpanded && 'ring-2 ring-[#1e3a5f]'
                          )}
                        >
                          <span className={cn(
                            'text-xs font-medium mb-1',
                            isToday && 'bg-white/20 px-1.5 py-0.5 rounded'
                          )}>
                            {day.getDate()}
                          </span>
                          {displayCampaigns.map((campaign, cIdx) => (
                            <div key={campaign.id} className="w-full text-left mb-0.5">
                              <div className={cn(
                                'text-[10px] truncate',
                                isToday ? 'text-white/90' : 'text-slate-700'
                              )}>
                                {campaign.name.length > 6 ? campaign.name.slice(0, 6) + '...' : campaign.name}
                              </div>
                              <Badge 
                                variant={statusConfig[campaign.status].variant} 
                                size="sm" 
                                className="text-[9px] py-0 px-1 h-3"
                              >
                                {statusConfig[campaign.status].label}
                              </Badge>
                            </div>
                          ))}
                          {extraCount > 0 && (
                            <span className={cn(
                              'text-[10px]',
                              isToday ? 'text-white/70' : 'text-slate-500'
                            )}>
                              +{extraCount}
                            </span>
                          )}
                        </div>
                        {isExpanded && dayCampaigns.length > 0 && (
                          <div className="mt-2 p-3 bg-slate-50 rounded-lg border border-slate-200 text-left">
                            <div className="text-xs font-medium text-slate-700 mb-2">
                              {formatDate(dateStr)} 的活动 ({dayCampaigns.length})
                            </div>
                            <div className="space-y-2 max-h-48 overflow-y-auto">
                              {dayCampaigns.map(campaign => (
                                <div key={campaign.id} className="p-2 bg-white rounded border border-slate-100">
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium text-slate-800 truncate">{campaign.name}</p>
                                      <div className="flex items-center gap-2 mt-1">
                                        {getStatusBadge(campaign.status)}
                                        <span className="text-xs text-slate-500">
                                          {formatDate(campaign.startTime)} - {formatDate(campaign.endTime)}
                                        </span>
                                      </div>
                                    </div>
                                    <Button 
                                      size="sm" 
                                      variant="outline" 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        navigate(`/campaigns/${campaign.id}`);
                                      }}
                                    >
                                      查看
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-4 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 bg-amber-100 rounded" />
                    <span className="text-slate-600">有活动</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 bg-[#1e3a5f] rounded" />
                    <span className="text-slate-600">今天</span>
                  </div>
                </div>
              </Card.Body>
            </Card>

            <Card>
              <Card.Header>
                <Card.Title>即将开始</Card.Title>
              </Card.Header>
              <Card.Body className="space-y-3">
                {campaigns
                  .filter(c => new Date(c.startTime) > new Date())
                  .slice(0, 3)
                  .map(campaign => (
                    <div key={campaign.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 cursor-pointer" onClick={() => handleEdit(campaign)}>
                      <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg flex items-center justify-center">
                        <Tag className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-slate-800 truncate">{campaign.name}</p>
                        <p className="text-xs text-slate-500">{formatDate(campaign.startTime)} 开始</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </div>
                  ))}
                {campaigns.filter(c => new Date(c.startTime) > new Date()).length === 0 && (
                  <div className="text-center py-4 text-slate-500 text-sm">
                    暂无即将开始的活动
                  </div>
                )}
              </Card.Body>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (!activeCampaign && id !== 'new') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md w-full">
          <Card.Body className="text-center py-12">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <XCircle className="w-10 h-10 text-slate-400" />
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">活动不存在或已删除</h2>
            <p className="text-slate-500 mb-8">您访问的活动可能已被删除，或者链接有误</p>
            <Button onClick={() => navigate('/campaigns')} className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              返回活动列表
            </Button>
          </Card.Body>
        </Card>
      </div>
    );
  }

  if (!activeCampaign) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate('/campaigns')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          返回列表
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-800">
            {activeCampaign.name || '新建活动'}
          </h1>
          <div className="flex items-center gap-2 mt-1">
            {getStatusBadge(activeCampaign.status)}
            <span className="text-sm text-slate-500">
              更新于 {formatDateTime(activeCampaign.updatedAt)}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {activeCampaign.status === 'draft' && (
            <>
              <Button variant="secondary" onClick={handleGoToPriceCheck} className="gap-2">
                <BarChart3 className="w-4 h-4" />
                价格校验
              </Button>
              <Button variant="outline" onClick={handleSave}>
                保存草稿
              </Button>
              <Button onClick={handleSubmitForReview} className="gap-2">
                <Check className="w-4 h-4" />
                提交审核
              </Button>
            </>
          )}
          {activeCampaign.status === 'pending' && (
            <Button onClick={() => setShowReviewModal(true)} className="gap-2">
              <Check className="w-4 h-4" />
              处理审核
            </Button>
          )}
          {(activeCampaign.status === 'approved' || activeCampaign.status === 'active') && (
            <Button variant="secondary" onClick={handleExport} className="gap-2">
              <Download className="w-4 h-4" />
              导出报名清单
            </Button>
          )}
        </div>
      </div>

      {activeCampaign.status === 'rejected' && (
        <div className="px-5 py-4 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between gap-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="font-semibold text-red-700 mb-1">活动已被驳回</p>
              <p className="text-sm font-medium text-red-700 mb-1">驳回原因：</p>
              <p className="text-sm text-red-600 break-words bg-white/60 rounded-lg px-3 py-2">
                {activeCampaign.reviewComment || '暂无驳回原因'}
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            <button
              onClick={() => {
                timelineRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }}
              className="text-sm text-red-600 hover:text-red-700 underline"
            >
              查看历史
            </button>
            <Button
              variant="danger"
              className="gap-2"
              onClick={() => {
                revertCampaignToDraft(activeCampaign.id);
                setErrors([]);
                setCurrentStep(0);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            >
              <Edit2 className="w-4 h-4" />
              重新编辑
            </Button>
          </div>
        </div>
      )}

      <div ref={timelineRef}>
        <Card>
          <Card.Header>
            <Card.Title className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-slate-500" />
              状态流转时间线
            </Card.Title>
          </Card.Header>
        <Card.Body>
          <div className="space-y-6">
            {groupedStatusHistory.map((group, groupIndex) => (
              <div key={group.submissionId} className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-[#1e3a5f] text-white rounded-full flex items-center justify-center text-xs font-bold">
                    {group.roundNumber}
                  </div>
                  <h4 className="font-semibold text-slate-800">
                    第 {group.roundNumber} 轮审核
                  </h4>
                </div>
                <div className="relative pl-2 ml-3 border-l-2 border-slate-200">
                  {group.items.map((item, index) => {
                    const config = statusConfig[item.status];
                    const isLast = index === group.items.length - 1;
                    const dotColors: Record<Campaign['status'], string> = {
                      draft: 'bg-slate-400',
                      pending: 'bg-amber-500',
                      approved: 'bg-emerald-500',
                      rejected: 'bg-red-500',
                      active: 'bg-blue-500',
                      ended: 'bg-slate-600',
                    };
                    return (
                      <div key={item.id} className="relative pb-6 last:pb-0 pl-5">
                        {!isLast && (
                          <div className="absolute left-0 top-6 w-0.5 h-full bg-slate-200" />
                        )}
                        <div className="absolute -left-[11px] top-1">
                          <div className={cn(
                            'w-6 h-6 rounded-full shrink-0 ring-4 ring-white flex items-center justify-center',
                            dotColors[item.status]
                          )}>
                            <div className="w-2 h-2 rounded-full bg-white" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0 pt-0.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant={config.variant}>
                              {config.label}
                            </Badge>
                            <span className="text-sm text-slate-500">
                              {formatDateTime(item.changedAt)}
                            </span>
                            {item.operator && (
                              <span className="text-sm text-slate-500">
                                · {item.operator}
                              </span>
                            )}
                          </div>
                          {item.comment && (
                            <p className={cn(
                              'mt-2 text-sm rounded-lg px-3 py-2',
                              item.status === 'rejected' && 'bg-red-50 border border-red-200 text-red-700',
                              item.status === 'approved' && 'bg-emerald-50 border border-emerald-200 text-emerald-700',
                              item.status !== 'rejected' && item.status !== 'approved' && 'bg-slate-50 text-slate-600'
                            )}>
                              {item.comment}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </Card.Body>
        </Card>
      </div>

      <div className="flex items-center justify-between px-4 py-3 bg-white rounded-xl border border-slate-200">
        <div className="flex items-center gap-2">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isActive = index === currentStep;
            const isCompleted = index < currentStep;
            return (
              <button
                key={step.id}
                onClick={() => setCurrentStep(index)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-lg transition-all',
                  isActive && 'bg-[#1e3a5f] text-white shadow-md',
                  isCompleted && 'bg-emerald-50 text-emerald-700',
                  !isActive && !isCompleted && 'text-slate-500 hover:bg-slate-100'
                )}
              >
                {isCompleted ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  <Icon className="w-4 h-4" />
                )}
                <span className="text-sm font-medium">{step.label}</span>
                {index < steps.length - 1 && (
                  <ChevronRight className="w-4 h-4 ml-2 opacity-50" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <Card>
        {currentStep === 0 && (
          <div className="space-y-6">
            <Card.Header>
              <Card.Title>活动基本信息</Card.Title>
            </Card.Header>
            <Card.Body className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <Input
                  label="活动名称"
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="请输入活动名称"
                  error={errors.find(e => e.field === 'name')?.message}
                />
                <Select
                  label="活动类型"
                  value={formData.type || ''}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  options={campaignTypes.map(t => ({ value: t, label: t }))}
                />
              </div>
              <div className="space-y-4">
                <Input
                  label="活动开始时间"
                  type="date"
                  value={formData.startTime?.split('T')[0] || ''}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                />
                <Input
                  label="活动结束时间"
                  type="date"
                  value={formData.endTime?.split('T')[0] || ''}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                  error={errors.find(e => e.field === 'date')?.message}
                />
              </div>
            </Card.Body>
            <Card.Footer className="flex justify-end">
              <Button onClick={() => setCurrentStep(1)} className="gap-2">
                下一步
                <ChevronRight className="w-4 h-4" />
              </Button>
            </Card.Footer>
          </div>
        )}

        {currentStep === 1 && (
          <div className="space-y-6">
            <Card.Header className="flex items-center justify-between">
              <Card.Title>促销规则设置</Card.Title>
              <div className="flex items-center gap-2">
                <Button variant="secondary" size="sm" onClick={() => handleAddRule('fullReduce')} className="gap-1">
                  <PlusCircle className="w-4 h-4" />
                  添加满减
                </Button>
                <Button variant="secondary" size="sm" onClick={() => handleAddRule('discount')} className="gap-1">
                  <PlusCircle className="w-4 h-4" />
                  添加折扣
                </Button>
                <Button variant="secondary" size="sm" onClick={() => handleAddRule('gift')} className="gap-1">
                  <Gift className="w-4 h-4" />
                  添加赠品
                </Button>
              </div>
            </Card.Header>
            <Card.Body className="space-y-4">
              {errors.find(e => e.field === 'rules') && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                  {errors.find(e => e.field === 'rules')?.message}
                </div>
              )}
              
              {activeCampaign.rules.length === 0 ? (
                <div className="text-center py-16">
                  <Percent className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                  <p className="text-slate-500 mb-2">还没有添加任何促销规则</p>
                  <p className="text-sm text-slate-400">点击上方按钮添加满减、折扣或赠品规则</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {activeCampaign.rules.map((rule, index) => (
                    <div key={rule.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 animate-in fade-in">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <span className="w-8 h-8 bg-[#1e3a5f] text-white rounded-lg flex items-center justify-center text-sm font-bold">
                            {index + 1}
                          </span>
                          <span className="font-medium text-slate-800">
                            {rule.type === 'fullReduce' && '满减规则'}
                            {rule.type === 'discount' && '折扣规则'}
                            {rule.type === 'gift' && '赠品规则'}
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveRule(rule.id)}
                          className="text-red-500 hover:text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>

                      {rule.type === 'fullReduce' && (
                        <div className="grid grid-cols-3 gap-4">
                          <Input
                            label="满(元)"
                            type="number"
                            value={rule.condition.minAmount || ''}
                            onChange={(e) => handleUpdateRule(rule.id, {
                              condition: { ...rule.condition, minAmount: Number(e.target.value) }
                            })}
                          />
                          <Input
                            label="减(元)"
                            type="number"
                            value={rule.benefit.reduceAmount || ''}
                            onChange={(e) => handleUpdateRule(rule.id, {
                              benefit: { ...rule.benefit, reduceAmount: Number(e.target.value) }
                            })}
                          />
                          <div className="flex items-end">
                            <span className="text-sm text-slate-500">
                              满 {rule.condition.minAmount || 0} 减 {rule.benefit.reduceAmount || 0}
                            </span>
                          </div>
                        </div>
                      )}

                      {rule.type === 'discount' && (
                        <div className="grid grid-cols-2 gap-4">
                          <Input
                            label="折扣率(0-1)"
                            type="number"
                            step="0.01"
                            min="0"
                            max="1"
                            value={rule.benefit.discountRate || ''}
                            onChange={(e) => handleUpdateRule(rule.id, {
                              benefit: { ...rule.benefit, discountRate: Number(e.target.value) }
                            })}
                          />
                          <div className="flex items-end">
                            <span className="text-sm text-slate-500">
                              {rule.benefit.discountRate ? `${(rule.benefit.discountRate * 10).toFixed(1)} 折` : '请输入折扣率'}
                            </span>
                          </div>
                        </div>
                      )}

                      {rule.type === 'gift' && (
                        <div className="grid grid-cols-3 gap-4">
                          <Input
                            label="购买数量 ≥"
                            type="number"
                            value={rule.condition.minQuantity || ''}
                            onChange={(e) => handleUpdateRule(rule.id, {
                              condition: { ...rule.condition, minQuantity: Number(e.target.value) }
                            })}
                          />
                          <Select
                            label="选择赠品"
                            value={rule.benefit.giftProductId || ''}
                            onChange={(e) => handleUpdateRule(rule.id, {
                              benefit: { ...rule.benefit, giftProductId: e.target.value }
                            })}
                            options={products.map(p => ({ value: p.id, label: p.name }))}
                          />
                          <Input
                            label="赠送数量"
                            type="number"
                            value={rule.benefit.giftQuantity || ''}
                            onChange={(e) => handleUpdateRule(rule.id, {
                              benefit: { ...rule.benefit, giftQuantity: Number(e.target.value) }
                            })}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card.Body>
            <Card.Footer className="flex justify-between">
              <Button variant="secondary" onClick={() => setCurrentStep(0)}>
                上一步
              </Button>
              <Button onClick={() => setCurrentStep(2)} className="gap-2">
                下一步
                <ChevronRight className="w-4 h-4" />
              </Button>
            </Card.Footer>
          </div>
        )}

        {currentStep === 2 && (
          <div className="space-y-6">
            <Card.Header className="flex items-center justify-between">
              <Card.Title>活动商品清单</Card.Title>
              <Button variant="secondary" onClick={() => setShowProductPicker(true)} className="gap-2">
                <Plus className="w-4 h-4" />
                添加商品
              </Button>
            </Card.Header>
            <Card.Body className="p-0">
              {errors.find(e => e.field === 'products') && (
                <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                  {errors.find(e => e.field === 'products')?.message}
                </div>
              )}
              
              {campaignProducts.length === 0 ? (
                <div className="text-center py-16">
                  <ShoppingCart className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                  <p className="text-slate-500 mb-2">还没有添加任何商品</p>
                  <p className="text-sm text-slate-400">点击上方按钮从商品池选择商品</p>
                </div>
              ) : (
                <Table>
                  <Table.Header>
                    <tr>
                      <th className="px-4 py-3">商品</th>
                      <th className="px-4 py-3">原价</th>
                      <th className="px-4 py-3">活动价</th>
                      <th className="px-4 py-3">优惠力度</th>
                      <th className="px-4 py-3">库存</th>
                      <th className="px-4 py-3">操作</th>
                    </tr>
                  </Table.Header>
                  <Table.Body>
                    {campaignProducts.map((product, index) => {
                      const activityPrice = calculateActivityPrice(product.salePrice, activeCampaign.rules);
                      const discount = Math.round((1 - activityPrice / product.salePrice) * 100);
                      return (
                        <Table.Row key={product.id} className="animate-in fade-in" style={{ animationDelay: `${index * 30}ms` }}>
                          <Table.Cell>
                            <div className="flex items-center gap-3">
                              <img
                                src={product.imageUrl}
                                alt={product.name}
                                className="w-10 h-10 rounded-lg object-cover bg-slate-100"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="%23cbd5e1" stroke-width="2"%3E%3Crect x="3" y="3" width="18" height="18" rx="2" ry="2"%3E%3C/rect%3E%3Ccircle cx="8.5" cy="8.5" r="1.5"%3E%3C/circle%3E%3Cpolyline points="21 15 16 10 5 21"%3E%3C/polyline%3E%3C/svg%3E';
                                }}
                              />
                              <div>
                                <p className="font-medium text-slate-800">{product.name}</p>
                                <p className="text-xs text-slate-500">SKU: {product.sku}</p>
                              </div>
                            </div>
                          </Table.Cell>
                          <Table.Cell className="text-slate-500 line-through">
                            {formatCurrency(product.salePrice)}
                          </Table.Cell>
                          <Table.Cell className="font-bold text-red-500">
                            {formatCurrency(activityPrice)}
                          </Table.Cell>
                          <Table.Cell>
                            <Badge variant="danger">{discount}% OFF</Badge>
                          </Table.Cell>
                          <Table.Cell>
                            <span className={cn(
                              'font-medium',
                              product.stock <= 50 ? 'text-red-600' : 'text-slate-700'
                            )}>
                              {product.stock}
                            </span>
                          </Table.Cell>
                          <Table.Cell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeProductFromCampaign(activeCampaign.id, product.id)}
                              className="text-red-500 hover:text-red-600 hover:bg-red-50"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </Table.Cell>
                        </Table.Row>
                      );
                    })}
                  </Table.Body>
                </Table>
              )}
            </Card.Body>
            <Card.Footer className="flex justify-between">
              <Button variant="secondary" onClick={() => setCurrentStep(1)}>
                上一步
              </Button>
              <Button onClick={() => setCurrentStep(3)} className="gap-2">
                下一步
                <ChevronRight className="w-4 h-4" />
              </Button>
            </Card.Footer>
          </div>
        )}

        {currentStep === 3 && (
          <div className="space-y-6">
            <Card.Header>
              <Card.Title>活动预览</Card.Title>
            </Card.Header>
            <Card.Body className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-slate-500 mb-1">活动名称</p>
                  <p className="font-medium text-slate-800">{activeCampaign.name || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500 mb-1">活动类型</p>
                  <p className="font-medium text-slate-800">{activeCampaign.type || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500 mb-1">开始时间</p>
                  <p className="font-medium text-slate-800">{formatDate(activeCampaign.startTime)}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500 mb-1">结束时间</p>
                  <p className="font-medium text-slate-800">{formatDate(activeCampaign.endTime)}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500 mb-1">商品数量</p>
                  <p className="font-medium text-slate-800">{activeCampaign.productIds.length} 个</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500 mb-1">促销规则</p>
                  <p className="font-medium text-slate-800">{activeCampaign.rules.length} 条</p>
                </div>
              </div>

              {activeCampaign.rules.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-slate-700 mb-3">促销规则详情</p>
                  <div className="space-y-2">
                    {activeCampaign.rules.map((rule, index) => (
                      <div key={rule.id} className="p-3 bg-slate-50 rounded-lg">
                        {rule.type === 'fullReduce' && (
                          <span>满 {rule.condition.minAmount} 元减 {rule.benefit.reduceAmount} 元</span>
                        )}
                        {rule.type === 'discount' && (
                          <span>全场 {(rule.benefit.discountRate || 0) * 10} 折</span>
                        )}
                        {rule.type === 'gift' && (
                          <span>买 {rule.condition.minQuantity} 件送 {products.find(p => p.id === rule.benefit.giftProductId)?.name} x{rule.benefit.giftQuantity}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeCampaign.reviewComment && (
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm font-medium text-blue-700 mb-1">审核意见</p>
                  <p className="text-sm text-blue-600">{activeCampaign.reviewComment}</p>
                </div>
              )}

              {groupedStatusHistory.length > 1 && (
                <div>
                  <p className="text-sm font-medium text-slate-700 mb-3">审核历史预览</p>
                  <div className="space-y-3">
                    {groupedStatusHistory.slice(0, -1).map((group) => {
                      const lastItem = group.items[group.items.length - 1];
                      const isRejected = lastItem?.status === 'rejected';
                      return (
                        <div 
                          key={group.submissionId} 
                          className={cn(
                            'p-3 rounded-lg border',
                            isRejected ? 'bg-red-50 border-red-200' : 'bg-emerald-50 border-emerald-200'
                          )}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className={cn(
                              'text-sm font-medium',
                              isRejected ? 'text-red-700' : 'text-emerald-700'
                            )}>
                              第 {group.roundNumber} 轮审核
                            </span>
                            <Badge variant={isRejected ? 'danger' : 'success'} size="sm">
                              {isRejected ? '已驳回' : '已通过'}
                            </Badge>
                          </div>
                          {lastItem?.comment && (
                            <p className={cn(
                              'text-sm',
                              isRejected ? 'text-red-600' : 'text-emerald-600'
                            )}>
                              {lastItem.comment}
                            </p>
                          )}
                          <p className="text-xs text-slate-500 mt-2">
                            {formatDateTime(lastItem?.changedAt || '')} · {lastItem?.operator}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </Card.Body>
            <Card.Footer className="flex justify-between">
              <Button variant="secondary" onClick={() => setCurrentStep(2)}>
                上一步
              </Button>
              <div className="flex items-center gap-3">
                <Button variant="outline" onClick={handleGoToPriceCheck} className="gap-2">
                  <TrendingUp className="w-4 h-4" />
                  价格校验
                </Button>
                {activeCampaign.status === 'draft' && (
                  <Button onClick={handleSubmitForReview} className="gap-2">
                    <Check className="w-4 h-4" />
                    提交审核
                  </Button>
                )}
              </div>
            </Card.Footer>
          </div>
        )}
      </Card>

      <Modal
        isOpen={showProductPicker}
        onClose={() => setShowProductPicker(false)}
        title="选择商品"
        size="xl"
      >
        <div className="space-y-4">
          <Input icon="search" placeholder="搜索商品..." />
          <div className="max-h-96 overflow-y-auto space-y-2">
            {products.slice(0, 20).map(product => {
              const isSelected = activeCampaign.productIds.includes(product.id);
              return (
                <div
                  key={product.id}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all',
                    isSelected ? 'border-[#1e3a5f] bg-blue-50' : 'border-transparent hover:bg-slate-50'
                  )}
                  onClick={() => {
                    if (isSelected) {
                      removeProductFromCampaign(activeCampaign.id, product.id);
                    } else {
                      addProductsToCampaign(activeCampaign.id, [product.id]);
                    }
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    readOnly
                    className="w-4 h-4 rounded border-slate-300 text-[#1e3a5f]"
                  />
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="w-10 h-10 rounded-lg object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="%23cbd5e1" stroke-width="2"%3E%3Crect x="3" y="3" width="18" height="18" rx="2" ry="2"%3E%3C/rect%3E%3Ccircle cx="8.5" cy="8.5" r="1.5"%3E%3C/circle%3E%3Cpolyline points="21 15 16 10 5 21"%3E%3C/polyline%3E%3C/svg%3E';
                    }}
                  />
                  <div className="flex-1">
                    <p className="font-medium text-slate-800">{product.name}</p>
                    <p className="text-xs text-slate-500">库存: {product.stock} | 售价: {formatCurrency(product.salePrice)}</p>
                  </div>
                  {isSelected && <Check className="w-5 h-5 text-[#1e3a5f]" />}
                </div>
              );
            })}
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <Button variant="secondary" onClick={() => setShowProductPicker(false)}>
              取消
            </Button>
            <Button onClick={() => setShowProductPicker(false)}>
              确认选择 ({activeCampaign.productIds.length})
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        title="审核活动"
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              审核意见
            </label>
            <textarea
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f] min-h-[120px]"
              placeholder="请输入审核意见..."
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <Button variant="secondary" onClick={() => setShowReviewModal(false)}>
              取消
            </Button>
            <Button variant="danger" onClick={() => handleReview(false)} className="gap-2">
              <XCircle className="w-4 h-4" />
              驳回
            </Button>
            <Button variant="success" onClick={() => handleReview(true)} className="gap-2">
              <CheckCircle2 className="w-4 h-4" />
              通过
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showValidationModal}
        onClose={() => setShowValidationModal(false)}
        title="提交校验未通过"
        size="lg"
      >
        <div className="space-y-4">
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-amber-700">请修正以下问题后再提交</p>
              <p className="text-sm text-amber-600 mt-1">共 {validationErrors.length} 项错误需要处理</p>
            </div>
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {validationErrors.map((error, index) => (
              <div key={index} className="flex items-start gap-3 p-3 bg-red-50 border border-red-100 rounded-lg">
                <XCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-700">{error.field}</p>
                  <p className="text-sm text-red-600">{error.message}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <Button variant="secondary" onClick={() => setShowValidationModal(false)}>
              我知道了
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
