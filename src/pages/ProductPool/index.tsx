import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, Upload, Filter, X, ArrowUpDown, CheckCircle2,
  ChevronLeft, ChevronRight, Layers, TrendingUp
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Table } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { useStore, useFilteredProducts } from '@/store/useStore';
import { formatCurrency } from '@/utils/price';
import { cn } from '@/utils/cn';
import type { Product } from '@/types';

const categories = ['电子产品', '家居用品', '服装配饰', '美妆护肤', '食品饮料', '母婴用品'];

export const ProductPoolPage = () => {
  const navigate = useNavigate();
  const { 
    shops, selectedProductIds, filters, setFilters, resetFilters,
    toggleProductSelection, selectAllProducts, clearSelection
  } = useStore();
  
  const filteredProducts = useFilteredProducts();
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<string>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [showImportModal, setShowImportModal] = useState(false);
  const [importMode, setImportMode] = useState<'upload' | 'paste'>('upload');
  const [importShopId, setImportShopId] = useState('');
  const [pasteData, setPasteData] = useState('');
  const pageSize = 10;

  const handleCreateCampaign = () => {
    const newCampaign = useStore.getState().createCampaign({
      name: '',
      productIds: [...selectedProductIds],
    });
    clearSelection();
    navigate(`/campaigns/${newCampaign.id}`);
  };

  const parseProductsFromText = (text: string): Partial<Product>[] => {
    const lines = text.split('\n').filter(line => line.trim());
    return lines.map(line => {
      const cols = line.split(',').map(c => c.trim());
      return {
        name: cols[0] || '',
        sku: cols[1] || '',
        category: cols[2] || '',
        stock: Number(cols[3]) || 0,
        costPrice: Number(cols[4]) || 0,
        salePrice: Number(cols[5]) || 0,
      };
    });
  };

  const parsedProducts = useMemo(() => {
    if (importMode === 'paste') {
      return parseProductsFromText(pasteData);
    }
    return [];
  }, [importMode, pasteData]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext === 'csv' || ext === 'txt') {
      const buffer = await file.arrayBuffer();
      const text = new TextDecoder('utf-8').decode(buffer);
      setPasteData(text);
      setImportMode('paste');
    }
    e.target.value = '';
  };

  const handleConfirmImport = () => {
    if (!importShopId || parsedProducts.length === 0) return;
    useStore.getState().importProducts(importShopId, parsedProducts as Product[]);
    setShowImportModal(false);
    setImportShopId('');
    setPasteData('');
    setImportMode('upload');
  };

  const sortedProducts = useMemo(() => {
    return [...filteredProducts].sort((a, b) => {
      const aVal = a[sortField as keyof Product] as number | string;
      const bVal = b[sortField as keyof Product] as number | string;
      const compare = typeof aVal === 'number' && typeof bVal === 'number'
        ? aVal - bVal
        : String(aVal).localeCompare(String(bVal));
      return sortDirection === 'asc' ? compare : -compare;
    });
  }, [filteredProducts, sortField, sortDirection]);

  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedProducts.slice(start, start + pageSize);
  }, [sortedProducts, currentPage]);

  const totalPages = Math.ceil(sortedProducts.length / pageSize);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const allSelectedOnPage = paginatedProducts.length > 0 && 
    paginatedProducts.every(p => selectedProductIds.includes(p.id));

  const handleSelectAllPage = () => {
    if (allSelectedOnPage) {
      const pageIds = paginatedProducts.map(p => p.id);
      const newSelection = selectedProductIds.filter(id => !pageIds.includes(id));
      selectAllProducts(newSelection);
    } else {
      const pageIds = paginatedProducts.map(p => p.id);
      selectAllProducts([...new Set([...selectedProductIds, ...pageIds])]);
    }
  };

  const handleAddToCampaign = () => {
    if (selectedProductIds.length === 0) return;
    const newCampaign = useStore.getState().createCampaign({
      name: '',
      productIds: selectedProductIds,
    });
    clearSelection();
    navigate(`/campaigns/${newCampaign.id}`);
  };

  const getMarginColor = (margin: number) => {
    if (margin >= 40) return 'text-emerald-600';
    if (margin >= 20) return 'text-amber-600';
    return 'text-red-600';
  };

  const getStockBadge = (stock: number) => {
    if (stock <= 50) return <Badge variant="danger">库存紧张</Badge>;
    if (stock <= 200) return <Badge variant="warning">库存偏低</Badge>;
    return <Badge variant="success">库存充足</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Layers className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">商品池</h1>
            <p className="text-sm text-slate-500">管理和筛选您的商品，为促销活动选品</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" className="gap-2" onClick={() => setShowImportModal(true)}>
            <Upload className="w-4 h-4" />
            导入商品
          </Button>
          <Button onClick={handleCreateCampaign} className="gap-2">
            <Plus className="w-4 h-4" />
            新建活动
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">商品总数</p>
              <p className="text-2xl font-bold text-slate-800 mt-1">{filteredProducts.length}</p>
            </div>
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Layers className="w-5 h-5 text-blue-600" />
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">已选商品</p>
              <p className="text-2xl font-bold text-slate-800 mt-1">{selectedProductIds.length}</p>
            </div>
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-amber-600" />
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">低库存商品</p>
              <p className="text-2xl font-bold text-red-600 mt-1">
                {filteredProducts.filter(p => p.stock <= 50).length}
              </p>
            </div>
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-red-600" />
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">店铺数量</p>
              <p className="text-2xl font-bold text-slate-800 mt-1">{shops.length}</p>
            </div>
            <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <Card.Header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1">
            <div className="flex-1 max-w-md">
              <Input
                icon="search"
                placeholder="搜索商品名称、SKU..."
                value={filters.search}
                onChange={(e) => setFilters({ search: e.target.value })}
              />
            </div>
            <Button
              variant={showFilters ? 'primary' : 'secondary'}
              className="gap-2"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="w-4 h-4" />
              高级筛选
            </Button>
            {showFilters && (
              <Button variant="ghost" size="sm" onClick={resetFilters}>
                <X className="w-4 h-4 mr-1" />
                重置
              </Button>
            )}
          </div>
        </Card.Header>

        {showFilters && (
          <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-4">
            <Select
              label="店铺"
              value={filters.shopId}
              onChange={(e) => setFilters({ shopId: e.target.value })}
              options={[
                { value: '', label: '全部店铺' },
                ...shops.map(s => ({ value: s.id, label: s.name }))
              ]}
            />
            <Select
              label="商品分类"
              value={filters.category}
              onChange={(e) => setFilters({ category: e.target.value })}
              options={[
                { value: '', label: '全部分类' },
                ...categories.map(c => ({ value: c, label: c }))
              ]}
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="最小库存"
                type="number"
                value={filters.minStock}
                onChange={(e) => setFilters({ minStock: Number(e.target.value) })}
              />
              <Input
                label="最大库存"
                type="number"
                value={filters.maxStock}
                onChange={(e) => setFilters({ maxStock: Number(e.target.value) })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="最低毛利(%)"
                type="number"
                value={filters.minMargin}
                onChange={(e) => setFilters({ minMargin: Number(e.target.value) })}
              />
              <Input
                label="最高毛利(%)"
                type="number"
                value={filters.maxMargin}
                onChange={(e) => setFilters({ maxMargin: Number(e.target.value) })}
              />
            </div>
          </div>
        )}

        <Card.Body className="p-0">
          <Table>
            <Table.Header>
              <tr>
                <th className="px-4 py-3 w-12">
                  <input
                    type="checkbox"
                    checked={allSelectedOnPage}
                    onChange={handleSelectAllPage}
                    className="w-4 h-4 rounded border-slate-300 text-[#1e3a5f] focus:ring-[#1e3a5f]"
                  />
                </th>
                <th className="px-4 py-3 text-left">商品</th>
                <th className="px-4 py-3 text-left">
                  <button
                    className="flex items-center gap-1 hover:text-[#1e3a5f] transition-colors"
                    onClick={() => handleSort('stock')}
                  >
                    库存
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="px-4 py-3 text-left">成本价</th>
                <th className="px-4 py-3 text-left">售价</th>
                <th className="px-4 py-3 text-left">
                  <button
                    className="flex items-center gap-1 hover:text-[#1e3a5f] transition-colors"
                    onClick={() => handleSort('grossMargin')}
                  >
                    毛利率
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="px-4 py-3 text-left">店铺</th>
                <th className="px-4 py-3 text-left">状态</th>
              </tr>
            </Table.Header>
            <Table.Body>
              {paginatedProducts.map((product, index) => (
                <Table.Row
                  key={product.id}
                  selected={selectedProductIds.includes(product.id)}
                  onClick={() => toggleProductSelection(product.id)}
                  className="animate-in fade-in"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <Table.Cell className="w-12">
                    <input
                      type="checkbox"
                      checked={selectedProductIds.includes(product.id)}
                      onChange={(e) => {
                        e.stopPropagation();
                        toggleProductSelection(product.id);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="w-4 h-4 rounded border-slate-300 text-[#1e3a5f] focus:ring-[#1e3a5f]"
                    />
                  </Table.Cell>
                  <Table.Cell>
                    <div className="flex items-center gap-3">
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="w-12 h-12 rounded-lg object-cover bg-slate-100"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="%23cbd5e1" stroke-width="2"%3E%3Crect x="3" y="3" width="18" height="18" rx="2" ry="2"%3E%3C/rect%3E%3Ccircle cx="8.5" cy="8.5" r="1.5"%3E%3C/circle%3E%3Cpolyline points="21 15 16 10 5 21"%3E%3C/polyline%3E%3C/svg%3E';
                        }}
                      />
                      <div>
                        <p className="font-medium text-slate-800">{product.name}</p>
                        <p className="text-xs text-slate-500">SKU: {product.sku}</p>
                      </div>
                    </div>
                  </Table.Cell>
                  <Table.Cell>
                    <span className="font-medium">{product.stock}</span>
                  </Table.Cell>
                  <Table.Cell className="text-slate-500">
                    {formatCurrency(product.costPrice)}
                  </Table.Cell>
                  <Table.Cell className="font-medium text-slate-800">
                    {formatCurrency(product.salePrice)}
                  </Table.Cell>
                  <Table.Cell>
                    <span className={cn('font-semibold', getMarginColor(product.grossMargin))}>
                      {product.grossMargin}%
                    </span>
                  </Table.Cell>
                  <Table.Cell>
                    <span className="text-sm text-slate-600">{product.shopName}</span>
                  </Table.Cell>
                  <Table.Cell>
                    {getStockBadge(product.stock)}
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>

          {paginatedProducts.length === 0 && (
            <div className="py-16 text-center text-slate-500">
              <Layers className="w-12 h-12 mx-auto mb-4 text-slate-300" />
              <p>没有找到匹配的商品</p>
              <p className="text-sm mt-1">请尝试调整筛选条件</p>
            </div>
          )}
        </Card.Body>

        {totalPages > 1 && (
          <Card.Footer className="flex items-center justify-between">
            <p className="text-sm text-slate-500">
              显示 {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, sortedProducts.length)} 条，共 {sortedProducts.length} 条
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let page = i + 1;
                if (totalPages > 5) {
                  if (currentPage <= 3) page = i + 1;
                  else if (currentPage >= totalPages - 2) page = totalPages - 4 + i;
                  else page = currentPage - 2 + i;
                }
                return (
                  <Button
                    key={page}
                    variant={currentPage === page ? 'primary' : 'ghost'}
                    size="sm"
                    onClick={() => setCurrentPage(page)}
                  >
                    {page}
                  </Button>
                );
              })}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </Card.Footer>
        )}
      </Card>

      {selectedProductIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white rounded-xl shadow-2xl border border-slate-200 px-6 py-4 flex items-center gap-4 animate-in slide-in-from-bottom-8 duration-300">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            <span className="font-medium text-slate-700">
              已选择 <span className="text-[#1e3a5f] font-bold">{selectedProductIds.length}</span> 个商品
            </span>
          </div>
          <div className="h-6 w-px bg-slate-200" />
          <Button variant="ghost" size="sm" onClick={clearSelection}>
            取消选择
          </Button>
          <Button onClick={handleAddToCampaign} className="gap-2">
            <Plus className="w-4 h-4" />
            加入活动
          </Button>
        </div>
      )}

      <Modal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        title="导入商品"
        size="xl"
      >
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">选择店铺</label>
            <Select
              value={importShopId}
              onChange={(e) => setImportShopId(e.target.value)}
              options={[
                { value: '', label: '请选择店铺' },
                ...shops.map(s => ({ value: s.id, label: s.name }))
              ]}
            />
          </div>

          <div className="inline-flex rounded-lg bg-slate-100 p-1">
            <button
              onClick={() => setImportMode('upload')}
              className={cn(
                'px-4 py-2 text-sm font-medium rounded-md transition-all',
                importMode === 'upload'
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-600 hover:text-slate-800'
              )}
            >
              上传表格
            </button>
            <button
              onClick={() => setImportMode('paste')}
              className={cn(
                'px-4 py-2 text-sm font-medium rounded-md transition-all',
                importMode === 'paste'
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-600 hover:text-slate-800'
              )}
            >
              粘贴数据
            </button>
          </div>

          {importMode === 'upload' && (
            <div>
              <input
                id="file-upload"
                type="file"
                accept=".csv,.txt,.xlsx"
                onChange={handleFileUpload}
                className="hidden"
              />
              <label
                htmlFor="file-upload"
                className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:border-[#1e3a5f] hover:bg-blue-50/50 transition-all"
              >
                <Upload className="w-10 h-10 text-slate-400 mb-3" />
                <p className="text-sm font-medium text-slate-700">点击或拖拽上传 CSV/Excel 文件</p>
                <p className="text-xs text-slate-500 mt-1">支持 .csv, .txt, .xlsx 格式</p>
              </label>
            </div>
          )}

          {importMode === 'paste' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">粘贴商品数据</label>
              <textarea
                value={pasteData}
                onChange={(e) => setPasteData(e.target.value)}
                rows={10}
                placeholder="每行一个商品，列顺序：商品名称,SKU,分类,库存,成本价,售价"
                className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f] resize-none"
              />
            </div>
          )}

          {parsedProducts.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-slate-700">
                  数据预览（前 5 行，共 {parsedProducts.length} 行）
                </label>
              </div>
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="overflow-x-auto max-h-64 overflow-y-auto">
                  <Table className="min-w-full">
                    <Table.Header className="sticky top-0 bg-slate-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">商品名称</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">SKU</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">分类</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">库存</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">成本价</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">售价</th>
                      </tr>
                    </Table.Header>
                    <Table.Body>
                      {parsedProducts.slice(0, 5).map((p, i) => (
                        <Table.Row key={i}>
                          <Table.Cell className="text-sm">{p.name || '-'}</Table.Cell>
                          <Table.Cell className="text-sm">{p.sku || '-'}</Table.Cell>
                          <Table.Cell className="text-sm">{p.category || '-'}</Table.Cell>
                          <Table.Cell className="text-sm">{p.stock ?? '-'}</Table.Cell>
                          <Table.Cell className="text-sm">{p.costPrice ?? '-'}</Table.Cell>
                          <Table.Cell className="text-sm">{p.salePrice ?? '-'}</Table.Cell>
                        </Table.Row>
                      ))}
                    </Table.Body>
                  </Table>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <Button variant="secondary" onClick={() => setShowImportModal(false)}>
              取消
            </Button>
            <Button
              onClick={handleConfirmImport}
              disabled={!importShopId || parsedProducts.length === 0}
              className="gap-2"
            >
              <Upload className="w-4 h-4" />
              确认导入
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
