import type { Campaign, PromotionRule } from '@/types';

const generateId = () => Math.random().toString(36).substring(2, 9);

const campaignTypes = ['618大促', '双11狂欢', '新品上市', '清仓甩卖', '会员专享', '节日特惠'];

export const mockCampaigns: Campaign[] = [
  {
    id: 'camp-1',
    name: '618年中大促 - 电子产品专场',
    type: '618大促',
    status: 'active',
    startTime: '2026-06-15T00:00:00',
    endTime: '2026-06-20T23:59:59',
    productIds: ['prod-1', 'prod-2', 'prod-3', 'prod-11', 'prod-14'],
    rules: [
      {
        id: generateId(),
        type: 'fullReduce',
        condition: { minAmount: 299 },
        benefit: { reduceAmount: 50 },
      },
      {
        id: generateId(),
        type: 'fullReduce',
        condition: { minAmount: 599 },
        benefit: { reduceAmount: 120 },
      },
    ],
    reviewComment: '活动力度合理，审核通过',
    createdAt: '2026-06-01T10:00:00',
    updatedAt: '2026-06-10T15:30:00',
  },
  {
    id: 'camp-2',
    name: '夏季清仓 - 服装配饰',
    type: '清仓甩卖',
    status: 'pending',
    startTime: '2026-06-25T00:00:00',
    endTime: '2026-06-30T23:59:59',
    productIds: ['prod-4', 'prod-5', 'prod-15', 'prod-16'],
    rules: [
      {
        id: generateId(),
        type: 'discount',
        condition: {},
        benefit: { discountRate: 0.75 },
      },
    ],
    createdAt: '2026-06-12T14:00:00',
    updatedAt: '2026-06-12T14:00:00',
  },
  {
    id: 'camp-3',
    name: '美妆节 - 买二送一',
    type: '节日特惠',
    status: 'approved',
    startTime: '2026-07-01T00:00:00',
    endTime: '2026-07-07T23:59:59',
    productIds: ['prod-6', 'prod-7'],
    rules: [
      {
        id: generateId(),
        type: 'gift',
        condition: { minQuantity: 2 },
        benefit: { giftProductId: 'prod-7', giftQuantity: 1 },
      },
    ],
    reviewComment: '赠品库存充足，可以上线',
    createdAt: '2026-06-08T09:00:00',
    updatedAt: '2026-06-11T11:20:00',
  },
  {
    id: 'camp-4',
    name: '双11预售筹备',
    type: '双11狂欢',
    status: 'draft',
    startTime: '2026-11-01T00:00:00',
    endTime: '2026-11-11T23:59:59',
    productIds: [],
    rules: [],
    createdAt: '2026-06-05T16:00:00',
    updatedAt: '2026-06-05T16:00:00',
  },
  {
    id: 'camp-5',
    name: '母婴用品推广周',
    type: '新品上市',
    status: 'ended',
    startTime: '2026-06-01T00:00:00',
    endTime: '2026-06-07T23:59:59',
    productIds: ['prod-9', 'prod-10'],
    rules: [
      {
        id: generateId(),
        type: 'fullReduce',
        condition: { minAmount: 199 },
        benefit: { reduceAmount: 30 },
      },
    ],
    reviewComment: '完成度不错',
    createdAt: '2026-05-20T10:00:00',
    updatedAt: '2026-06-08T09:00:00',
  },
];

export const generateNewCampaign = (): Partial<Campaign> => {
  return {
    name: '',
    type: campaignTypes[0],
    status: 'draft',
    startTime: new Date().toISOString().split('T')[0],
    endTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    productIds: [],
    rules: [],
  };
};

export const createNewRule = (type: PromotionRule['type']): PromotionRule => {
  return {
    id: generateId(),
    type,
    condition: {},
    benefit: {},
  };
};
