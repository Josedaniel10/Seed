import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar.tsx';
import { Topbar } from './Topbar.tsx';

export function MainLayout() {
  return (
    <div className="min-h-screen bg-[#F7F6F2] text-[#14281D] flex">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar />

        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto space-y-6">
          <Outlet />
        </main>

        <footer className="py-4 px-8 border-t border-[#E5E3DC] bg-white text-xs text-stone-500 text-center">
          Seed · Sistema de Gestión del Comité de Investigación Institucional © 2026
        </footer>
      </div>
    </div>
  );
}
