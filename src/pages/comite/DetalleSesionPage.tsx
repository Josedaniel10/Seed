import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Calendar,
  Users,
  CheckCircle2,
  FileText,
  FileCheck,
  Download,
  Plus,
  ArrowLeft,
  Scale,
} from 'lucide-react';

export function DetalleSesionPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'agenda' | 'quorum' | 'decisiones' | 'acta'>('agenda');

  // Miembros y quórum
  const [miembros, setMiembros] = useState([
    { id: 'm1', nombre: 'Dr. Alejandro Restrepo', rol: 'Presidente Delegado', asistio: true },
    { id: 'm2', nombre: 'Dra. Patricia Salamanca', rol: 'Secretaria Técnica', asistio: true },
    { id: 'm3', nombre: 'Dra. Carmen Lucía Morales', rol: 'Vocal de Investigaciones', asistio: true },
    { id: 'm4', nombre: 'Dr. Germán Valenzuela', rol: 'Representante de Líderes', asistio: true },
    { id: 'm5', nombre: 'Lic. Fernando Ortiz', rol: 'Invitado Administrativo', asistio: true },
    { id: 'm6', nombre: 'Dra. Elena Vargas', rol: 'Representante de Posgrados', asistio: false },
    { id: 'm7', nombre: 'Dr. Carlos Mendoza', rol: 'Representante de Ética', asistio: false },
  ]);

  const [decisiones, setDecisiones] = useState<Record<string, { decision: string; motivo: string }>>({
    'sol-001': { decision: 'Aprobada', motivo: 'Cumple con rigor metodológico y presupuesto viable.' },
  });

  const quorumAsistentes = miembros.filter((m) => m.asistio).length;
  const hayQuorum = quorumAsistentes >= 4; // Mínimo 4 de 7

  const toggleAsistencia = (id: string) => {
    setMiembros((prev) =>
      prev.map((m) => (m.id === id ? { ...m, asistio: !m.asistio } : m))
    );
  };

  return (
    <div className="space-y-6">
      {/* Botón Volver y Encabezado */}
      <div className="space-y-2">
        <button
          onClick={() => navigate('/sesiones')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-500 hover:text-[#14281D] cursor-pointer"
        >
          <ArrowLeft size={13} />
          <span>Volver a Sesiones de Comité</span>
        </button>

        <div className="bg-white rounded-2xl border border-[#E5E3DC] p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="p-3 rounded-xl bg-[#F7F6F2] border border-[#E5E3DC] text-[#14281D]">
              <Calendar size={22} />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-[#14281D]">
                  Sesión Ordinaria Nº 04 - 2026
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-900 border border-blue-200">
                  Programada
                </span>
              </div>
              <p className="text-xs text-stone-500 mt-0.5">
                Jueves, 12 de Noviembre de 2026 · 09:00 AM · Sala de Juntas de Vicerrectoría
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span
              className={`text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5 border ${
                hayQuorum
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border-rose-200'
              }`}
            >
              <CheckCircle2 size={13} />
              <span>
                {quorumAsistentes} de {miembros.length} miembros ({hayQuorum ? 'Hay Quórum' : 'Sin Quórum'})
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* Pestañas de la Sesión */}
      <div className="flex border-b border-[#E5E3DC] gap-6 text-xs font-bold">
        <button
          onClick={() => setActiveTab('agenda')}
          className={`pb-3 cursor-pointer transition-colors border-b-2 ${
            activeTab === 'agenda'
              ? 'border-[#14281D] text-[#14281D]'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          Orden del Día y Agenda
        </button>
        <button
          onClick={() => setActiveTab('quorum')}
          className={`pb-3 cursor-pointer transition-colors border-b-2 ${
            activeTab === 'quorum'
              ? 'border-[#14281D] text-[#14281D]'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          Asistencia y Quórum ({quorumAsistentes}/{miembros.length})
        </button>
        <button
          onClick={() => setActiveTab('decisiones')}
          className={`pb-3 cursor-pointer transition-colors border-b-2 ${
            activeTab === 'decisiones'
              ? 'border-[#14281D] text-[#14281D]'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          Decisiones y Deliberación
        </button>
        <button
          onClick={() => setActiveTab('acta')}
          className={`pb-3 cursor-pointer transition-colors border-b-2 ${
            activeTab === 'acta'
              ? 'border-[#14281D] text-[#14281D]'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          Acta de Sesión
        </button>
      </div>

      {/* Contenido Pestaña Agenda */}
      {activeTab === 'agenda' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-8 bg-white rounded-2xl border border-[#E5E3DC] p-6 shadow-xs space-y-4">
            <h3 className="font-bold text-xs text-[#14281D] uppercase tracking-wider">
              Expedientes en el Orden del Día
            </h3>

            <div className="space-y-3 text-xs">
              <div className="p-4 rounded-xl border border-[#E5E3DC] bg-[#F7F6F2] space-y-2">
                <div className="flex items-center justify-between">
                  <div className="font-mono font-bold text-[#14281D] bg-white px-2 py-0.5 rounded border border-stone-200">
                    Radicado 2026-014
                  </div>
                  <span className="font-semibold text-stone-500">Ponente: Dr. Alejandro Restrepo</span>
                </div>
                <h4 className="font-bold text-[#14281D]">
                  Modelamiento de Redes Neuronales Profundas para Detección de Fitopatógenos
                </h4>
                <div className="text-[11px] text-stone-500">
                  Investigador: Dra. Carmen Morales · Tipo: Presentación de Proyecto
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-4 bg-white rounded-2xl border border-[#E5E3DC] p-5 shadow-xs space-y-3 text-xs">
            <h4 className="font-bold text-xs text-[#14281D]">Expedientes Listos para Comité</h4>
            <p className="text-[11px] text-stone-500">
              Solicitudes con concepto técnico favorable listas para ser incorporadas:
            </p>
            <div className="p-3 rounded-xl border border-dashed border-stone-300 space-y-2">
              <div className="font-bold text-[#14281D]">Radicado 2026-003</div>
              <div className="text-[11px] text-stone-600">Prórroga de Calendario de Campo</div>
              <button className="w-full mt-1 py-1.5 rounded-lg bg-[#14281D] text-white font-bold text-[11px] flex items-center justify-center gap-1 cursor-pointer">
                <Plus size={12} />
                <span>Agregar a la Agenda</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Contenido Pestaña Asistencia y Quórum */}
      {activeTab === 'quorum' && (
        <div className="bg-white rounded-2xl border border-[#E5E3DC] p-6 shadow-xs space-y-4 text-xs">
          <div className="flex items-center justify-between pb-3 border-b border-stone-100">
            <div>
              <h3 className="font-bold text-sm text-[#14281D]">Registro de Asistencia</h3>
              <p className="text-stone-500 mt-0.5 text-[11px]">
                Marque la asistencia de los integrantes para verificar el quórum reglamentario.
              </p>
            </div>
            <div className="text-right">
              <span className="font-bold text-sm text-[#14281D]">
                {quorumAsistentes} de {miembros.length}
              </span>
              <span className="block text-[10px] text-stone-400">Asistentes verificados</span>
            </div>
          </div>

          <div className="divide-y divide-[#E5E3DC]">
            {miembros.map((m) => (
              <div
                key={m.id}
                onClick={() => toggleAsistencia(m.id)}
                className="py-3 px-2 flex items-center justify-between hover:bg-[#FAF9F6] rounded-xl cursor-pointer transition-colors"
              >
                <div>
                  <div className="font-bold text-[#14281D]">{m.nombre}</div>
                  <div className="text-[11px] text-stone-500">{m.rol}</div>
                </div>
                <input
                  type="checkbox"
                  checked={m.asistio}
                  onChange={() => toggleAsistencia(m.id)}
                  className="w-4 h-4 text-[#14281D] rounded cursor-pointer"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Contenido Pestaña Decisiones */}
      {activeTab === 'decisiones' && (
        <div className="bg-white rounded-2xl border border-[#E5E3DC] p-6 shadow-xs space-y-4 text-xs">
          <h3 className="font-bold text-sm text-[#14281D]">
            Decisiones Colegiadas por Expediente
          </h3>

          <div className="p-4 rounded-xl border border-[#E5E3DC] bg-[#F7F6F2] space-y-3">
            <div className="font-bold text-xs text-[#14281D]">
              Radicado 2026-014: Modelamiento de Redes Neuronales
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-stone-700 mb-1">Decisión del Comité</label>
                <select
                  value={decisiones['sol-001']?.decision || 'Aprobada'}
                  onChange={(e) =>
                    setDecisiones({
                      ...decisiones,
                      'sol-001': { ...decisiones['sol-001'], decision: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-[#E5E3DC] bg-white outline-none"
                >
                  <option value="Aprobada">Aprobada</option>
                  <option value="Aprobada con ajustes">Aprobada con ajustes</option>
                  <option value="Rechazada">Rechazada</option>
                  <option value="Aplazada">Aplazada</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Justificación / Motivo</label>
                <input
                  type="text"
                  value={decisiones['sol-001']?.motivo || ''}
                  onChange={(e) =>
                    setDecisiones({
                      ...decisiones,
                      'sol-001': { ...decisiones['sol-001'], motivo: e.target.value },
                    })
                  }
                  placeholder="Justificación del acuerdo adoptado..."
                  className="w-full px-3 py-2 rounded-xl border border-[#E5E3DC] bg-white outline-none"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Contenido Pestaña Acta */}
      {activeTab === 'acta' && (
        <div className="bg-white rounded-2xl border border-[#E5E3DC] p-6 shadow-xs space-y-4 text-xs">
          <div className="flex items-center justify-between pb-3 border-b border-stone-100">
            <div>
              <h3 className="font-bold text-sm text-[#14281D]">Borrador del Acta de Sesión</h3>
              <p className="text-stone-500 text-[11px] mt-0.5">
                Generado automáticamente a partir de las decisiones registradas y la lista de quórum.
              </p>
            </div>
            <button className="px-3 py-1.5 bg-[#14281D] text-white rounded-xl font-bold flex items-center gap-1.5 cursor-pointer">
              <Download size={13} />
              <span>Descargar PDF</span>
            </button>
          </div>

          <div className="p-6 rounded-xl border border-[#E5E3DC] bg-[#FAF9F6] font-mono text-[11px] text-stone-700 leading-relaxed space-y-3">
            <div className="font-bold text-center text-[#14281D]">
              ACTA Nº 04 - 2026 DE SESIÓN ORDINARIA DEL COMITÉ DE INVESTIGACIONES
            </div>
            <p>
              En la ciudad de Bogotá D.C., a los 12 días del mes de noviembre de 2026, se reunieron los integrantes del Comité de Investigación Institucional para deliberar sobre los expedientes en agenda.
            </p>
            <p>
              <strong>Quórum verificado:</strong> 5 de 7 integrantes presentes.
            </p>
            <p>
              <strong>Acuerdo 1:</strong> Respecto al Radicado 2026-014, el comité decide: APROBADA con pleno aval institucional para su ejecución.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
