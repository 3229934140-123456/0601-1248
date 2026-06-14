import type { Product, PromotionRule, PriceCheckResult } from '@/types';

export const calculateActivityPrice = (
  originalPrice: number,
  rules: PromotionRule[]
): number => {
  let finalPrice = originalPrice;

  const discountRule = rules.find(r => r.type === 'discount');
  if (discountRule && discountRule.benefit.discountRate) {
    finalPrice = Math.round(originalPrice * discountRule.benefit.discountRate * 100) / 100;
  }

  const fullReduceRules = rules
    .filter(r => r.type === 'fullReduce' && r.condition.minAmount && r.benefit.reduceAmount)
    .sort((a, b) => (b.condition.minAmount || 0) - (a.condition.minAmount || 0));

  for (const rule of fullReduceRules) {
    if (originalPrice >= (rule.condition.minAmount || 0)) {
      finalPrice = Math.max(0, finalPrice - (rule.benefit.reduceAmount || 0));
      break;
    }
  }

  return finalPrice;
};

export const calculatePriceWithCoupons = (
  activityPrice: number,
  couponStack: boolean = true
): number => {
  if (!couponStack) return activityPrice;
  
  const platformCoupon = activityPrice >= 200 ? 20 : 0;
  const shopCoupon = activityPrice >= 100 ? 10 : 0;
  
  return Math.max(0, activityPrice - platformCoupon - shopCoupon);
};

export const runPriceCheck = (
  products: Product[],
  rules: PromotionRule[]
): PriceCheckResult[] => {
  return products.map(product => {
    const activityPrice = calculateActivityPrice(product.salePrice, rules);
    const finalPriceWithCoupons = calculatePriceWithCoupons(activityPrice, true);
    const belowCost = finalPriceWithCoupons <= product.costPrice;
    const couponStackRisk = activityPrice > product.costPrice && finalPriceWithCoupons <= product.costPrice;
    
    let riskLevel: 'high' | 'medium' | 'low' = 'low';
    const suggestions: string[] = [];

    if (belowCost) {
      riskLevel = 'high';
      suggestions.push('活动价低于成本价，存在亏损风险');
      suggestions.push(`建议提高活动价至 ${(product.costPrice * 1.1).toFixed(2)} 元以上`);
    } else if (couponStackRisk) {
      riskLevel = 'medium';
      suggestions.push('优惠券叠加后价格低于成本价');
      suggestions.push('建议设置优惠券使用门槛或限制叠加');
    } else if (activityPrice < product.costPrice * 1.2) {
      riskLevel = 'low';
      suggestions.push('活动利润率偏低，建议关注销量预期');
    }

    if (rules.some(r => r.type === 'gift')) {
      suggestions.push('赠品活动需额外核算赠品成本');
    }

    return {
      productId: product.id,
      productName: product.name,
      originalPrice: product.salePrice,
      activityPrice,
      costPrice: product.costPrice,
      belowCost,
      couponStackRisk,
      finalPriceWithCoupons,
      riskLevel,
      suggestions,
    };
  });
};

export const formatCurrency = (amount: number): string => {
  return `¥${amount.toFixed(2)}`;
};

export const formatPercent = (value: number): string => {
  return `${value.toFixed(1)}%`;
};
