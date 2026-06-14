export const validateRequired = (value: string | number | undefined): boolean => {
  if (value === undefined || value === null) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (typeof value === 'number') return !isNaN(value);
  return true;
};

export const validatePositiveNumber = (value: number): boolean => {
  return !isNaN(value) && value > 0;
};

export const validateDateRange = (startDate: string, endDate: string): boolean => {
  if (!startDate || !endDate) return false;
  return new Date(startDate) <= new Date(endDate);
};

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePhone = (phone: string): boolean => {
  const phoneRegex = /^1[3-9]\d{9}$/;
  return phoneRegex.test(phone);
};

export const validateDiscountRate = (rate: number): boolean => {
  return !isNaN(rate) && rate > 0 && rate <= 1;
};

export const validateFullReduce = (minAmount: number, reduceAmount: number): boolean => {
  return !isNaN(minAmount) && !isNaN(reduceAmount) && minAmount > 0 && reduceAmount > 0 && reduceAmount < minAmount;
};

export interface ValidationError {
  field: string;
  message: string;
}

export const validateCampaign = (data: {
  name: string;
  startTime: string;
  endTime: string;
  productIds: string[];
  rules: Array<{ condition: { minAmount?: number }; benefit: { reduceAmount?: number; discountRate?: number } }>;
}): ValidationError[] => {
  const errors: ValidationError[] = [];

  if (!validateRequired(data.name)) {
    errors.push({ field: 'name', message: '活动名称不能为空' });
  }

  if (!validateDateRange(data.startTime, data.endTime)) {
    errors.push({ field: 'date', message: '活动结束时间必须晚于开始时间' });
  }

  if (data.productIds.length === 0) {
    errors.push({ field: 'products', message: '请至少选择一个商品' });
  }

  if (data.rules.length === 0) {
    errors.push({ field: 'rules', message: '请至少设置一条促销规则' });
  }

  data.rules.forEach((rule, index) => {
    if (rule.condition.minAmount !== undefined && rule.benefit.reduceAmount !== undefined) {
      if (!validateFullReduce(rule.condition.minAmount, rule.benefit.reduceAmount)) {
        errors.push({ field: `rule_${index}`, message: `第${index + 1}条满减规则无效：满减金额必须小于门槛金额` });
      }
    }
    if (rule.benefit.discountRate !== undefined) {
      if (!validateDiscountRate(rule.benefit.discountRate)) {
        errors.push({ field: `rule_${index}`, message: `第${index + 1}条折扣规则无效：折扣率必须在0-1之间` });
      }
    }
  });

  return errors;
};
