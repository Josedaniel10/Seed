import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ClipboardCheck,
  CheckCircle2,
  XCircle,
  FileText,
  Search,
  Filter,
  Check,
  ChevronRight,
  Eye,
  AlertCircle,
} from 'lucide-react';

interface ExpedienteValidacion {
  id: string;
  radicado: string;
  investigador: string;
  tipo: string;
  estado: string;
  fechaRadicacion: string;
  documentosCompletos: string;
  documentos: Array<{
    id: string;
    nombre: string;
    obligatorio: boolean;
    subsanable: boolean;
    estado: 'PENDIENTE' | 'VALIDO' | 'OBSERVADO';
  }>;
}

const EXPEDIENTES_INICIALES: ExpedienteValidacion[] = [
  {
    id: 'sol-001',
    radicado: 'Radicado 2026-014',
    investigador: 'Dra. Carmen Lucía Morales',
    tipo: 'Presentación de Proyecto',
    estado: 'Radicada',
    fechaRadicacion: '03 Nov 2026 · 14:30',
    documentosCompletos: '2 de 3',
    documentos: [
      {
        id: 'doc-1',
        nombre: 'Propuesta Técnica Completa',
        obligatorio: true,
        subsanable: false,
        estado: 'VALIDO',
      },
      {
        id: 'doc-2',
        nombre: 'Presupuesto Detallado y Cronograma',
        obligatorio: true,
        subsanable: true,
        estado: 'PENDIENTE',
      },
      {
        id: 'doc-3',
        nombre: 'Carta de Aval del Líder de Grupo',
        obligatorio: true,
        subsanable: true,
        estado: 'VALIDO',
      },
    ],
  },
  {
    id: 'sol-002',
    radicado: 'Radicado 2026-015',
    investigador: 'Dr. Alejandro Restrepo',
    tipo: 'Modificación Presupuestal',
    estado: 'Pendiente por documentos',
    fechaRadicacion: '04 Nov 2026 · 09:15',
    documentosCompletos: '1 de 2',
    documentos: [
      {
        id: 'doc-4',
        nombre: 'Justificación Técnica de Modificación Presupuestal',
        obligatorio: true,
        subsanable: true,
        estado: 'VALIDO',
      },
      {
        id: 'doc-5',
        nombre: 'Cuadro Comparativo de Rubros Financieros',
        obligatorio: true,
        subsanable: true,
        estado: 'OBSERVADO',
      },
    ],
  },
];

export function ValidacionPage() {
  const navigate = useNavigate();
  const [expedientes, setExpedientes] = useState(EXPEDIENTES_INICIALES);
  const [selectedId, setSelectedId] = useState('sol-001');
  const [feedback, setFeedback] = useState<string | null>(null);

  const selectedExp = expedientes.find((e) => e.id === selectedId) || expedientes[0];

  const handleDocDecision = (docId: string, nuevoEstado: 'VALIDO' | 'OBSERVADO') => {
    setExpedientes((prev) =>
      prev.map((exp) => {
        if (exp.id !== selectedExp.id) return exp;
        const nuevosDocs = exp.documentos.map((d) =>
          d.id === docId ? { ...d, estado: nuevoEstado } : d
        );
        const validos = nuevosDocs.filter((d) => d.estado === 'VALIDO').length;
        return {
          ...exp,
          documentos: nuevosDocs,
          documentosCompletos: `${validos} de ${nuevosDocs.length}`,
        };
      })
    );

    setFeedback(
      nuevoEstado === 'VALIDO'
        ? 'Requisito marcado como válido.'
        : 'Requisito observado. Se notificará para subsanación.'
    );
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleFinalizarValidacion = () => {
    setExpedientes((prev) =>
      prev.map((exp) =>
        exp.id === selectedExp.id ? { ...exp, estado: 'En revisión' } : exp
      )
    );
    setFeedback('Validación documental finalizada. La solicitud avanza a fase de revisión.');
    setTimeout(() => setFeedback(null), 3000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-extrabold tracking-tight text-[#14281D]">
          Bandeja de Validación Documental
        </h1>
        <p className="text-xs text-stone-500 mt-0.5">
          Verificación formal de requisitos y documentos exigidos para trámites radicados.
        </p>
      </div>

      {feedback && (
        <div className="p-3 bg-[#A3E635]/25 border border-[#84CC16] text-[#14281D] rounded-xl text-xs flex items-center gap-2">
          <CheckCircle2 size={16} />
          <span>{feedback}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Columna Izquierda: Cola de expedientes */}
        <div className="lg:col-span-5 space-y-3">
          <div className="text-xs font-bold text-stone-600">
            Expedientes por validar ({expedientes.length})
          </div>

          <div className="space-y-2.5">
            {expedientes.map((exp) => {
              const isSelected = exp.id === selectedExp?.id;
              return (
                <div
                  key={exp.id}
                  onClick={() => setSelectedId(exp.id)}
                  className={`p-4 rounded-xl border text-xs transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-white border-[#14281D] shadow-sm ring-1 ring-[#14281D]'
                      : 'bg-white border-[#E5E3DC] hover:border-stone-300'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="font-mono font-bold text-[11px] px-2 py-0.5 rounded bg-[#F7F6F2] border border-[#E5E3DC] text-[#14281D]">
                      {exp.radicado}
                    </span>
                    <span className="text-[10px] text-stone-500">{exp.fechaRadicacion}</span>
                  </div>

                  <h4 className="font-bold text-[#14281D]">{exp.tipo}</h4>
                  <p className="text-[11px] text-stone-500 mt-0.5">{exp.investigador}</p>

                  <div className="pt-2 mt-2 border-t border-stone-100 flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-stone-600">
                      Requisitos: {exp.documentosCompletos}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-100 text-amber-900">
                      {exp.estado}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Columna Derecha: Lista de Chequeo Documental */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-[#E5E3DC] p-6 shadow-xs space-y-4">
          {selectedExp && (
            <>
              <div className="pb-3 border-b border-stone-100">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 bg-[#14281D] text-white rounded">
                    {selectedExp.radicado}
                  </span>
                  <button
                    onClick={() => navigate(`/solicitudes/${selectedExp.id}`)}
                    className="text-xs text-stone-600 hover:text-[#14281D] font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <span>Ver expediente completo</span>
                    <ChevronRight size={13} />
                  </button>
                </div>
                <h3 className="font-bold text-sm text-[#14281D] mt-2">
                  {selectedExp.tipo}
                </h3>
                <p className="text-xs text-stone-600 mt-0.5">
                  Investigador(a): <strong>{selectedExp.investigador}</strong>
                </p>
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-bold text-stone-700 uppercase tracking-wider">
                  Lista de Requisitos Exigidos
                </h4>

                {selectedExp.documentos.map((doc, idx) => (
                  <div
                    key={doc.id}
                    className="p-3.5 rounded-xl border border-[#E5E3DC] bg-[#F7F6F2] text-xs space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-bold text-[#14281D] flex items-center gap-2">
                          <span>
                            {idx + 1}. {doc.nombre}
                          </span>
                          {doc.estado === 'VALIDO' && (
                            <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded flex items-center gap-1">
                              <Check size={11} /> Válido
                            </span>
                          )}
                          {doc.estado === 'OBSERVADO' && (
                            <span className="text-[10px] font-bold text-rose-800 bg-rose-100 px-2 py-0.5 rounded flex items-center gap-1">
                              <XCircle size={11} /> Observado
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-stone-500 mt-0.5">
                          {doc.obligatorio ? 'Obligatorio' : 'Opcional'} ·{' '}
                          {doc.subsanable ? 'Subsanable (5 días hábiles)' : 'No subsanable'}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => handleDocDecision(doc.id, 'VALIDO')}
                          className={`p-1.5 rounded-lg border text-xs flex items-center gap-1 cursor-pointer transition-colors ${
                            doc.estado === 'VALIDO'
                              ? 'bg-emerald-700 text-white border-emerald-700'
                              : 'bg-white hover:bg-emerald-50 text-emerald-800 border-emerald-200'
                          }`}
                        >
                          <Check size={13} />
                          <span>Válido</span>
                        </button>
                        <button
                          onClick={() => handleDocDecision(doc.id, 'OBSERVADO')}
                          className={`p-1.5 rounded-lg border text-xs flex items-center gap-1 cursor-pointer transition-colors ${
                            doc.estado === 'OBSERVADO'
                              ? 'bg-rose-700 text-white border-rose-700'
                              : 'bg-white hover:bg-rose-50 text-rose-800 border-rose-200'
                          }`}
                        >
                          <XCircle size={13} />
                          <span>Rechazar</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-3 border-t border-stone-100 flex justify-end">
                <button
                  onClick={handleFinalizarValidacion}
                  className="px-4 py-2 rounded-xl bg-[#14281D] hover:bg-[#1E3A2B] text-white text-xs font-bold cursor-pointer transition-colors shadow-xs"
                >
                  Finalizar Validación Documental
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
