import { NavLink, useLocation } from 'react-router-dom';
import { Package, Tag, AlertTriangle, BarChart3, Store, Calendar, Settings } from 'lucide-react';
import { cn } from '@/utils/cn';

const navItems = [
  { path: '/products', label: '商品池', icon: Package },
  { path: '/campaigns', label: '活动配置', icon: Tag },
  { path: '/price-check', label: '价格校验', icon: AlertTriangle },
  { path: '/dashboard', label: '效果看板', icon: BarChart3 },
];

export const Sidebar = () => {
  const location = useLocation();

  return (
    <aside className="w-60 bg-gradient-to-b from-[#1e3a5f] to-[#0f2744] min-h-screen text-white flex flex-col">
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg flex items-center justify-center">
            <Store className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg">电商运营平台</h1>
            <p className="text-xs text-white/60">E-Commerce Ops</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 py-6 px-3">
        <p className="px-3 mb-3 text-xs font-semibold text-white/40 uppercase tracking-wider">
          功能模块
        </p>
        <div className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname.startsWith(item.path);
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group',
                  isActive
                    ? 'bg-white/15 text-white shadow-inner'
                    : 'text-white/70 hover:text-white hover:bg-white/5'
                )}
              >
                <Icon
                  className={cn(
                    'w-5 h-5 transition-colors',
                    isActive ? 'text-amber-400' : 'text-white/60 group-hover:text-white'
                  )}
                />
                {item.label}
              </NavLink>
            );
          })}
        </div>
      </nav>

      <div className="px-3 py-4 border-t border-white/10">
        <div className="px-3 py-2.5 rounded-lg bg-white/5 text-white/60 hover:bg-white/10 transition-colors cursor-pointer flex items-center gap-3">
          <Calendar className="w-5 h-5" />
          <span className="text-sm">活动日历</span>
        </div>
        <div className="px-3 py-2.5 mt-1 rounded-lg text-white/60 hover:bg-white/10 transition-colors cursor-pointer flex items-center gap-3">
          <Settings className="w-5 h-5" />
          <span className="text-sm">系统设置</span>
        </div>
      </div>

      <div className="p-4 border-t border-white/10">
        <div className="flex items-center gap-3 px-2 py-2 rounded-lg bg-white/5">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-sm font-bold">
            运
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">运营专员</p>
            <p className="text-xs text-white/50 truncate">admin@shop.com</p>
          </div>
        </div>
      </div>
    </aside>
  );
};
