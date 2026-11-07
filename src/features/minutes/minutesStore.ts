import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { CommitteeMinutes } from '../../types/database.ts';
import { useCommitteeSessionsStore } from '../sessions/committeeSessionsStore.ts';
import { useRequestStore } from '../requests/requestStore.ts';

export interface MinutesState {
  minutes: CommitteeMinutes[];
  isLoading: boolean;

  // Acciones T5.1: Consecutivo Anual Sin Saltos ni Duplicidades
  generateNextMinuteNumber: (year?: number) => Promise<string>;

  // Acciones T5.2: Borrador Consolidado a partir de Sesión
  generateDraftFromSession: (
    sessionId: string,
    actorId: string,
    actorName: string
  ) => Promise<{ success: boolean; minute?: CommitteeMinutes; error?: string }>;

  // Acciones T5.3: Edición de Compromisos y Aprobación Formal Inmutable
  updateDraftContent: (
    minuteId: string,
    draftContent: string,
    actorId: string,
    actorName: string
  ) => Promise<{ success: boolean; minute?: CommitteeMinutes; error?: string }>;
  approveMinutes: (
    minuteId: string,
    approvedBy: string,
    approvedByName: string
  ) => Promise<{ success: boolean; minute?: CommitteeMinutes; error?: string }>;

  // Acciones T5.4: Exportación Oficial y Almacenamiento Local de PDF
  exportMinutePdf: (
    minuteId: string
  ) => Promise<{ success: boolean; pdfUrl?: string; fileName?: string; error?: string }>;

  // Acciones T5.5: Consultas Históricas
  getMinutesById: (id: string) => CommitteeMinutes | undefined;
  getMinutesBySession: (sessionId: string) => CommitteeMinutes | undefined;
  searchMinutes: (query: string) => CommitteeMinutes[];

  resetToInitialSeed: () => void;
}

// Semilla inicial realista de actas institucionales aprobadas
export const INITIAL_MINUTES: CommitteeMinutes[] = [
  {
    id: 'min-2026-003',
    minute_number: 'Acta 003 de 2026',
    year: 2026,
    session_id: 'ses-2026-003',
    draft_content: `ACTA Nº 003 DE 2026 - SESIÓN ORDINARIA DEL COMITÉ DE INVESTIGACIONES

Fecha: 28 de Octubre de 2026 · 14:00 PM
Lugar: Sala de Consejos Académicos
Convocatoria: Sesión Ordinaria Nº 03 - 2026

1. ASISTENCIA Y QUÓRUM REGLAMENTARIO:
- Dr. Alejandro Restrepo (Presidente Delegado) - Presente
- Dra. Patricia Salamanca (Secretaria Técnica) - Presente
- Dra. Carmen Lucía Morales (Vocal de Investigaciones) - Presente
- Dr. Germán Valenzuela (Representante de Líderes) - Presente
- Lic. Fernando Ortiz (Invitado Administrativo) - Presente
- Dr. Roberto Gómez (Vocal Académico) - Presente
Quórum: 6 de 7 miembros. Sesión válidamente instalada con quórum reglamentario.

2. ORDEN DEL DÍA Y ACUERDOS:
Punto 1: Radicado 2026-004 - Informe Semestral Proyecto AgroTICs 2025-II
Decisión: APROBADA por unanimidad.
Justificación: El comité verificó el cumplimiento del 100% de los entregables y la ejecución financiera conforme al reglamento.

3. COMPROMISOS Y FIRMAS:
- Se remite constancia a la Vicerrectoría de Investigaciones para los trámites presupuestales respectivos.
- Firma: Presidente y Secretaria Técnica del Comité.`,
    is_approved: true,
    approved_at: '2026-10-28T17:00:00Z',
    pdf_path: 'file-service/storage/acta_003_2026_oficial.pdf',
    created_at: '2026-10-28T16:45:00Z',
  },
  {
    id: 'min-2026-002',
    minute_number: 'Acta 002 de 2026',
    year: 2026,
    session_id: 'ses-2026-002',
    draft_content: `ACTA Nº 002 DE 2026 - SESIÓN EXTRAORDINARIA DEL COMITÉ DE INVESTIGACIONES

Fecha: 14 de Octubre de 2026 · 10:00 AM
Lugar: Sala Virtual Institucional
Quórum verificado: 5 miembros asistentes.
Acuerdos adoptados: Aprobación de 4 avales de semilleros y asignación de presupuesto semilla.`,
    is_approved: true,
    approved_at: '2026-10-14T12:30:00Z',
    pdf_path: 'file-service/storage/acta_002_2026_oficial.pdf',
    created_at: '2026-10-14T12:00:00Z',
  },
  {
    id: 'min-2026-001',
    minute_number: 'Acta 001 de 2026',
    year: 2026,
    session_id: 'ses-2026-001',
    draft_content: `ACTA Nº 001 DE 2026 - SESIÓN ORDINARIA DE INSTALACIÓN ANUAL

Fecha: 30 de Septiembre de 2026 · 09:00 AM
Lugar: Sala de Juntas de Vicerrectoría
Quórum verificado: 7 miembros asistentes.
Acuerdos: Instalación formal del comité, aprobación del cronograma de sesiones 2026 y criterios de evaluación.`,
    is_approved: true,
    approved_at: '2026-09-30T11:45:00Z',
    pdf_path: 'file-service/storage/acta_001_2026_oficial.pdf',
    created_at: '2026-09-30T11:30:00Z',
  },
];

let minuteSeqLock: Promise<void> = Promise.resolve();

export const useMinutesStore = create<MinutesState>()(
  persist(
    (set, get) => ({
      minutes: INITIAL_MINUTES,
      isLoading: false,

      // =========================================================
      // T5.1: GENERACIÓN DE CONSECUTIVO ANUAL SIN SALTOS (RF-31)
      // Formato oficial: "Acta 001 de 2026"
      // =========================================================
      generateNextMinuteNumber: async (year = 2026) => {
        await minuteSeqLock;

        const generateTask = (async () => {
          const currentMinutes = get().minutes;
          const sameYearMinutes = currentMinutes.filter((m) => m.year === year);

          let maxSeq = 0;
          for (const m of sameYearMinutes) {
            const match = m.minute_number.match(/Acta\s+(\d+)\s+de\s+\d{4}/i);
            if (match) {
              const num = parseInt(match[1], 10);
              if (!isNaN(num) && num > maxSeq) {
                maxSeq = num;
              }
            }
          }

          const nextSeq = maxSeq + 1;
          const formattedSeq = String(nextSeq).padStart(3, '0');
          return `Acta ${formattedSeq} de ${year}`;
        })();

        minuteSeqLock = generateTask.then(() => {});
        return generateTask;
      },

      // =========================================================
      // T5.2: GENERACIÓN DE BORRADOR CONSOLIDADO (RF-29)
      // =========================================================
      generateDraftFromSession: async (sessionId, actorId, actorName) => {
        const sessionsStore = useCommitteeSessionsStore.getState();
        const session = sessionsStore.getSessionById(sessionId);

        if (!session) {
          return { success: false, error: 'Sesión no encontrada.' };
        }

        // Si ya existe un acta para esta sesión, retornarla
        const existing = get().minutes.find((m) => m.session_id === sessionId);
        if (existing) {
          return { success: true, minute: existing };
        }

        const appStore = useRequestStore.getState();
        const agenda = sessionsStore.getAgendaBySession(sessionId);
        const attendances = sessionsStore.getAttendanceBySession(sessionId);
        const quorum = sessionsStore.checkSessionQuorum(sessionId);
        const decisions = sessionsStore.getDecisionsBySession(sessionId);

        const year = new Date(session.scheduled_at).getFullYear() || 2026;
        const nextNumber = await get().generateNextMinuteNumber(year);

        // Construir contenido estructurado consolidado (RF-29)
        const scheduledDate = new Date(session.scheduled_at).toLocaleString('es-CO');
        const attendeesList = attendances
          .filter((a) => a.attended)
          .map((a) => `- ${a.user_name} (${a.user_role}) · ${a.notes || 'Asistió'}`)
          .join('\n');

        const absenteesList = attendances
          .filter((a) => !a.attended)
          .map((a) => `- ${a.user_name} (${a.user_role}) · ${a.notes || 'Ausente'}`)
          .join('\n');

        let agreementsText = '';
        if (decisions.length === 0) {
          agreementsText = 'No se registraron decisiones colegiadas durante la sesión.';
        } else {
          agreementsText = decisions
            .map((dec, idx) => {
              const app = appStore.getApplicationById(dec.application_id);
              const appTitle = app ? app.title : 'Solicitud';
              const appNum = app ? app.filing_number : dec.application_id;
              return `Acuerdo ${idx + 1} [${appNum} - ${dec.decision}]:\nRespecto al expediente "${appTitle}", el Comité decide: ${dec.decision}.\nFundamento motivado: ${dec.justification}`;
            })
            .join('\n\n');
        }

        const draftContent = `${nextNumber.toUpperCase()} DE SESIÓN ${session.session_type} DEL COMITÉ DE INVESTIGACIONES

Fecha y hora: ${scheduledDate}
Lugar / Enlace: ${session.location_or_url}
Convocatoria oficial: ${session.session_number}

1. ASISTENCIA Y QUÓRUM REGLAMENTARIO (RN-07):
Miembros Asistentes (${quorum.attendedCount} de ${quorum.totalMembers}):
${attendeesList || '- Ninguno registrado'}

Miembros Ausentes:
${absenteesList || '- Ninguno'}

Dictamen de Quórum: ${quorum.hasQuorum ? 'HAY QUÓRUM REGLAMENTARIO VÁLIDO' : 'SIN QUÓRUM'} (Mínimo exigido: ${session.quorum_required} integrantes).

2. ORDEN DEL DÍA Y ASUNTOS TRATADOS:
${agenda.map((a) => `${a.agenda_order}. ${appStore.getApplicationById(a.application_id)?.filing_number || a.application_id} - ${appStore.getApplicationById(a.application_id)?.title || 'Trámite'} (Ponente: ${a.speaker_name || 'Sin ponente'})`).join('\n') || 'Sin temas en agenda.'}

3. ACUERDOS Y DECISIONES ADOPTADAS:
${agreementsText}

4. COMPROMISOS Y ACCIONES DE SEGUIMIENTO:
- Secretaría Técnica notificará a los investigadores solicitantes los acuerdos adoptados en la presente sesión.
- Las solicitudes en estado 'Aprobada' continuarán a trámite de resolución institucional de aval.
- Los expedientes con decisión 'Aplazada' serán incorporados en el orden del día de la siguiente sesión ordinaria (RN-06).

Constancia de elaboración por: ${actorName} (${actorId}).`;

        const newMinute: CommitteeMinutes = {
          id: `min-${year}-${Date.now().toString(36)}`,
          minute_number: nextNumber,
          year,
          session_id: sessionId,
          draft_content: draftContent,
          is_approved: false,
          approved_at: null,
          pdf_path: null,
          created_at: new Date().toISOString(),
        };

        set((state) => ({
          minutes: [newMinute, ...state.minutes],
        }));

        return { success: true, minute: newMinute };
      },

      // =========================================================
      // T5.3: EDICIÓN Y APROBACIÓN FORMAL INMUTABLE (RF-30, RNF-03)
      // =========================================================
      updateDraftContent: async (minuteId, draftContent, actorId, actorName) => {
        const minute = get().minutes.find((m) => m.id === minuteId);
        if (!minute) {
          return { success: false, error: 'Acta no encontrada.' };
        }

        // RNF-03: Las actas aprobadas son formalmente inmutables
        if (minute.is_approved) {
          return {
            success: false,
            error: 'RNF-03: Operación denegada. El acta ya se encuentra formalmente aprobada y firmada, constituyendo un registro inmutable.',
          };
        }

        const updated: CommitteeMinutes = {
          ...minute,
          draft_content: draftContent,
        };

        set((state) => ({
          minutes: state.minutes.map((m) => (m.id === minuteId ? updated : m)),
        }));

        return { success: true, minute: updated };
      },

      approveMinutes: async (minuteId, approvedBy, approvedByName) => {
        const minute = get().minutes.find((m) => m.id === minuteId);
        if (!minute) {
          return { success: false, error: 'Acta no encontrada.' };
        }

        if (minute.is_approved) {
          return {
            success: false,
            error: 'El acta ya fue aprobada previamente por el comité.',
          };
        }

        const nowIso = new Date().toISOString();
        const safeSlug = minute.minute_number.toLowerCase().replace(/\s+/g, '_');
        const pdfGeneratedPath = `file-service/storage/${safeSlug}_firmada.pdf`;

        const approvedMinute: CommitteeMinutes = {
          ...minute,
          is_approved: true,
          approved_at: nowIso,
          pdf_path: pdfGeneratedPath,
        };

        set((state) => ({
          minutes: state.minutes.map((m) => (m.id === minuteId ? approvedMinute : m)),
        }));

        return { success: true, minute: approvedMinute };
      },

      // =========================================================
      // T5.4: EXPORTACIÓN Y DESCARGA OFICIAL DE ACTA EN PDF (RF-31)
      // =========================================================
      exportMinutePdf: async (minuteId) => {
        const minute = get().minutes.find((m) => m.id === minuteId);
        if (!minute) {
          return { success: false, error: 'Acta no encontrada.' };
        }

        const safeSlug = minute.minute_number.toLowerCase().replace(/\s+/g, '_');
        const fileName = `${safeSlug}_oficial.txt`;

        // Generar Blob estructurado local con codificación UTF-8
        const blob = new Blob([minute.draft_content], { type: 'text/plain;charset=utf-8' });
        const pdfUrl = URL.createObjectURL(blob);

        return {
          success: true,
          pdfUrl,
          fileName,
        };
      },

      // =========================================================
      // T5.5: MÓDULO DE CONSULTA HISTÓRICA DE ACTAS Y DECISIONES (RF-32)
      // =========================================================
      getMinutesById: (id) => {
        return get().minutes.find((m) => m.id === id);
      },

      getMinutesBySession: (sessionId) => {
        return get().minutes.find((m) => m.session_id === sessionId);
      },

      searchMinutes: (query) => {
        const q = query.trim().toLowerCase();
        if (!q) return get().minutes;

        return get().minutes.filter(
          (m) =>
            m.minute_number.toLowerCase().includes(q) ||
            m.draft_content.toLowerCase().includes(q) ||
            String(m.year).includes(q)
        );
      },

      resetToInitialSeed: () => {
        set({
          minutes: INITIAL_MINUTES,
          isLoading: false,
        });
      },
    }),
    {
      name: 'seed_minutes_store',
      storage: createJSONStorage(() => {
        if (typeof window !== 'undefined' && window.localStorage) {
          return window.localStorage;
        }
        return {
          getItem: () => null,
          setItem: () => {},
          removeItem: () => {},
        };
      }),
    }
  )
);
