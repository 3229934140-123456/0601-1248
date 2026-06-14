import type { ImportValidationError, PromotionRule } from '@/types';

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

export const validateCampaign = (
  data: {
    name: string;
    startTime: string;
    endTime: string;
    productIds: string[];
    rules: PromotionRule[];
  },
  mode: 'save' | 'submit' = 'save'
): ValidationError[] => {
  const errors: ValidationError[] = [];

  if (!validateRequired(data.name) || data.name.trim().length < 2) {
    errors.push({ field: 'name', message: '活动名称至少2个字符' });
  }

  if (!validateRequired(data.startTime)) {
    errors.push({ field: 'startTime', message: '活动开始时间不能为空' });
  }
  if (!validateRequired(data.endTime)) {
    errors.push({ field: 'endTime', message: '活动结束时间不能为空' });
  }
  if (data.startTime && data.endTime) {
    const start = new Date(data.startTime);
    const end = new Date(data.endTime);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (start < today) {
      errors.push({ field: 'startTime', message: '活动开始时间不能早于今天' });
    }
    if (end <= start) {
      errors.push({ field: 'date', message: '活动结束时间必须晚于开始时间' });
    }
  }

  if (mode === 'submit') {
    if (data.productIds.length === 0) {
      errors.push({ field: 'products', message: '请至少选择一个商品' });
    }
    if (data.rules.length === 0) {
      errors.push({ field: 'rules', message: '请至少设置一条促销规则' });
    }
  }

  data.rules.forEach((rule, index) => {
    if (rule.type === 'discount' && rule.benefit.discountRate !== undefined) {
      if (rule.benefit.discountRate < 0.1 || rule.benefit.discountRate > 0.95) {
        errors.push({ field: `rule_${index}`, message: `第${index + 1}条折扣规则无效：折扣率必须在0.1-0.95之间` });
      }
    }
    if (rule.type === 'fullReduce' && rule.condition.minAmount !== undefined && rule.benefit.reduceAmount !== undefined) {
      if (rule.condition.minAmount <= rule.benefit.reduceAmount) {
        errors.push({ field: `rule_${index}`, message: `第${index + 1}条满减规则无效：满减金额必须小于门槛金额` });
      }
    }
    if (rule.type === 'gift') {
      if (rule.condition.minQuantity === undefined || rule.condition.minQuantity < 1) {
        errors.push({ field: `rule_${index}`, message: `第${index + 1}条赠品规则无效：最小购买数量至少为1` });
      }
      if (rule.benefit.giftQuantity === undefined || rule.benefit.giftQuantity < 1) {
        errors.push({ field: `rule_${index}`, message: `第${index + 1}条赠品规则无效：赠品数量至少为1` });
      }
    }
  });

  return errors;
};

export const validateImportRow = (
  row: Record<string, string>,
  rowIndex: number
): ImportValidationError[] => {
  const errors: ImportValidationError[] = [];
  if (!row.name || row.name.trim().length < 2) {
    errors.push({ row: rowIndex, field: 'name', message: '商品名称至少2个字符', value: row.name });
  }
  if (!row.sku || row.sku.trim().length < 2) {
    errors.push({ row: rowIndex, field: 'sku', message: 'SKU 至少2个字符', value: row.sku });
  }
  if (row.stock && (!Number.isInteger(Number(row.stock)) || Number(row.stock) < 0)) {
    errors.push({ row: rowIndex, field: 'stock', message: '库存必须是非负整数', value: row.stock });
  }
  if (row.costPrice && Number(row.costPrice) <= 0) {
    errors.push({ row: rowIndex, field: 'costPrice', message: '成本价必须大于0', value: row.costPrice });
  }
  if (row.salePrice && row.costPrice && Number(row.salePrice) < Number(row.costPrice)) {
    errors.push({ row: rowIndex, field: 'salePrice', message: '售价不能低于成本价', value: row.salePrice });
  }
  return errors;
};
