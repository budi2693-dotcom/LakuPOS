import React from 'react';
import { 
  Menu,
  User,
  Store,
  Database,
  RefreshCw,
  Printer,
  Banknote,
  ShoppingCart,
  Star,
  MoreHorizontal,
  MonitorSmartphone 
} from 'lucide-react';

interface SettingsProps {
  onToggleSidebar?: () => void;
  onNavigate?: (tab: string) => void;
}

export default function Settings({ onToggleSidebar, onNavigate }: SettingsProps) {
  return (
    <div className="bg-white h-full flex flex-col font-sans overflow-hidden">
      {/* Top App Bar */}
      <div className="flex items-center px-6 h-16 border-b border-gray-100 bg-white shrink-0">
        <button 
          onClick={onToggleSidebar}
          className="p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-full transition-colors md:hidden"
        >
          <Menu size={24} />
        </button>
        <h1 className="flex-1 text-left text-lg font-bold text-teal-600 tracking-wide md:ml-0 ml-2">
          PENGATURAN
        </h1>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto w-full p-4 md:p-8">
          {/* Account Info */}
          <div className="flex items-center gap-5 px-6 py-6 border border-gray-100 rounded-2xl bg-white shadow-sm mb-6">
            <div className="relative shrink-0">
              <div className="w-16 h-16 bg-teal-600 rounded-xl flex items-center justify-center text-white shadow-sm">
                <MonitorSmartphone size={32} strokeWidth={1.5} />
              </div>
              <div className="absolute -top-2 -right-2 bg-yellow-400 text-[10px] font-extrabold text-white px-2 py-1 rounded shadow-sm">
                PRO
              </div>
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[18px] font-bold text-gray-800 truncate">budi2693@gmail.com</span>
              <span className="text-[14px] text-gray-500 truncate mt-1">Versi 4.1.2(721) • db version 60</span>
            </div>
          </div>

          {/* Menu Items */}
          <div className="flex flex-col border border-gray-100 rounded-2xl bg-white shadow-sm overflow-hidden">
            <MenuItem icon={<User className="text-teal-600" size={24} strokeWidth={1.5} />} label="Profile" />
            <MenuItem icon={<Store className="text-teal-600" size={24} strokeWidth={1.5} />} label="Toko" />
            <MenuItem 
              icon={<Database className="text-teal-600" size={24} strokeWidth={1.5} />} 
              label="Database" 
              onClick={() => onNavigate?.('database')}
            />
            <MenuItem icon={<RefreshCw className="text-teal-600" size={24} strokeWidth={1.5} />} label="Sinkronisasi" />
            <MenuItem icon={<Printer className="text-teal-600" size={24} strokeWidth={1.5} />} label="Printer dan Struk" />
            <MenuItem 
              icon={<Banknote className="text-teal-600" size={24} strokeWidth={1.5} />} 
              label="Pembayaran" 
              badge="Baru!" 
            />
            <MenuItem icon={<ShoppingCart className="text-teal-600" size={24} strokeWidth={1.5} />} label="Pengaturan Transaksi" />
            <MenuItem icon={<Star className="text-teal-600" size={24} strokeWidth={1.5} />} label="Beri Rating Aplikasi" />
            <MenuItem icon={<MoreHorizontal className="text-teal-600" size={24} strokeWidth={1.5} />} label="Lainnya" borderBottom={false} />
          </div>
        </div>
      </div>
    </div>
  );
}

function MenuItem({ 
  icon, 
  label, 
  badge, 
  borderBottom = true,
  onClick 
}: { 
  icon: React.ReactNode; 
  label: string; 
  badge?: string; 
  borderBottom?: boolean;
  onClick?: () => void;
}) {
  return (
    <button 
      onClick={onClick}
      className={`flex items-center gap-5 px-6 py-4 hover:bg-gray-50 transition-colors w-full text-left group ${borderBottom ? 'border-b border-gray-100' : ''}`}
    >

      <div className="shrink-0 w-6 flex items-center justify-center transition-transform group-hover:scale-110">
        {icon}
      </div>
      <span className="flex-1 text-[15px] font-medium text-gray-800">{label}</span>
      {badge && (
        <span className="px-2 py-1 bg-[#F5B523] text-white text-[11px] font-bold rounded shadow-sm">
          {badge}
        </span>
      )}
    </button>
  );
}
