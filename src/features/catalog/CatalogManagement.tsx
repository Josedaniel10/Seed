import React, { useState } from 'react';
import {
  FileText,
  Plus,
  Check,
  AlertCircle,
  Clock,
  RefreshCw,
  Trash2,
  Edit2,
  FileCheck,
  Layers,
  ShieldAlert,
  Search,
  Filter,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  Info,
} from 'lucide-react';
import { useCatalogStore } from './catalogStore.ts';
import { ApplicationType, Requirement } from '../../types/database.ts';
import { isSupabaseConfigured } from '../../lib/supabase.ts';

export function CatalogManagement() {
  const {
    types,
    requirements,
    selectedTypeId,
    searchQuery,
    filterStatus,
    isLoading,
    setSelectedTypeId,
    setSearchQuery,
    setFilterStatus,
    createType,
    updateType,
    toggleTypeActive,
    deleteType,
    addRequirement,
    updateRequirement,
    removeRequirement,
    loadFromSupabase,
    syncWithSupabase,
  } = useCatalogStore();

  // Cargar catálogo en vivo desde Supabase al montar la vista
  React.useEffect(() => {
    loadFromSupabase();
  }, [loadFromSupabase]);

  // Modals state
  const [isCreateTypeOpen, setIsCreateTypeOpen] = useState(false);
  const [editingType, setEditingType] = useState<ApplicationType | null>(null);

  const [isAddReqOpen, setIsAddReqOpen] = useState(false);
  const [editingReq, setEditingReq] = useState<Requirement | null>(null);

  // Sync state
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<{ success: boolean; message: string } | null>(null);

  // Form states for Type
  const [typeForm, setTypeForm] = useState({
    code: '',
    name: '',
    description: '',
    requires_committee: true,
    display_order: 1,
  });
  const [typeError, setTypeError] = useState('');

  // Form states for Requirement
  const [reqForm, setReqForm] = useState({
    name: '',
    description: '',
    is_mandatory: true,
    is_subsanable: true,
    cure_deadline_days: 5,
    max_size_mb: 10,
    allowed_formats: ['application/pdf'],
    template_url: '',
  });
  const [reqError, setReqError] = useState('');

  // Filter types
  const filteredTypes = types.filter((t) => {
    const matchesSearch =
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;
    if (filterStatus === 'ACTIVE') return t.is_active;
    if (filterStatus === 'INACTIVE') return !t.is_active;
    return true;
  });

  const selectedType = types.find((t) => t.id === selectedTypeId) || filteredTypes[0] || null;
  const currentReqs = selectedType
    ? requirements.filter((r) => r.application_type_id === selectedType.id)
    : [];

  // Handlers
  const handleOpenCreateType = () => {
    setTypeForm({
      code: '',
      name: '',
      description: '',
      requires_committee: true,
      display_order: types.length + 1,
    });
    setTypeError('');
    setIsCreateTypeOpen(true);
  };

  const handleOpenEditType = (type: ApplicationType) => {
    setEditingType(type);
    setTypeForm({
      code: type.code,
      name: type.name,
      description: type.description || '',
      requires_committee: type.requires_committee,
      display_order: type.display_order,
    });
    setTypeError('');
  };

  const handleSaveType = (e: React.FormEvent) => {
    e.preventDefault();
    setTypeError('');

    if (editingType) {
      const res = updateType(editingType.id, {
        code: typeForm.code.trim().toUpperCase(),
        name: typeForm.name.trim(),
        description: typeForm.description.trim() || null,
        requires_committee: typeForm.requires_committee,
        display_order: Number(typeForm.display_order),
      });
      if (res.success) {
        setEditingType(null);
      }
    } else {
      const res = createType({
        code: typeForm.code,
        name: typeForm.name,
        description: typeForm.description,
        requires_committee: typeForm.requires_committee,
        display_order: Number(typeForm.display_order),
      });
      if (!res.success) {
        setTypeError(res.error || 'Error al crear tipo de trámite');
        return;
      }
      setIsCreateTypeOpen(false);
    }
  };

  const handleOpenAddReq = () => {
    if (!selectedType) return;
    setReqForm({
      name: '',
      description: '',
      is_mandatory: true,
      is_subsanable: true,
      cure_deadline_days: 5,
      max_size_mb: 10,
      allowed_formats: ['application/pdf'],
      template_url: '',
    });
    setReqError('');
    setIsAddReqOpen(true);
  };

  const handleOpenEditReq = (req: Requirement) => {
    setEditingReq(req);
    setReqForm({
      name: req.name,
      description: req.description || '',
      is_mandatory: req.is_mandatory,
      is_subsanable: req.is_subsanable,
      cure_deadline_days: req.cure_deadline_days,
      max_size_mb: req.max_size_mb,
      allowed_formats: req.allowed_formats,
      template_url: req.template_url || '',
    });
    setReqError('');
  };

  const handleSaveReq = (e: React.FormEvent) => {
    e.preventDefault();
    setReqError('');

    if (!selectedType) return;

    if (editingReq) {
      const res = updateRequirement(editingReq.id, {
        name: reqForm.name.trim(),
        description: reqForm.description.trim() || null,
        is_mandatory: reqForm.is_mandatory,
        is_subsanable: reqForm.is_subsanable,
        cure_deadline_days: reqForm.is_subsanable ? Number(reqForm.cure_deadline_days) : 0,
        max_size_mb: Number(reqForm.max_size_mb),
        allowed_formats: reqForm.allowed_formats,
        template_url: reqForm.template_url.trim() || null,
      });
      if (res.success) {
        setEditingReq(null);
      }
    } else {
      const res = addRequirement({
        application_type_id: selectedType.id,
        name: reqForm.name,
        description: reqForm.description,
        is_mandatory: reqForm.is_mandatory,
        is_subsanable: reqForm.is_subsanable,
        cure_deadline_days: Number(reqForm.cure_deadline_days),
        max_size_mb: Number(reqForm.max_size_mb),
        allowed_formats: reqForm.allowed_formats,
        template_url: reqForm.template_url,
      });
      if (!res.success) {
        setReqError(res.error || 'Error al agregar requisito');
        return;
      }
      setIsAddReqOpen(false);
    }
  };

  const handleSyncSupabase = async () => {
    setIsSyncing(true);
    setSyncFeedback(null);
    const result = await syncWithSupabase();
    setIsSyncing(false);
    if (result.success) {
      setSyncFeedback({
        success: true,
        message: `Catálogo actualizado (${result.typesCount} tipos de trámite y ${result.reqsCount} requisitos).`,
      });
    } else {
      setSyncFeedback({
        success: false,
        message: result.error || 'No se pudo actualizar el catálogo.',
      });
    }
    setTimeout(() => setSyncFeedback(null), 6000);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Context Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-stone-100">
        <div>
          <div className="flex items-center gap-2">
            <Layers size={20} className="text-[#14281D]" />
            <h3 className="text-base font-bold text-[#14281D]">
              Catálogo de Tipos de Solicitud y Requisitos
            </h3>
          </div>
          <p className="text-xs text-stone-600 mt-0.5">
            Parametriza las solicitudes académicas, si requieren deliberación en sesión de comité, y define los requisitos obligatorios, condicionales y subsanables.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleSyncSupabase}
            disabled={isSyncing}
            className="px-3 py-1.5 bg-[#F7F6F2] hover:bg-[#EFECE6] text-[#14281D] text-xs font-semibold rounded-lg border border-[#E5E3DC] transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="Actualizar el catálogo"
          >
            <RefreshCw size={13} className={isSyncing ? 'animate-spin' : ''} />
            <span>{isSyncing ? 'Sincronizando...' : 'Actualizar catálogo'}</span>
          </button>

          <button
            onClick={handleOpenCreateType}
            className="px-3.5 py-1.5 bg-[#14281D] hover:bg-[#1E3A2B] text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Plus size={14} />
            <span>Nuevo Tipo de Trámite</span>
          </button>
        </div>
      </div>

      {/* Sync Status Banner */}
      {syncFeedback && (
        <div
          className={`p-3 rounded-xl border text-xs flex items-center gap-2 transition-all ${
            syncFeedback.success
              ? 'bg-[#A3E635]/20 border-[#84CC16] text-[#14281D]'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {syncFeedback.success ? <Check size={15} /> : <AlertCircle size={15} />}
          <span>{syncFeedback.message}</span>
        </div>
      )}

      {/* Rules Notice Badge */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
        <div className="bg-[#F7F6F2] p-3 rounded-xl border border-[#E5E3DC] flex items-start gap-2.5">
          <div className="p-1 rounded bg-[#14281D] text-white shrink-0 mt-0.5">
            <FileCheck size={14} />
          </div>
          <div>
            <div className="font-bold text-[#14281D]">Requisitos Documentales Exigidos</div>
            <p className="text-stone-600 text-[11px] leading-relaxed">
              Cada tipo de solicitud define con exactitud qué documentos debe radicar el investigador. El sistema valida automáticamente los formatos permitidos (.PDF, .DOCX) y el tope institucional de 10 MB.
            </p>
          </div>
        </div>

        <div className="bg-[#F7F6F2] p-3 rounded-xl border border-[#E5E3DC] flex items-start gap-2.5">
          <div className="p-1 rounded bg-[#A3E635] text-[#14281D] shrink-0 mt-0.5">
            <Clock size={14} />
          </div>
          <div>
            <div className="font-bold text-[#14281D]">Criterios de Subsanación Documental</div>
            <p className="text-stone-600 text-[11px] leading-relaxed">
              La falta de un requisito <strong>subsanable</strong> transita a <em>Pendiente por documentos</em> con plazo hábil de subsanación. La falta de un requisito <strong>no subsanable</strong> causa <em>Rechazo directo</em> en validación.
            </p>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-stone-50 p-2.5 rounded-xl border border-stone-200 text-xs">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-2.5 text-stone-400" />
          <input
            type="text"
            placeholder="Buscar por código, nombre o descripción..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-white border border-[#E5E3DC] rounded-lg text-xs text-[#14281D] placeholder:text-stone-400 focus:outline-none focus:ring-1 focus:ring-[#14281D]"
          />
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-stone-500 font-medium">Estado:</span>
          {(['ALL', 'ACTIVE', 'INACTIVE'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                filterStatus === status
                  ? 'bg-[#14281D] text-white'
                  : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-100'
              }`}
            >
              {status === 'ALL' ? 'Todos' : status === 'ACTIVE' ? 'Activos' : 'Inactivos'}
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid: Application Types List & Selected Type Requirements */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: List of Application Types (5 cols) */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
              Tipos de Solicitud ({filteredTypes.length})
            </span>
            <span className="text-[11px] text-stone-400">Seleccione uno para ver requisitos</span>
          </div>

          <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
            {filteredTypes.map((type) => {
              const isSelected = selectedType?.id === type.id;
              const typeReqs = requirements.filter((r) => r.application_type_id === type.id);
              const mandatoryCount = typeReqs.filter((r) => r.is_mandatory).length;
              const subsanableCount = typeReqs.filter((r) => r.is_subsanable).length;

              return (
                <div
                  key={type.id}
                  onClick={() => setSelectedTypeId(type.id)}
                  className={`p-4 rounded-xl border text-xs transition-all cursor-pointer relative ${
                    isSelected
                      ? 'bg-white border-[#14281D] shadow-sm ring-1 ring-[#14281D]'
                      : 'bg-white border-[#E5E3DC] hover:border-stone-300 hover:shadow-2xs'
                  } ${!type.is_active ? 'opacity-65' : ''}`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-mono font-bold text-[11px] px-2 py-0.5 rounded bg-[#F7F6F2] border border-[#E5E3DC] text-[#14281D]">
                        {type.code}
                      </span>
                      {type.requires_committee ? (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                          Pasa a Sesión
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-stone-100 text-stone-600 border border-stone-200">
                          Trámite Directo
                        </span>
                      )}
                      {!type.is_active && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-stone-200 text-stone-600">
                          Inactivo
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleOpenEditType(type)}
                        title="Editar tipo"
                        className="p-1 text-stone-400 hover:text-[#14281D] hover:bg-stone-100 rounded transition-colors cursor-pointer"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        onClick={() => toggleTypeActive(type.id)}
                        title={type.is_active ? 'Desactivar trámite' : 'Activar trámite'}
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                          type.is_active
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                            : 'bg-stone-100 text-stone-600 border-stone-300 hover:bg-stone-200'
                        }`}
                      >
                        {type.is_active ? 'Activo' : 'Inactivo'}
                      </button>
                    </div>
                  </div>

                  <h4 className="font-bold text-[#14281D] text-xs leading-snug mb-1">
                    {type.name}
                  </h4>

                  {type.description && (
                    <p className="text-[11px] text-stone-500 line-clamp-2 leading-relaxed mb-2.5">
                      {type.description}
                    </p>
                  )}

                  {/* Badges footer */}
                  <div className="flex items-center justify-between text-[11px] text-stone-500 pt-2 border-t border-stone-100">
                    <span className="flex items-center gap-1">
                      <FileText size={12} className="text-stone-400" />
                      <strong>{typeReqs.length}</strong> requisitos ({mandatoryCount} obligatorios)
                    </span>
                    <span className="flex items-center gap-1 text-[#14281D] font-medium">
                      <span>Ver requisitos</span>
                      <ChevronRight size={13} />
                    </span>
                  </div>
                </div>
              );
            })}

            {filteredTypes.length === 0 && (
              <div className="text-center py-8 bg-white rounded-xl border border-dashed border-stone-300 p-4 text-xs text-stone-500">
                No se encontraron tipos de solicitud con los filtros aplicados.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Requisitos del Tipo Seleccionado (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-[#E5E3DC] p-5 shadow-xs space-y-4">
          {selectedType ? (
            <>
              {/* Header of selected type */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-3 border-b border-stone-100">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 bg-[#14281D] text-white rounded">
                      {selectedType.code}
                    </span>
                    <h3 className="font-bold text-sm text-[#14281D]">
                      {selectedType.name}
                    </h3>
                  </div>
                  {selectedType.description && (
                    <p className="text-xs text-stone-600 mt-1 leading-relaxed">
                      {selectedType.description}
                    </p>
                  )}
                </div>

                <button
                  onClick={handleOpenAddReq}
                  className="shrink-0 px-3 py-1.5 bg-[#A3E635] hover:bg-[#84CC16] text-[#14281D] text-xs font-bold rounded-lg border border-[#84CC16] transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Plus size={14} />
                  <span>Agregar Requisito</span>
                </button>
              </div>

              {/* Requirements Count and Status Summary */}
              <div className="flex items-center justify-between text-xs text-stone-600">
                <span>
                  Requisitos configurados: <strong>{currentReqs.length}</strong>
                </span>
                <span className="text-[11px] text-stone-500">
                  {currentReqs.filter((r) => r.is_mandatory).length} Obligatorios ·{' '}
                  {currentReqs.filter((r) => r.is_subsanable).length} Subsanables
                </span>
              </div>

              {/* List of Requirements */}
              <div className="space-y-3">
                {currentReqs.map((req, idx) => (
                  <div
                    key={req.id}
                    className="p-3.5 rounded-xl border border-[#E5E3DC] bg-[#F7F6F2] hover:bg-[#FAF9F6] transition-colors text-xs space-y-2 relative"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-[#14281D] text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <h4 className="font-bold text-[#14281D] text-xs">
                          {req.name}
                        </h4>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleOpenEditReq(req)}
                          title="Editar requisito"
                          className="p-1 text-stone-400 hover:text-[#14281D] hover:bg-stone-200 rounded transition-colors cursor-pointer"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={() => removeRequirement(req.id)}
                          title="Eliminar requisito"
                          className="p-1 text-stone-400 hover:text-rose-700 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    {req.description && (
                      <p className="text-[11px] text-stone-600 pl-7 leading-relaxed">
                        {req.description}
                      </p>
                    )}

                    {/* Metadata & Tag Badges */}
                    <div className="flex flex-wrap items-center gap-1.5 pl-7 pt-1">
                      {/* Obligatorio / Opcional */}
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
                          req.is_mandatory
                            ? 'bg-stone-900 text-white border-stone-900'
                            : 'bg-stone-100 text-stone-600 border-stone-300'
                        }`}
                      >
                        {req.is_mandatory ? 'Obligatorio' : 'Opcional / Condicional'}
                      </span>

                      {/* Subsanable vs No Subsanable */}
                      {req.is_subsanable ? (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-[#A3E635] text-[#14281D] border border-[#84CC16] flex items-center gap-1">
                          <Clock size={11} />
                          <span>Subsanable ({req.cure_deadline_days} días hábiles)</span>
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-rose-100 text-rose-900 border border-rose-300 flex items-center gap-1">
                          <ShieldAlert size={11} />
                          <span>No subsanable (Causal de rechazo)</span>
                        </span>
                      )}

                      {/* Formatos y tamaño */}
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white text-stone-700 border border-stone-200">
                        {req.allowed_formats
                          .map((f) => f.replace('application/', '').replace('vnd.openxmlformats-officedocument.wordprocessingml.document', 'docx'))
                          .join(', ')}
                        {' · '}
                        max {req.max_size_mb} MB
                      </span>

                      {/* Template Link */}
                      {req.template_url && (
                        <span className="text-[10px] font-medium text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                          <ExternalLink size={10} />
                          <span>Plantilla oficial disponible</span>
                        </span>
                      )}
                    </div>
                  </div>
                ))}

                {currentReqs.length === 0 && (
                  <div className="text-center py-8 bg-stone-50 rounded-xl border border-dashed border-stone-300 p-4 text-xs text-stone-500 space-y-2">
                    <AlertCircle size={20} className="mx-auto text-stone-400" />
                    <div>No hay requisitos asignados a este tipo de trámite.</div>
                    <button
                      onClick={handleOpenAddReq}
                      className="px-3 py-1.5 bg-[#14281D] text-white text-xs font-semibold rounded-lg hover:bg-[#1E3A2B] cursor-pointer inline-flex items-center gap-1"
                    >
                      <Plus size={13} />
                      <span>Agregar el primer requisito</span>
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="text-center py-12 text-xs text-stone-500">
              Seleccione un tipo de trámite a la izquierda para inspeccionar y configurar sus requisitos.
            </div>
          )}
        </div>
      </div>

      {/* Modal: Crear / Editar Tipo de Trámite */}
      {(isCreateTypeOpen || editingType) && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-[#E5E3DC] shadow-xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-6 py-4 bg-[#F7F6F2] border-b border-[#E5E3DC] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText size={18} className="text-[#14281D]" />
                <h3 className="font-bold text-sm text-[#14281D]">
                  {editingType ? 'Editar Tipo de Trámite' : 'Registrar Nuevo Tipo de Trámite'}
                </h3>
              </div>
              <button
                onClick={() => {
                  setIsCreateTypeOpen(false);
                  setEditingType(null);
                }}
                className="text-stone-400 hover:text-stone-700 text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveType} className="p-6 space-y-4 text-xs">
              {typeError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg flex items-center gap-2">
                  <AlertCircle size={15} />
                  <span>{typeError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-stone-700">Código Único Institucional *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. SOL-01, MOD-RUB"
                    value={typeForm.code}
                    onChange={(e) => setTypeForm({ ...typeForm, code: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F7F6F2] border border-[#E5E3DC] rounded-lg text-xs font-mono uppercase focus:ring-1 focus:ring-[#14281D] focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-stone-700">Orden de Visualización</label>
                  <input
                    type="number"
                    min="1"
                    value={typeForm.display_order}
                    onChange={(e) => setTypeForm({ ...typeForm, display_order: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-[#F7F6F2] border border-[#E5E3DC] rounded-lg text-xs focus:ring-1 focus:ring-[#14281D] focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-stone-700">Nombre del Tipo de Trámite *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Presentación de Proyecto de Investigación"
                  value={typeForm.name}
                  onChange={(e) => setTypeForm({ ...typeForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-[#F7F6F2] border border-[#E5E3DC] rounded-lg text-xs focus:ring-1 focus:ring-[#14281D] focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-stone-700">Descripción & Alcance</label>
                <textarea
                  rows={3}
                  placeholder="Explique el propósito y a qué público investigador está dirigido..."
                  value={typeForm.description}
                  onChange={(e) => setTypeForm({ ...typeForm, description: e.target.value })}
                  className="w-full px-3 py-2 bg-[#F7F6F2] border border-[#E5E3DC] rounded-lg text-xs focus:ring-1 focus:ring-[#14281D] focus:outline-none resize-none"
                />
              </div>

              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={typeForm.requires_committee}
                    onChange={(e) => setTypeForm({ ...typeForm, requires_committee: e.target.checked })}
                    className="rounded text-[#14281D] focus:ring-[#14281D]"
                  />
                  <span className="font-semibold text-[#14281D]">
                    Requiere deliberación y votación en Sesión de Comité
                  </span>
                </label>
                <p className="text-[11px] text-stone-500 pl-5">
                  Si se desmarca, el trámite puede ser resuelto directamente por el personal administrativo o secretaría técnica sin ingresar al orden del día colegiado.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreateTypeOpen(false);
                    setEditingType(null);
                  }}
                  className="px-3.5 py-2 text-stone-600 hover:bg-stone-100 rounded-lg font-medium cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#14281D] hover:bg-[#1E3A2B] text-white font-bold rounded-lg cursor-pointer"
                >
                  {editingType ? 'Guardar Cambios' : 'Crear Tipo de Trámite'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Agregar / Editar Requisito */}
      {(isAddReqOpen || editingReq) && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-[#E5E3DC] shadow-xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-6 py-4 bg-[#F7F6F2] border-b border-[#E5E3DC] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCheck size={18} className="text-[#14281D]" />
                <h3 className="font-bold text-sm text-[#14281D]">
                  {editingReq ? 'Editar Requisito' : `Nuevo Requisito para [${selectedType?.code}]`}
                </h3>
              </div>
              <button
                onClick={() => {
                  setIsAddReqOpen(false);
                  setEditingReq(null);
                }}
                className="text-stone-400 hover:text-stone-700 text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveReq} className="p-6 space-y-4 text-xs">
              {reqError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg flex items-center gap-2">
                  <AlertCircle size={15} />
                  <span>{reqError}</span>
                </div>
              )}

              <div className="space-y-1">
                <label className="font-semibold text-stone-700">Nombre del Requisito *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Presupuesto detallado en Excel o PDF"
                  value={reqForm.name}
                  onChange={(e) => setReqForm({ ...reqForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-[#F7F6F2] border border-[#E5E3DC] rounded-lg text-xs focus:ring-1 focus:ring-[#14281D] focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-stone-700">Instrucciones / Descripción para el Investigador</label>
                <textarea
                  rows={2}
                  placeholder="Detalle los puntos clave que debe contener el documento..."
                  value={reqForm.description}
                  onChange={(e) => setReqForm({ ...reqForm, description: e.target.value })}
                  className="w-full px-3 py-2 bg-[#F7F6F2] border border-[#E5E3DC] rounded-lg text-xs focus:ring-1 focus:ring-[#14281D] focus:outline-none resize-none"
                />
              </div>

              {/* Obligatorio & Subsanable */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-stone-50 rounded-xl border border-stone-200">
                <div className="space-y-1">
                  <label className="flex items-center gap-2 cursor-pointer font-semibold text-[#14281D]">
                    <input
                      type="checkbox"
                      checked={reqForm.is_mandatory}
                      onChange={(e) => setReqForm({ ...reqForm, is_mandatory: e.target.checked })}
                      className="rounded text-[#14281D] focus:ring-[#14281D]"
                    />
                    <span>Requisito Obligatorio</span>
                  </label>
                  <p className="text-[10px] text-stone-500 pl-5">
                    Indispensable para que el trámite avance a revisión técnica.
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="flex items-center gap-2 cursor-pointer font-semibold text-[#14281D]">
                    <input
                      type="checkbox"
                      checked={reqForm.is_subsanable}
                      onChange={(e) => setReqForm({ ...reqForm, is_subsanable: e.target.checked })}
                      className="rounded text-[#14281D] focus:ring-[#14281D]"
                    />
                    <span>Es Subsanable</span>
                  </label>
                  <p className="text-[10px] text-stone-500 pl-5">
                    Si falta, da plazo de corrección; si no es subsanable, se rechaza de inmediato.
                  </p>
                </div>
              </div>

              {/* Plazo de subsanación & Tamaño máximo */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-stone-700 flex items-center gap-1">
                    <Clock size={12} />
                    <span>Días Hábiles Subsanación</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    disabled={!reqForm.is_subsanable}
                    value={reqForm.cure_deadline_days}
                    onChange={(e) => setReqForm({ ...reqForm, cure_deadline_days: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-[#F7F6F2] border border-[#E5E3DC] rounded-lg text-xs focus:ring-1 focus:ring-[#14281D] focus:outline-none disabled:opacity-40"
                  />
                  <span className="text-[10px] text-stone-400">Por defecto: 5 días hábiles</span>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-stone-700">Tamaño Máximo (MB)</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={reqForm.max_size_mb}
                    onChange={(e) => setReqForm({ ...reqForm, max_size_mb: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-[#F7F6F2] border border-[#E5E3DC] rounded-lg text-xs focus:ring-1 focus:ring-[#14281D] focus:outline-none"
                  />
                  <span className="text-[10px] text-stone-400">Máximo institucional: 10 MB</span>
                </div>
              </div>

              {/* Plantilla oficial descargable */}
              <div className="space-y-1">
                <label className="font-semibold text-stone-700">Ruta o Enlace a Plantilla Oficial (Opcional)</label>
                <input
                  type="text"
                  placeholder="Ej. /templates/formato_presupuesto.xlsx"
                  value={reqForm.template_url}
                  onChange={(e) => setReqForm({ ...reqForm, template_url: e.target.value })}
                  className="w-full px-3 py-2 bg-[#F7F6F2] border border-[#E5E3DC] rounded-lg text-xs font-mono focus:ring-1 focus:ring-[#14281D] focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddReqOpen(false);
                    setEditingReq(null);
                  }}
                  className="px-3.5 py-2 text-stone-600 hover:bg-stone-100 rounded-lg font-medium cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#14281D] hover:bg-[#1E3A2B] text-white font-bold rounded-lg cursor-pointer"
                >
                  {editingReq ? 'Guardar Cambios' : 'Guardar Requisito'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
