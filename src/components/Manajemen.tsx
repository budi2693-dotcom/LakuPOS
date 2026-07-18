import React from 'react';
import { 
  Menu,
  Package,
  LayoutGrid,
  User,
  Tags,
  Receipt,
  Banknote,
  Star,
  HandCoins
} from 'lucide-react';

interface ManajemenProps {
  onToggleSidebar?: () => void;
  onNavigate?: (tab: string) => void;
}

export default function Manajemen({ onToggleSidebar, onNavigate }: ManajemenProps) {
  return (
    <div className="bg-gray-50 h-full flex flex-col font-sans overflow-hidden">
      {/* Top App Bar */}
      <div className="flex items-center px-4 h-14 bg-white shrink-0 border-b border-gray-100">
        <button 
          onClick={onToggleSidebar}
          className="p-2 -ml-2 text-[#00A980] hover:bg-emerald-50 rounded-full transition-colors md:hidden"
        >
          <Menu size={24} />
        </button>
        <h1 className="flex-1 text-center text-[15px] font-bold text-gray-900 tracking-wide mr-8">
          MANAJEMEN
        </h1>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto w-full p-4">
          {/* Menu Items Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 pb-8">
            <MenuItem 
              icon={<Package className="text-[#00A980]" size={24} strokeWidth={1.5} />} 
              label="Barang atau Jasa" 
              onClick={() => onNavigate?.('catalog-items')}
            />
            <MenuItem 
              icon={<LayoutGrid className="text-[#00A980]" size={24} strokeWidth={1.5} />} 
              label="Kategori Barang" 
              onClick={() => onNavigate?.('kategori')}
            />
            <MenuItem 
              icon={<User className="text-[#00A980]" size={24} strokeWidth={1.5} />} 
              label="Pelanggan" 
              onClick={() => onNavigate?.('pelanggan')}
            />
            <MenuItem 
              icon={<User className="text-[#00A980]" size={24} strokeWidth={1.5} />} 
              label="Supplier" 
              onClick={() => onNavigate?.('supplier')}
            />
            <MenuItem 
              icon={<User className="text-[#00A980]" size={24} strokeWidth={1.5} />} 
              label="Tipe Pelanggan" 
              onClick={() => onNavigate?.('tipe-pelanggan')}
            />
            <MenuItem 
              icon={<Tags className="text-[#00A980]" size={24} strokeWidth={1.5} />} 
              label="Diskon" 
              onClick={() => onNavigate?.('diskon')}
            />
            <MenuItem 
              icon={<Receipt className="text-[#00A980]" size={24} strokeWidth={1.5} />} 
              label="Pajak" 
              onClick={() => onNavigate?.('pajak')}
            />
            <MenuItem 
              icon={<Receipt className="text-[#00A980]" size={24} strokeWidth={1.5} />} 
              label="Biaya" 
              onClick={() => onNavigate?.('biaya')}
            />
            <MenuItem 
              icon={<Star className="text-[#00A980]" size={24} strokeWidth={1.5} />} 
              label="Marketing" 
              onClick={() => onNavigate?.('marketing')}
            />
            <MenuItem 
              icon={<HandCoins className="text-[#00A980]" size={24} strokeWidth={1.5} />} 
              label="Komisi Staff" 
              onClick={() => onNavigate?.('komisi-staff')}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function MenuItem({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick?: () => void }) {
  return (
    <button 
      onClick={onClick} 
      className="flex flex-col items-start p-4 bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-md transition-shadow text-left"
    >
      <div className="mb-3">
        {icon}
      </div>
      <span className="text-[13px] md:text-[14px] text-gray-800">{label}</span>
    </button>
  );
}
