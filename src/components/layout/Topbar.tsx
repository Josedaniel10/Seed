import React from 'react';
import { Search, Plus, Bell, HelpCircle } from 'lucide-react';
import { Button } from '../ui/Button.tsx';
import { useNavigate } from 'react-router-dom';

export function Topbar() {
  const navigate = useNavigate();

  return (
    <header className="h-14 bg-white border-b border-[#E5E3DC] px-6 flex items-center justify-between gap-4 sticky top-0 z-30">
      {/* Search Bar */}
      <div className="relative flex-1 max-w-md hidden sm:block">
        <Search size={14} className="absolute left-3 top-2.5 text-stone-400" />
        <input
          type="text"
          placeholder="Buscar trámites, requisitos o resoluciones (Ctrl + K)..."
          className="w-full pl-9 pr-3 py-1.5 bg-[#F7F6F2] border border-[#E5E3DC] rounded-xl text-xs text-[#14281D] placeholder:text-stone-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#14281D]"
        />
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3 ml-auto">
        <button
          className="p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
          title="Notificaciones institucionales"
        >
          <Bell size={16} />
        </button>

        <button
          className="p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
          title="Ayuda y manuales"
        >
          <HelpCircle size={16} />
        </button>

        <Button
          variant="primary"
          size="sm"
          icon={<Plus size={13} />}
          onClick={() => navigate('/catalog')}
        >
          Consultar Catálogo
        </Button>
      </div>
    </header>
  );
}
