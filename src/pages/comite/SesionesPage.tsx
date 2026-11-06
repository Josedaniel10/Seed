import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  Plus,
  Clock,
  CheckCircle2,
  Building,
  ChevronRight,
  X,
} from 'lucide-react';

interface SesionItem {
  id: string;
  numero: string;
  tipo: 'Ordinaria' | 'Extraordinaria';
  fecha: string;
  hora: string;
  lugar: string;
  estado: 'Programada' | 'En curso' | 'Finalizada';
  expedientesEnAgenda: number;
}

const SESIONES_DATA: SesionItem[] = [
  {
    id: 'ses-004',
    numero: 'Sesión Ordinaria Nº 04 - 2026',
    tipo: 'Ordinaria',
    fecha: '12 de Noviembre de 2026',
    hora: '09:00 AM',
    lugar: 'Sala de Juntas de Vicerrectoría / Sala Virtual',
    estado: 'Programada',
    expedientesEnAgenda: 3,
  },
  {
    id: 'ses-003',
    numero: 'Sesión Ordinaria Nº 03 - 2026',
    tipo: 'Ordinaria',
    fecha: '28 de Octubre de 2026',
    hora: '14:00 PM',
    lugar: 'Sala de Consejos Académicos',
    estado: 'Finalizada',
    expedientesEnAgenda: 5,
  },
];

export function SesionesPage() {
  const navigate = useNavigate();
  const [sesiones, setSesiones] = useState(SESIONES_DATA);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [nuevaSesion, setNuevaSesion] = useState({
    numero: 'Sesión Ordinaria Nº 05 - 2026',
    tipo: 'Ordinaria' as 'Ordinaria' | 'Extraordinaria',
    fecha: '26 de Noviembre de 2026',
    hora: '09:00 AM',
    lugar: 'Sala de Juntas de Vicerrectoría',
  });

  const handleCrearSesion = (e: React.FormEvent) => {
    e.preventDefault();
    const creada: SesionItem = {
      id: `ses-${Date.now().toString(36)}`,
      numero: nuevaSesion.numero,
      tipo: nuevaSesion.tipo,
      fecha: nuevaSesion.fecha,
      hora: nuevaSesion.hora,
      lugar: nuevaSesion.lugar,
      estado: 'Programada',
      expedientesEnAgenda: 0,
    };
    setSesiones([creada, ...sesiones]);
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-extrabold tracking-tight text-[#14281D]">
            Sesiones del Comité de Investigación
          </h1>
          <p className="text-xs text-stone-500 mt-0.5">
            Convocatoria, conformación del orden del día y deliberación colegiada.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#14281D] hover:bg-[#1E3A2B] text-white text-xs font-bold cursor-pointer transition-colors shadow-xs shrink-0"
        >
          <Plus size={15} />
          <span>Nueva Sesión</span>
        </button>
      </div>

      <div className="space-y-4">
        {sesiones.map((ses) => (
          <div
            key={ses.id}
            onClick={() => navigate(`/sesiones/${ses.id}`)}
            className="bg-white rounded-2xl border border-[#E5E3DC] p-6 shadow-xs hover:border-[#14281D] cursor-pointer transition-all space-y-4 group"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-100">
              <div className="flex items-center gap-3">
                <span className="p-2.5 rounded-xl bg-[#F7F6F2] border border-[#E5E3DC] text-[#14281D]">
                  <Calendar size={18} />
                </span>
                <div>
                  <h3 className="font-bold text-sm text-[#14281D] group-hover:text-[#1E3A2B]">
                    {ses.numero}
                  </h3>
                  <div className="text-xs text-stone-500 mt-0.5 flex items-center gap-2">
                    <span>{ses.fecha} · {ses.hora}</span>
                    <span>·</span>
                    <span>{ses.lugar}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                    ses.estado === 'Programada'
                      ? 'bg-blue-100 text-blue-900 border border-blue-200'
                      : 'bg-stone-100 text-stone-700 border border-stone-200'
                  }`}
                >
                  {ses.estado}
                </span>
                <ChevronRight size={16} className="text-stone-400 group-hover:text-[#14281D]" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="bg-[#F7F6F2] p-3 rounded-xl border border-[#E5E3DC]">
                <span className="text-stone-500 text-[11px]">Tipo de Sesión</span>
                <p className="font-bold text-[#14281D] mt-0.5">{ses.tipo}</p>
              </div>
              <div className="bg-[#F7F6F2] p-3 rounded-xl border border-[#E5E3DC]">
                <span className="text-stone-500 text-[11px]">Expedientes en Agenda</span>
                <p className="font-bold text-[#14281D] mt-0.5">
                  {ses.expedientesEnAgenda} radicados para deliberación
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Diálogo Nueva Sesión */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-stone-100">
              <h3 className="font-bold text-sm text-[#14281D]">Programar Nueva Sesión de Comité</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-stone-400 hover:text-stone-700 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCrearSesion} className="space-y-3">
              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  Número / Identificación
                </label>
                <input
                  type="text"
                  required
                  value={nuevaSesion.numero}
                  onChange={(e) => setNuevaSesion({ ...nuevaSesion, numero: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-[#E5E3DC] outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Tipo</label>
                  <select
                    value={nuevaSesion.tipo}
                    onChange={(e) =>
                      setNuevaSesion({
                        ...nuevaSesion,
                        tipo: e.target.value as 'Ordinaria' | 'Extraordinaria',
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-[#E5E3DC] outline-none bg-white"
                  >
                    <option value="Ordinaria">Ordinaria</option>
                    <option value="Extraordinaria">Extraordinaria</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Hora</label>
                  <input
                    type="text"
                    required
                    value={nuevaSesion.hora}
                    onChange={(e) => setNuevaSesion({ ...nuevaSesion, hora: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-[#E5E3DC] outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Fecha</label>
                <input
                  type="text"
                  required
                  value={nuevaSesion.fecha}
                  onChange={(e) => setNuevaSesion({ ...nuevaSesion, fecha: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-[#E5E3DC] outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Lugar / Modalidad</label>
                <input
                  type="text"
                  required
                  value={nuevaSesion.lugar}
                  onChange={(e) => setNuevaSesion({ ...nuevaSesion, lugar: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-[#E5E3DC] outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-[#E5E3DC] rounded-xl font-semibold hover:bg-stone-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#14281D] text-white rounded-xl font-bold hover:bg-[#1E3A2B] cursor-pointer"
                >
                  Guardar y Programar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
