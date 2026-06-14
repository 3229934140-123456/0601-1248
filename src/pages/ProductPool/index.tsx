import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, Upload, Filter, X, ArrowUpDown, CheckCircle2,
  ChevronLeft, ChevronRight, Layers, TrendingUp, Check,
  AlertCircle, ArrowRight, Swords
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
import type { Product, ImportColumnMapping, ImportField } from '@/types';

const categories = ['电子产品', '家居用品', '服装配饰', '美妆护肤', '食品饮料', '母婴用品'];

export const ProductPoolPage = () => {
  const navigate = useNavigate();
  const { 
    shops, selectedProductIds, filters, setFilters, resetFilters,
    toggleProductSelection, selectAllProducts, clearSelection,
    processImportFile, confirmImport, resolveImportConflict, resolveAllConflicts,
    importConflicts, importValidationErrors
  } = useStore();
  
  const filteredProducts = useFilteredProducts();
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<string>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [showImportModal, setShowImportModal] = useState(false);
  const [importStep, setImportStep] = useState<1 | 2 | 3 | 4>(1);
  const [importMode, setImportMode] = useState<'upload' | 'paste'>('upload');
  const [importShopId, setImportShopId] = useState('');
  const [pasteData, setPasteData] = useState('');
  const [importColumns, setImportColumns] = useState<ImportColumnMapping[]>([]);
  const [importData, setImportData] = useState<Record<string, string>[]>([]);
  const [importResult, setImportResult] = useState<{ success: number; skipped: number; overwritten: number } | null>(null);
  const pageSize = 10;

  const stepLabels = ['选择文件', '字段映射', '冲突处理', '导入完成'];

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
    } else if (ext === 'xlsx' || ext === 'xls') {
      if (!importShopId) {
        alert('请先选择店铺');
        e.target.value = '';
        return;
      }
      try {
        const result = await processImportFile(file, importShopId);
        setImportColumns(result.columns);
        setImportData(result.data);
        setImportStep(2);
      } catch (err) {
        console.error('文件解析失败:', err);
        alert('文件解析失败，请检查文件格式');
      }
    }
    e.target.value = '';
  };

  const handlePasteImport = () => {
    if (!importShopId || parsedProducts.length === 0) return;
    const columns: ImportColumnMapping[] = [
      { columnIndex: 0, columnName: '商品名称', targetField: 'name' },
      { columnIndex: 1, columnName: 'SKU', targetField: 'sku' },
      { columnIndex: 2, columnName: '分类', targetField: 'category' },
      { columnIndex: 3, columnName: '库存', targetField: 'stock' },
      { columnIndex: 4, columnName: '成本价', targetField: 'costPrice' },
      { columnIndex: 5, columnName: '售价', targetField: 'salePrice' },
    ];
    const data = parsedProducts.map(p => ({
      name: p.name || '',
      sku: p.sku || '',
      category: p.category || '',
      stock: String(p.stock || ''),
      costPrice: String(p.costPrice || ''),
      salePrice: String(p.salePrice || ''),
    }));
    setImportColumns(columns);
    setImportData(data);
    setImportStep(2);
  };

  const handleConfirmImport = () => {
    if (!importShopId || importData.length === 0) return;
    
    const conflictsWithResolution = importConflicts.map(c => ({
      ...c,
      resolution: c.resolution === 'pending' ? 'skip' as const : c.resolution as 'skip' | 'overwrite',
    }));
    
    const mappedData = importData.map(row => {
      const mapped: Record<string, string> = {};
      importColumns.forEach(col => {
        if (col.targetField !== 'ignore') {
          mapped[col.targetField] = row[col.columnName] || row[col.targetField] || '';
        }
      });
      return mapped;
    });

    const skippedCount = conflictsWithResolution.filter(c => c.resolution === 'skip').length;
    const overwrittenCount = conflictsWithResolution.filter(c => c.resolution === 'overwrite').length;
    
    const result = confirmImport(importShopId, mappedData, conflictsWithResolution, importColumns);
    
    setImportResult({
      success: result.length - overwrittenCount,
      skipped: skippedCount,
      overwritten: overwrittenCount,
    });
    setImportStep(4);
  };

  const handleColumnMappingChange = (columnIndex: number, targetField: ImportField) => {
    setImportColumns(prev => prev.map(col => 
      col.columnIndex === columnIndex ? { ...col, targetField } : col
    ));
  };

  const requiredFieldsMapped = useMemo(() => {
    const fields = importColumns.map(c => c.targetField);
    return fields.includes('name') && fields.includes('sku');
  }, [importColumns]);

  const hasValidationErrors = useMemo(() => {
    return importValidationErrors.length > 0;
  }, [importValidationErrors]);



  const getSampleData = (columnIndex: number) => {
    return importData.slice(0, 3).map(row => row[importColumns[columnIndex]?.columnName] || row[importColumns[columnIndex]?.targetField] || '').filter(Boolean);
  };

  const resetImportState = () => {
    setImportStep(1);
    setImportColumns([]);
    setImportData([]);
    setImportResult(null);
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
        onClose={() => {
          setShowImportModal(false);
          resetImportState();
        }}
        title="导入商品"
        size="xl"
      >
        <div className="space-y-5">
          <div className="flex items-center justify-between mb-6">
            {stepLabels.map((label, index) => (
            <div key={label} className="flex items-center">
              <div className="flex flex-col items-center">
                <div className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all',
                  importStep > index + 1
                    ? 'bg-emerald-500 text-white'
                    : importStep === index + 1
                      ? 'bg-[#1e3a5f] text-white ring-4 ring-blue-100'
                      : 'bg-slate-200 text-slate-500'
                )}>
                  {importStep > index + 1 ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    index + 1
                  )}
                </div>
                <span className={cn(
                  'text-xs mt-2 font-medium',
                  importStep >= index + 1 ? 'text-[#1e3a5f]' : 'text-slate-400'
                )}>
                  {label}
                </span>
              </div>
              {index < 3 && (
                <div className={cn(
                  'w-16 h-1 mx-2 rounded',
                  importStep > index + 1 ? 'bg-emerald-500' : 'bg-slate-200'
                )} />
              )}
            </div>
          ))}
          </div>

          {importStep === 1 && (
            <>
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

              {parsedProducts.length > 0 && importMode === 'paste' && (
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
                <Button variant="secondary" onClick={() => {
                  setShowImportModal(false);
                  resetImportState();
                }}>
                  取消
                </Button>
                <Button
                  onClick={handlePasteImport}
                  disabled={!importShopId || (importMode === 'paste' && parsedProducts.length === 0)}
                  className="gap-2"
                >
                  下一步
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </>
          )}

          {importStep === 2 && (
            <>
              <div>
                <h3 className="text-lg font-semibold text-slate-800 mb-2">字段映射</h3>
                <p className="text-sm text-slate-500 mb-4">
                  请确认每列数据对应的目标字段，系统已自动识别，您可以手动调整。
                </p>
              </div>

              <div className="space-y-3 max-h-96 overflow-y-auto">
                {importColumns.map((col, index) => {
                  const samples = getSampleData(index);
                  return (
                    <div key={col.columnIndex} className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
                      <div className="flex-1">
                        <p className="font-medium text-slate-800">{col.columnName}</p>
                        <p className="text-xs text-slate-500 mt-1">
                          示例: {samples.join(', ') || '-'}
                        </p>
                      </div>
                      <div className="w-48">
                        <Select
                          value={col.targetField}
                          onChange={(e) => handleColumnMappingChange(col.columnIndex, e.target.value as ImportField)}
                          options={[
                            { value: 'name', label: '商品名称' },
                            { value: 'sku', label: 'SKU' },
                            { value: 'category', label: '分类' },
                            { value: 'stock', label: '库存' },
                            { value: 'costPrice', label: '成本价' },
                            { value: 'salePrice', label: '售价' },
                            { value: 'imageUrl', label: '图片URL' },
                            { value: 'ignore', label: '忽略此列' },
                          ]}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {!requiredFieldsMapped && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                  <span className="text-sm text-red-600">
                    必填字段校验失败：商品名称和 SKU 必须有映射
                  </span>
                </div>
              )}

              <div className="flex justify-between pt-4 border-t border-slate-200">
                <Button variant="secondary" onClick={() => setImportStep(1)}>
                  上一步
                </Button>
                <Button
                  onClick={() => setImportStep(3)}
                  disabled={!requiredFieldsMapped}
                  className="gap-2"
                >
                  下一步
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </>
          )}

          {importStep === 3 && (
            <>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-800">冲突处理 & 校验</h3>
                {hasValidationErrors && (
                  <Badge variant="danger">
                    {importValidationErrors.length} 条校验错误
                  </Badge>
                )}
              </div>

              {hasValidationErrors && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-slate-700 mb-2">校验错误</h4>
                  <div className="border border-red-200 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                    {importValidationErrors.map((error, index) => (
                      <div key={index} className="p-3 bg-red-50 border-b border-red-100 last:border-b-0">
                        <div className="flex items-start gap-3">
                          <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                          <div className="flex-1">
                            <div className="flex items-center gap-2 text-sm">
                              <span className="font-medium text-red-700">行 {error.row}</span>
                              <span className="text-red-600">·</span>
                              <span className="text-red-600">{error.field}</span>
                            </div>
                            <p className="text-sm text-red-600 mt-1">{error.message}</p>
                            {error.value && (
                              <p className="text-xs text-red-500 mt-1">值: {error.value}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {importConflicts.length > 0 ? (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-medium text-slate-700">
                      SKU 冲突 ({importConflicts.length} 条)
                    </h4>
                    <div className="flex gap-2">
                      <Button size="sm" variant="secondary" onClick={() => resolveAllConflicts('skip')}>
                        全部跳过
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => resolveAllConflicts('overwrite')}>
                        全部覆盖
                      </Button>
                    </div>
                  </div>
                  <div className="border border-slate-200 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
                    {importConflicts.map((conflict) => (
                      <div key={conflict.sku} className="p-4 border-b border-slate-100 last:border-b-0">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <Swords className="w-5 h-5 text-amber-500" />
                              <span className="font-medium text-slate-800">SKU: {conflict.sku}</span>
                            </div>
                            <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
                              <div className="p-2 bg-slate-50 rounded-lg">
                                <p className="text-xs text-slate-500">现有商品</p>
                                <p className="font-medium text-slate-700">{conflict.newProduct.name}</p>
                              </div>
                              <div className="p-2 bg-blue-50 rounded-lg">
                                <p className="text-xs text-slate-500">新商品</p>
                                <p className="font-medium text-blue-700">{conflict.newProduct.name}</p>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 ml-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name={`conflict-${conflict.sku}`}
                                checked={conflict.resolution === 'skip' || conflict.resolution === 'pending'}
                                onChange={() => resolveImportConflict(conflict.sku, 'skip')}
                                className="w-4 h-4 text-[#1e3a5f] focus:ring-[#1e3a5f]"
                              />
                              <span className="text-sm text-slate-600">跳过</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name={`conflict-${conflict.sku}`}
                                checked={conflict.resolution === 'overwrite'}
                                onChange={() => resolveImportConflict(conflict.sku, 'overwrite')}
                                className="w-4 h-4 text-[#1e3a5f] focus:ring-[#1e3a5f]"
                              />
                              <span className="text-sm text-slate-600">覆盖</span>
                            </label>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-2 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  <span className="text-sm text-emerald-700 font-medium">无 SKU 冲突</span>
                </div>
              )}

              <div className="flex justify-between pt-4 border-t border-slate-200">
                <Button variant="secondary" onClick={() => setImportStep(2)}>
                  上一步
                </Button>
                <Button
                  onClick={handleConfirmImport}
                  disabled={hasValidationErrors}
                  className="gap-2"
                >
                  <Upload className="w-4 h-4" />
                  开始导入
                </Button>
              </div>
            </>
          )}

          {importStep === 4 && importResult && (
            <>
              <div className="text-center py-8">
                <div className="w-20 h-20 mx-auto mb-6 bg-emerald-100 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">导入完成</h3>
                <p className="text-slate-500 mb-8">共处理 {importData.length} 条数据</p>

                <div className="grid grid-cols-3 gap-4 mb-8">
                  <div className="p-4 bg-emerald-50 rounded-xl">
                    <p className="text-3xl font-bold text-emerald-600">{importResult.success}</p>
                    <p className="text-sm text-emerald-600">成功导入</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-xl">
                    <p className="text-3xl font-bold text-slate-600">{importResult.skipped}</p>
                    <p className="text-sm text-slate-600">跳过</p>
                  </div>
                  <div className="p-4 bg-blue-50 rounded-xl">
                    <p className="text-3xl font-bold text-blue-600">{importResult.overwritten}</p>
                    <p className="text-sm text-blue-600">覆盖</p>
                  </div>
                </div>

                <div className="flex justify-center gap-3">
                  <Button variant="secondary" onClick={() => {
                  resetImportState();
                }}>
                    继续导入
                  </Button>
                  <Button onClick={() => {
                    setShowImportModal(false);
                    resetImportState();
                  }}>
                    完成
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
};
