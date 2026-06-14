import type { Product, PromotionRule, PriceCheckResult, ProcessingStatus } from '@/types';

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

    // 活动价低于成本（直接定价错误）
    const activityBelowCost = activityPrice <= product.costPrice;
    // 叠券后低于成本（但活动价本身没亏本）
    const couponBelowCost = activityPrice > product.costPrice && finalPriceWithCoupons <= product.costPrice;

    // belowCost: 任何方式低于成本，保留兼容
    const belowCost = activityBelowCost || couponBelowCost;
    const couponStackRisk = couponBelowCost;

    const activityMargin = activityPrice > 0
      ? ((activityPrice - product.costPrice) / activityPrice) * 100
      : -100;
    const finalMargin = finalPriceWithCoupons > 0
      ? ((finalPriceWithCoupons - product.costPrice) / finalPriceWithCoupons) * 100
      : -100;

    const riskCategories: import('@/types').RiskCategory[] = [];
    if (activityBelowCost) riskCategories.push('below_cost');
    if (couponBelowCost) riskCategories.push('coupon_below_cost');

    let riskLevel: 'high' | 'medium' | 'low' = 'low';
    const suggestions: string[] = [];

    if (activityBelowCost) {
      riskLevel = 'high';
      suggestions.push(`活动价 ${activityPrice.toFixed(2)} 元 低于成本 ${product.costPrice.toFixed(2)} 元，存在直接亏损`);
      suggestions.push(`⚠ 调整建议：将活动价上调至 ${(product.costPrice * 1.1).toFixed(2)} 元以上，或降低采购成本`);
    } else {
      suggestions.push(`活动价毛利正常，利润率为 ${activityMargin.toFixed(1)}%`);
    }

    if (couponBelowCost) {
      riskLevel = riskLevel === 'high' ? 'high' : 'medium';
      suggestions.push(`叠券后价 ${finalPriceWithCoupons.toFixed(2)} 元 低于成本，实际成交会亏损`);
      suggestions.push(`⚠ 调整建议：限制优惠券叠加使用，或提高满减门槛至 ${(product.costPrice + 60).toFixed(0)} 元档`);
    } else if (!activityBelowCost && finalMargin < 10) {
      riskCategories.push('low_margin');
      riskLevel = 'low';
      suggestions.push(`叠券后利润率仅 ${finalMargin.toFixed(1)}%，偏低`);
    }

    if (riskCategories.length === 0) {
      riskCategories.push('safe');
      suggestions.push('价格校验通过，无亏损风险');
    }

    if (rules.some(r => r.type === 'gift')) {
      suggestions.push('赠品活动需额外核算赠品成本，可能影响实际毛利');
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
      activityMargin,
      finalMargin,
      riskCategories,
      riskLevel,
      suggestions,
      processingStatus: 'pending' as ProcessingStatus,
    };
  });
};

export const formatCurrency = (amount: number): string => {
  return `¥${amount.toFixed(2)}`;
};

export const formatPercent = (value: number): string => {
  return `${value.toFixed(1)}%`;
};
