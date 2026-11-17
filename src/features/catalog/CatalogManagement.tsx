import { getUserError } from '../../lib/userMessages.ts';
import { CatalogTypeEditor } from './CatalogTypeEditor.tsx';
import type { CatalogTypeInput } from './CatalogTypeEditor.tsx';
import { CatalogRequirements } from './CatalogRequirements.tsx';
import { IdentityIcon } from '../../components/ui/IdentityIcon.tsx';
import { getTypeAppearance } from './typeAppearance.ts';
import { uploadTemplate } from './templateFiles.ts';
import { TemplateDownload } from './TemplateDownload.tsx';
import { useDecisionConfirmation } from '../../hooks/useDecisionConfirmation.tsx';
import { FloatingAlert } from '../../components/ui/FloatingAlert.tsx';
import { SplitWorkspaceSkeleton } from '../../components/ui/ContentSkeletons.tsx';
import { ResponsiveOverlay } from '../../components/ui/ResponsiveOverlay.tsx';
import React, { useRef, useState } from 'react';
import { Plus, RefreshCw, Trash2, Edit2, FileCheck, AlertCircle, Clock, Search, Layers } from 'lucide-react';
import { useCatalogStore } from './catalogStore.ts';
import type { ApplicationType, Requirement } from '../../types/database.ts';
import { useSessionStore } from '../../stores/session.store.ts';

export function CatalogManagement() {
  const {
    types,
    requirements,
    selectedTypeId,
    searchQuery,
    filterStatus,
    isLoading,
    isInitialized,
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

  const [saving, setSaving] = useState(false);
  const saveLock = useRef(false);
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const userId = useSessionStore(state => state.user?.id);
  const { requestDecision, decisionDialog } = useDecisionConfirmation(`catalog-management:${userId}`);
  const confirmChange = (title: string, name: string, operation: () => Promise<{ success: boolean; error?: string }>) => {
    requestDecision({ title, target: name, confirmLabel: title, consequence: 'Los expedientes radicados conservan sus condiciones. Los elementos vinculados se archivan en lugar de borrarse.' }, async () => {
      const result = await operation();
      if (!result.success) throw new Error(result.error ?? 'No se pudo confirmar el cambio.');
      setSyncFeedback({ success: true, message: 'Cambio guardado correctamente.' });
    });
  };
  // Modals state
  const [isCreateTypeOpen, setIsCreateTypeOpen] = useState(false);
  const [editingType, setEditingType] = useState<ApplicationType | null>(null);

  const [isAddReqOpen, setIsAddReqOpen] = useState(false);
  const [editingReq, setEditingReq] = useState<Requirement | null>(null);

  // Sync state
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<{ success: boolean; message: string } | null>(null);

  // Form states for Type
  const [typeForm, setTypeForm] = useState<CatalogTypeInput>({
    icon_key: 'folder-check', accent_color: 'forest', is_active: true,
    code: '',
    name: '',
    description: '',
    requires_committee: true,
    display_order: 1,
  });
  const [typeError, setTypeError] = useState('');
  const originalTypeForm = useRef<CatalogTypeInput>(typeForm);
  const [committeeFilter, setCommitteeFilter] = useState('ALL');

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
    if (committeeFilter === 'COMMITTEE' && !t.requires_committee) return false;
    if (committeeFilter === 'DIRECT' && t.requires_committee) return false;
    if (filterStatus === 'ACTIVE') return t.is_active;
    if (filterStatus === 'INACTIVE') return !t.is_active;
    return true;
  }).sort((left, right) => left.display_order - right.display_order);

  const selectedType = types.find((t) => t.id === (editingType?.id ?? selectedTypeId)) || null;
  const currentReqs = selectedType
    ? requirements.filter((r) => (r.application_type_id || r.request_type_id) === selectedType.id && r.is_active !== false)
    : [];

  // Handlers
  const handleOpenCreateType = () => {
    const initial = { code: '', name: '', description: '', requires_committee: true, display_order: types.length + 1,
      icon_key: 'folder-check', accent_color: 'forest', is_active: true };
    originalTypeForm.current = initial;
    setTypeForm(initial);
    setTypeError('');
    setIsCreateTypeOpen(true);
  };

  const handleOpenEditType = (type: ApplicationType) => {
    setEditingType(type);
    setSelectedTypeId(type.id);
    const initial = { code: type.code, name: type.name, description: type.description || '',
      requires_committee: type.requires_committee, display_order: type.display_order, is_active: type.is_active,
      ...getTypeAppearance(type) };
    originalTypeForm.current = initial;
    setTypeForm(initial);
    setTypeError('');
  };

  const handleSaveType = async (e: React.FormEvent) => {
    e.preventDefault();
    setTypeError('');
    if (saveLock.current) return;
    saveLock.current = true;
    setSaving(true);
    try {
      const data = { ...typeForm, code: typeForm.code.trim().toUpperCase(), name: typeForm.name.trim(), description: typeForm.description.trim() };
      if (editingType) {
        const result = await updateType(editingType.id, data);
        if (!result.success) { setTypeError(result.error ?? 'No se pudo guardar.'); return; }
        originalTypeForm.current = data;
        setTypeForm(data);
        setSyncFeedback({ success: true, message: 'Tipo de solicitud actualizado.' });
      } else {
        const result = await createType(data);
        if (!result.success || !result.type) { setTypeError(result.error || 'No se pudo crear el tipo de solicitud.'); return; }
        setIsCreateTypeOpen(false);
        handleOpenEditType(result.type);
        setSyncFeedback({ success: true, message: 'Tipo creado. Ahora puede agregar sus requisitos y plantillas.' });
      }
    } catch (cause) { setTypeError(getUserError(cause, 'No se pudo guardar el tipo de solicitud.')); }
    finally { saveLock.current = false; setSaving(false); }
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
    setTemplateFile(null);
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
    setTemplateFile(null);
  };

  const handleSaveReq = async (e: React.FormEvent) => {
    e.preventDefault();
    setReqError('');

    if (!selectedType || saveLock.current) return;
    saveLock.current = true;
    setSaving(true);
    try {
    const templatePath = templateFile ? await uploadTemplate(templateFile) : reqForm.template_url;
    if (templateFile) { setReqForm(current => ({ ...current, template_url: templatePath })); setTemplateFile(null); }

    if (editingReq) {
      const res = await updateRequirement(editingReq.id, {
        name: reqForm.name.trim(),
        description: reqForm.description.trim() || null,
        is_mandatory: reqForm.is_mandatory,
        is_subsanable: reqForm.is_subsanable,
        cure_deadline_days: reqForm.is_subsanable ? Number(reqForm.cure_deadline_days) : 0,
        max_size_mb: Number(reqForm.max_size_mb),
        allowed_formats: reqForm.allowed_formats,
        template_url: templatePath || null,
      });
      if (res.success) {
        setEditingReq(null);
      } else { setReqError(res.error ?? 'No se pudo guardar.'); }
    } else {
      const res = await addRequirement({
        application_type_id: selectedType.id,
        name: reqForm.name,
        description: reqForm.description,
        is_mandatory: reqForm.is_mandatory,
        is_subsanable: reqForm.is_subsanable,
        cure_deadline_days: Number(reqForm.cure_deadline_days),
        max_size_mb: Number(reqForm.max_size_mb),
        allowed_formats: reqForm.allowed_formats,
        template_url: templatePath,
      });
      if (!res.success) {
        setReqError(res.error || 'Error al agregar requisito');
        return;
      }
      setIsAddReqOpen(false);
    }
    } catch (cause) { setReqError(getUserError(cause, 'No se pudo guardar la plantilla.')); }
    finally { saveLock.current = false; setSaving(false); }
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

  };

  const closeTypeEditor = () => {
    if (saving) return;
    const close = () => { setIsCreateTypeOpen(false); setEditingType(null); };
    if (JSON.stringify(typeForm) === JSON.stringify(originalTypeForm.current)) { close(); return; }
    requestDecision({ title: '¿Salir sin guardar?', target: typeForm.name || 'Nuevo tipo de solicitud',
      confirmLabel: 'Salir sin guardar', consequence: 'Se perderán los cambios del tipo de solicitud. Los requisitos ya guardados se conservan.' }, close);
  };

  return (
    <div className="space-y-6">
      {decisionDialog}
      <FloatingAlert message={syncFeedback?.message} tone={syncFeedback?.success ? 'success' : 'error'} onDismiss={() => setSyncFeedback(null)} />
      {isCreateTypeOpen || editingType ? <CatalogTypeEditor value={typeForm} onChange={setTypeForm} onSave={handleSaveType}
        onCancel={closeTypeEditor} saving={saving} error={typeError} isNew={isCreateTypeOpen}>
        {editingType ? <CatalogRequirements requirements={currentReqs} onAdd={handleOpenAddReq} onEdit={handleOpenEditReq}
          onRemove={(requirement) => confirmChange('Retirar requisito', requirement.name, () => removeRequirement(requirement.id))} disabled={saving} />
          : <section className="catalog-section"><h2 className="font-bold">Requisitos y plantillas</h2><p className="text-sm text-stone-500">Guarde primero el tipo de solicitud para agregar sus documentos y plantillas.</p></section>}
      </CatalogTypeEditor> : <>
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E5E3DC] pb-4">
          <div><h1 className="mobile-section-title text-xl md:text-2xl font-extrabold tracking-tight text-[#14281D]">Catálogo de solicitudes</h1><p className="mt-1 text-sm text-stone-500">Organice los tipos de trámite, sus requisitos y sus plantillas institucionales.</p></div>
          <div className="flex flex-wrap gap-2"><button type="button" disabled={isSyncing} onClick={handleSyncSupabase} className="catalog-secondary" aria-label="Actualizar catálogo"><RefreshCw size={16} className={isSyncing ? 'animate-spin' : ''} />{isSyncing ? 'Actualizando…' : 'Actualizar'}</button><button type="button" onClick={handleOpenCreateType} className="catalog-primary"><Plus size={16} /> Nuevo tipo de solicitud</button></div>
        </header>
        <dl className="grid grid-cols-3 gap-3">{[
          { label: 'Tipos activos', value: types.filter((type) => type.is_active).length },
          { label: 'Tipos inactivos', value: types.filter((type) => !type.is_active).length },
          { label: 'Requisitos', value: requirements.filter((requirement) => requirement.is_active !== false).length },
        ].map((metric) => <div key={metric.label} className="rounded-2xl border border-[#E5E3DC] bg-white p-4 sm:p-5"><dt className="text-xs text-stone-500">{metric.label}</dt><dd className="mt-2 text-2xl font-bold text-[#14281D]">{isLoading && !isInitialized ? '—' : metric.value}</dd></div>)}</dl>
        <div className="catalog-section !p-4">
          <div className="flex flex-col lg:flex-row gap-3">
            <div className="relative min-w-0 flex-1"><Search size={16} className="absolute left-3 top-3.5 text-stone-400" /><input aria-label="Buscar tipos de solicitud" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Buscar por nombre, código o descripción" className="w-full min-h-11 rounded-xl border border-[#E5E3DC] bg-white pl-10 pr-3 text-sm" /></div>
            <div className="flex flex-wrap gap-3"><label className="sr-only" htmlFor="catalog-status">Estado</label><select id="catalog-status" value={filterStatus} onChange={(event) => { const value = event.target.value; if (value === 'ALL' || value === 'ACTIVE' || value === 'INACTIVE') setFilterStatus(value); }} className="min-h-11 rounded-xl border border-[#E5E3DC] bg-white px-3 text-sm"><option value="ALL">Todos los estados</option><option value="ACTIVE">Activos</option><option value="INACTIVE">Inactivos</option></select>
              <label className="sr-only" htmlFor="catalog-committee">Revisión en comité</label><select id="catalog-committee" value={committeeFilter} onChange={(event) => setCommitteeFilter(event.target.value)} className="min-h-11 rounded-xl border border-[#E5E3DC] bg-white px-3 text-sm"><option value="ALL">Todos los trámites</option><option value="COMMITTEE">Revisión en comité</option><option value="DIRECT">Trámite directo</option></select></div>
          </div>
        </div>
        {isLoading && !isInitialized ? <SplitWorkspaceSkeleton label="Cargando catálogo de trámites…" /> : <>
          <p className="text-sm text-stone-500">{filteredTypes.length} tipos de solicitud</p>
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">{filteredTypes.map((type) => {
            const typeRequirements = requirements.filter((requirement) => (requirement.application_type_id || requirement.request_type_id) === type.id && requirement.is_active !== false);
            return <article key={type.id} className="catalog-type-card">
              <header className="flex items-start justify-between gap-3"><IdentityIcon {...getTypeAppearance(type)} size={26} /><span className={`rounded-full px-3 py-1 text-xs font-semibold ${type.is_active ? 'bg-emerald-50 text-emerald-800' : 'bg-stone-100 text-stone-600'}`}>{type.is_active ? 'Activo' : 'Inactivo'}</span></header>
              <div><p className="mb-2 font-mono text-xs text-stone-500">{type.code}</p><h2 className="text-base font-bold text-[#14281D]"><button type="button" onClick={() => handleOpenEditType(type)} className="text-left hover:underline underline-offset-4">{type.name}</button></h2></div>
              <p className="text-sm leading-relaxed text-stone-600">{type.description || 'Sin descripción registrada.'}</p>
              <div className="flex flex-wrap gap-2 text-xs text-stone-600"><span className="rounded-lg bg-[#F7F6F2] px-2.5 py-1.5">{typeRequirements.length} requisitos</span><span className="rounded-lg bg-[#F7F6F2] px-2.5 py-1.5">{type.requires_committee ? 'Revisión en comité' : 'Trámite directo'}</span></div>
              <footer className="mt-auto flex flex-wrap justify-between gap-2 border-t border-[#E5E3DC] pt-4">
                <button type="button" onClick={() => handleOpenEditType(type)} className="catalog-secondary" aria-label={`Editar ${type.name}`}><Edit2 size={14} /> Editar y ver requisitos</button>
                <div className="flex gap-1"><button type="button" onClick={() => confirmChange(type.is_active ? 'Desactivar trámite' : 'Activar trámite', type.name, () => toggleTypeActive(type.id))} className="min-h-11 px-2 text-xs font-semibold text-stone-600">{type.is_active ? 'Desactivar' : 'Activar'}</button><button type="button" aria-label={`Eliminar ${type.name}`} onClick={() => confirmChange('Eliminar o archivar trámite', type.name, () => deleteType(type.id))} className="min-h-11 min-w-11 inline-flex items-center justify-center text-rose-700"><Trash2 size={16} /></button></div>
              </footer>
            </article>;
          })}</div>
          {!filteredTypes.length && <div className="catalog-section py-12 text-center"><Layers size={32} className="mx-auto text-stone-300" /><h2 className="font-bold">No se encontraron tipos de solicitud</h2><p className="text-sm text-stone-500">Pruebe otra búsqueda o ajuste los filtros.</p></div>}
        </>}
      </>}
      {/* Modal: Agregar / Editar Requisito */}
      <ResponsiveOverlay isOpen={Boolean((isAddReqOpen || editingReq))} onClose={() => { if (!saving) { setIsAddReqOpen(false); setEditingReq(null); } }} label="Requisito documental">
        {(isAddReqOpen || editingReq) && (<>
          <div className="bg-white rounded-2xl max-w-lg w-full border border-[#E5E3DC] shadow-xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-6 py-4 bg-[#F7F6F2] border-b border-[#E5E3DC] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCheck size={18} className="text-[#14281D]" />
                <h3 className="font-bold text-sm text-[#14281D]">
                  {editingReq ? 'Editar Requisito' : `Nuevo Requisito para [${selectedType?.code}]`}
                </h3>
              </div>
              <button disabled={saving} aria-label="Cerrar panel"
                onClick={() => {
                  setIsAddReqOpen(false);
                  setEditingReq(null);
                }}
                className="text-stone-400 hover:text-stone-700 text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveReq} className="p-4 sm:p-6 space-y-5 text-sm">
              <fieldset disabled={saving} className="contents"><legend className="sr-only">Datos del catálogo institucional</legend>
              {reqError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg flex items-center gap-2">
                  <AlertCircle size={15} />
                  <span>{reqError}</span>
                </div>
              )}

              <div className="space-y-1">
                <label htmlFor="catalog-req-name" className="font-semibold text-stone-700">Nombre del requisito *</label>
                <input
                  type="text"
                  required
                  id="catalog-req-name"
                  maxLength={300}
                  placeholder="Ej. Presupuesto detallado en Excel o PDF"
                  value={reqForm.name}
                  onChange={(e) => setReqForm({ ...reqForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-[#F7F6F2] border border-[#E5E3DC] rounded-lg text-xs focus:ring-1 focus:ring-[#14281D] focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="catalog-req-description" className="font-semibold text-stone-700">Instrucciones para el solicitante</label>
                <textarea id="catalog-req-description"
                  rows={3}
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
                  <label htmlFor="catalog-req-days" className="font-semibold text-stone-700 flex items-center gap-1">
                    <Clock size={12} />
                    <span>Días Hábiles Subsanación</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    id="catalog-req-days"
                    max="365"
                    disabled={!reqForm.is_subsanable}
                    value={reqForm.cure_deadline_days}
                    onChange={(e) => setReqForm({ ...reqForm, cure_deadline_days: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-[#F7F6F2] border border-[#E5E3DC] rounded-lg text-xs focus:ring-1 focus:ring-[#14281D] focus:outline-none disabled:opacity-40"
                  />
                  <span className="text-[10px] text-stone-400">Por defecto: 5 días hábiles</span>
                </div>

                <div className="space-y-1">
                  <label htmlFor="catalog-req-size" className="font-semibold text-stone-700">Tamaño máximo (MB)</label>
                  <input
                    type="number"
                    min="1"
                    id="catalog-req-size"
                    max="10"
                    value={reqForm.max_size_mb}
                    onChange={(e) => setReqForm({ ...reqForm, max_size_mb: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-[#F7F6F2] border border-[#E5E3DC] rounded-lg text-xs focus:ring-1 focus:ring-[#14281D] focus:outline-none"
                  />
                  <span className="text-[10px] text-stone-400">Máximo institucional: 10 MB</span>
                </div>
              </div>

              {/* Plantilla oficial descargable */}
              <div className="space-y-2">
                <label htmlFor="catalog-template" className="block font-semibold">Plantilla documental opcional</label>
                <p id="catalog-template-help" className="text-stone-600">PDF, Word DOCX o Excel XLSX. Máximo 10 MB. Reemplazar una plantilla conserva la versión de las solicitudes radicadas.</p>
                <input id="catalog-template" name="template" type="file" accept=".pdf,.docx,.xlsx" aria-describedby="catalog-template-help" disabled={saving} onChange={e => setTemplateFile(e.target.files?.[0] ?? null)} className="block min-h-12 w-full rounded border p-2" />
                {reqForm.template_url && <div className="flex flex-wrap gap-3"><TemplateDownload path={reqForm.template_url} /><button type="button" disabled={saving} onClick={() => { setReqForm(current => ({ ...current, template_url: '' })); setTemplateFile(null); }} className="min-h-12 text-rose-700">Retirar plantilla al guardar</button></div>}
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
                  type="submit" disabled={saving}
                  className="px-4 py-2 bg-[#14281D] hover:bg-[#1E3A2B] text-white font-bold rounded-lg cursor-pointer"
                >
                  {saving ? 'Guardando…' : editingReq ? 'Guardar Cambios' : 'Guardar Requisito'}
                </button>
              </div>
            </fieldset></form>
          </div>
        </>)}
      </ResponsiveOverlay>
    </div>
  );
}
