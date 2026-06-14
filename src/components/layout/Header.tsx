import { Bell, Search, ChevronDown } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useStore } from '@/store/useStore';

const pageTitles: Record<string, string> = {
  '/products': '商品池',
  '/campaigns': '活动配置',
  '/campaigns/new': '新建活动',
  '/price-check': '价格校验',
  '/dashboard': '效果看板',
};

export const Header = () => {
  const location = useLocation();
  const { shops } = useStore();

  const getPageTitle = () => {
    for (const [path, title] of Object.entries(pageTitles)) {
      if (location.pathname.startsWith(path)) {
        return title;
      }
    }
    return '电商运营平台';
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6">
      <div className="flex items-center gap-4">
        <h2 className="text-xl font-semibold text-slate-800">{getPageTitle()}</h2>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="搜索..."
            className="pl-10 pr-4 py-2 bg-slate-100 rounded-lg text-sm border-0 focus:ring-2 focus:ring-[#1e3a5f]/20 focus:bg-white transition-all w-64"
          />
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-lg cursor-pointer hover:bg-slate-200 transition-colors">
          <span className="text-sm text-slate-600">{shops[0]?.name || '全部店铺'}</span>
          <ChevronDown className="w-4 h-4 text-slate-400" />
        </div>

        <button className="relative p-2 rounded-lg hover:bg-slate-100 transition-colors">
          <Bell className="w-5 h-5 text-slate-600" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
        </button>
      </div>
    </header>
  );
};
