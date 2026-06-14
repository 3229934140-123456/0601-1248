import type { Product, Shop } from '@/types';

export const mockShops: Shop[] = [
  { id: 'shop1', name: '优品生活馆', platform: 'taobao', status: 'active' },
  { id: 'shop2', name: '京东自营旗舰店', platform: 'jd', status: 'active' },
  { id: 'shop3', name: '拼多多特惠店', platform: 'pdd', status: 'active' },
  { id: 'shop4', name: '抖音直播间', platform: 'douyin', status: 'active' },
];

const categories = ['电子产品', '家居用品', '服装配饰', '美妆护肤', '食品饮料', '母婴用品'];
const productNames = [
  '无线蓝牙耳机 Pro',
  '智能手表 S5',
  '便携充电宝 20000mAh',
  '纯棉T恤 夏季新款',
  '真皮商务钱包',
  '防晒隔离霜 SPF50',
  '保湿精华液 50ml',
  '进口坚果礼盒',
  '有机婴儿奶粉 3段',
  '儿童益智积木',
  '北欧风台灯',
  '记忆棉枕头',
  '多功能料理锅',
  '空气炸锅 5L',
  '运动跑鞋 减震款',
  '瑜伽垫 加厚10mm',
  '不锈钢保温杯',
  '全自动雨伞',
  '香薰蜡烛套装',
  '桌面收纳盒',
];

export const generateMockProducts = (count: number = 50): Product[] => {
  const products: Product[] = [];
  
  for (let i = 1; i <= count; i++) {
    const shop = mockShops[Math.floor(Math.random() * mockShops.length)];
    const category = categories[Math.floor(Math.random() * categories.length)];
    const name = productNames[Math.floor(Math.random() * productNames.length)];
    const costPrice = Math.floor(Math.random() * 500) + 20;
    const salePrice = Math.floor(costPrice * (1 + Math.random() * 1.5));
    const grossMargin = Math.round(((salePrice - costPrice) / salePrice) * 100);
    
    products.push({
      id: `prod-${i}`,
      sku: `SKU-${String(i).padStart(6, '0')}`,
      name: name,
      category: category,
      shopId: shop.id,
      shopName: shop.name,
      stock: Math.floor(Math.random() * 2000) + 10,
      costPrice: costPrice,
      salePrice: salePrice,
      grossMargin: grossMargin,
      imageUrl: `https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=${encodeURIComponent(name + ' product photo white background')}&image_size=square`,
      createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
    });
  }
  
  return products;
};

export const mockProducts = generateMockProducts(50);
