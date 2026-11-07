import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  ApplicationDbStatus,
  AuditHistory,
  CommitteeSession,
  SessionAgendaItem,
  SessionAttendance,
  SessionDecision,
  SessionDecisionType,
  SessionType,
} from '../../types/database.ts';
import { useApplicationStore } from '../applications/applicationStore.ts';
import { useUserStore } from '../users/userStore.ts';

export interface CreateSessionPayload {
  session_type: SessionType;
  scheduled_at: string;
  location_or_url: string;
  quorum_required?: number;
}

export interface CommitteeSessionsState {
  sessions: CommitteeSession[];
  agendaItems: SessionAgendaItem[];
  attendances: SessionAttendance[];
  decisions: SessionDecision[];
  isLoading: boolean;

  // Acciones T4.1: Programación y Gestión de Sesiones
  createSession: (
    payload: CreateSessionPayload,
    actorId: string,
    actorName: string
  ) => Promise<{ success: boolean; session?: CommitteeSession; error?: string }>;
  getSessionById: (id: string) => CommitteeSession | undefined;

  // Acciones T4.2: Conformación de Agenda
  addApplicationToAgenda: (
    sessionId: string,
    applicationId: string,
    speakerId: string | null,
    actorId: string,
    actorName: string
  ) => Promise<{ success: boolean; agendaItem?: SessionAgendaItem; error?: string }>;
  removeApplicationFromAgenda: (
    sessionId: string,
    applicationId: string,
    actorId: string,
    actorName: string
  ) => Promise<{ success: boolean; error?: string }>;
  reorderAgenda: (
    sessionId: string,
    orderedAgendaIds: string[]
  ) => Promise<{ success: boolean; error?: string }>;
  getAgendaBySession: (sessionId: string) => SessionAgendaItem[];

  // Acciones T4.3: Cierre de Agenda y Convocatoria Formal
  closeAgendaAndSummon: (
    sessionId: string,
    actorId: string,
    actorName: string
  ) => Promise<{ success: boolean; session?: CommitteeSession; error?: string }>;

  // Acciones T4.4: Asistencia y Verificación Automática de Quórum
  initializeSessionAttendance: (sessionId: string) => void;
  toggleAttendance: (
    sessionId: string,
    userId: string,
    attended: boolean,
    notes?: string
  ) => void;
  checkSessionQuorum: (sessionId: string) => {
    hasQuorum: boolean;
    attendedCount: number;
    requiredCount: number;
    totalMembers: number;
  };
  getAttendanceBySession: (sessionId: string) => SessionAttendance[];

  // Acciones T4.5 & T4.6: Registro Formal de Decisiones y Trazabilidad Post-Decisión
  registerSessionDecision: (
    sessionId: string,
    applicationId: string,
    decision: SessionDecisionType,
    justification: string,
    registeredBy: string,
    registeredByName: string
  ) => Promise<{ success: boolean; decision?: SessionDecision; error?: string }>;
  getDecisionsBySession: (sessionId: string) => SessionDecision[];

  // Finalizar sesión colegiada
  finalizeSession: (
    sessionId: string,
    actorId: string,
    actorName: string
  ) => Promise<{ success: boolean; session?: CommitteeSession; error?: string }>;

  // Reset para tests
  resetToInitialSeed: () => void;
}

// Semilla inicial realista de sesiones
export const INITIAL_SESSIONS: CommitteeSession[] = [
  {
    id: 'ses-2026-004',
    session_number: 'Sesión Ordinaria Nº 04 - 2026',
    session_type: 'ORDINARIA',
    scheduled_at: '2026-11-12T09:00:00Z',
    location_or_url: 'Sala de Juntas de Vicerrectoría / Sala Virtual Institucional',
    quorum_required: 4, // Mayoría simple (4 de 7)
    is_agenda_closed: false,
    is_completed: false,
    created_at: '2026-11-01T10:00:00Z',
  },
  {
    id: 'ses-2026-003',
    session_number: 'Sesión Ordinaria Nº 03 - 2026',
    session_type: 'ORDINARIA',
    scheduled_at: '2026-10-28T14:00:00Z',
    location_or_url: 'Sala de Consejos Académicos',
    quorum_required: 4,
    is_agenda_closed: true,
    is_completed: true,
    created_at: '2026-10-15T09:00:00Z',
  },
];

export const INITIAL_AGENDA_ITEMS: SessionAgendaItem[] = [
  {
    id: 'agd-001',
    session_id: 'ses-2026-004',
    application_id: 'sol-005', // Cierre y Liquidación Proyecto Fitoquímica Avanzada (LISTA_COMITE)
    agenda_order: 1,
    speaker_id: 'usr-003',
    speaker_name: 'Dr. Alejandro Restrepo',
    created_at: '2026-11-02T11:00:00Z',
  },
];

export const INITIAL_ATTENDANCES: SessionAttendance[] = [
  // Miembros para Sesión 04
  {
    id: 'att-001',
    session_id: 'ses-2026-004',
    user_id: 'usr-003',
    user_name: 'Dr. Alejandro Restrepo',
    user_role: 'Presidente Delegado',
    attended: true,
    notes: 'Presencial',
    updated_at: '2026-11-02T11:00:00Z',
  },
  {
    id: 'att-002',
    session_id: 'ses-2026-004',
    user_id: 'usr-004',
    user_name: 'Dra. Patricia Salamanca',
    user_role: 'Secretaria Técnica',
    attended: true,
    notes: 'Presencial',
    updated_at: '2026-11-02T11:00:00Z',
  },
  {
    id: 'att-003',
    session_id: 'ses-2026-004',
    user_id: 'usr-001',
    user_name: 'Dra. Carmen Lucía Morales',
    user_role: 'Vocal de Investigaciones',
    attended: true,
    notes: 'Conexión Virtual',
    updated_at: '2026-11-02T11:00:00Z',
  },
  {
    id: 'att-004',
    session_id: 'ses-2026-004',
    user_id: 'usr-005',
    user_name: 'Dr. Germán Valenzuela',
    user_role: 'Representante de Líderes',
    attended: true,
    notes: 'Presencial',
    updated_at: '2026-11-02T11:00:00Z',
  },
  {
    id: 'att-005',
    session_id: 'ses-2026-004',
    user_id: 'usr-002',
    user_name: 'Lic. Fernando Ortiz',
    user_role: 'Invitado Administrativo',
    attended: true,
    notes: 'Con voz sin voto',
    updated_at: '2026-11-02T11:00:00Z',
  },
  {
    id: 'att-006',
    session_id: 'ses-2026-004',
    user_id: 'usr-006',
    user_name: 'Dr. Roberto Gómez',
    user_role: 'Vocal Académico',
    attended: false,
    notes: 'Excusa radicada por comisión académica',
    updated_at: '2026-11-02T11:00:00Z',
  },
  {
    id: 'att-007',
    session_id: 'ses-2026-004',
    user_id: 'usr-007',
    user_name: 'Dra. Elena Vargas',
    user_role: 'Representante de Posgrados',
    attended: false,
    notes: 'Pendiente confirmación',
    updated_at: '2026-11-02T11:00:00Z',
  },
];

export const INITIAL_DECISIONS: SessionDecision[] = [
  {
    id: 'dec-001',
    session_id: 'ses-2026-003',
    application_id: 'sol-004',
    decision: 'APROBADA',
    justification:
      'El comité verificó el cumplimiento del 100% de los entregables y la ejecución financiera conforme al reglamento.',
    registered_by: 'usr-004',
    created_at: '2026-10-28T16:30:00Z',
  },
];

export const useCommitteeSessionsStore = create<CommitteeSessionsState>()(
  persist(
    (set, get) => ({
      sessions: INITIAL_SESSIONS,
      agendaItems: INITIAL_AGENDA_ITEMS,
      attendances: INITIAL_ATTENDANCES,
      decisions: INITIAL_DECISIONS,
      isLoading: false,

      // =========================================================
      // T4.1: CREACIÓN Y PROGRAMACIÓN DE SESIONES (RF-24)
      // =========================================================
      createSession: async (payload, actorId, actorName) => {
        try {
          const sessions = get().sessions;
          const year = new Date(payload.scheduled_at).getFullYear() || 2026;
          const sameYearSessions = sessions.filter(
            (s) => new Date(s.scheduled_at).getFullYear() === year
          );

          // Numeración consecutiva (ej. Sesión Ordinaria Nº 05 - 2026)
          const nextNum = sameYearSessions.length + 1;
          const formattedNum = String(nextNum).padStart(2, '0');
          const typeLabel =
            payload.session_type === 'ORDINARIA' ? 'Sesión Ordinaria' : 'Sesión Extraordinaria';
          const sessionNumber = `${typeLabel} Nº ${formattedNum} - ${year}`;

          const newSessionId = `ses-${year}-${Date.now().toString(36)}`;
          const quorum = payload.quorum_required ?? 4; // Quórum reglamentario por defecto

          const newSession: CommitteeSession = {
            id: newSessionId,
            session_number: sessionNumber,
            session_type: payload.session_type,
            scheduled_at: payload.scheduled_at,
            location_or_url: payload.location_or_url.trim(),
            quorum_required: quorum,
            is_agenda_closed: false,
            is_completed: false,
            created_at: new Date().toISOString(),
          };

          set((state) => ({
            sessions: [newSession, ...state.sessions],
          }));

          // Inicializar automáticamente lista de asistencia con miembros del comité
          get().initializeSessionAttendance(newSessionId);

          return { success: true, session: newSession };
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Error al programar sesión.';
          return { success: false, error: msg };
        }
      },

      getSessionById: (id) => {
        return get().sessions.find((s) => s.id === id);
      },

      // =========================================================
      // T4.2: CONFORMACIÓN DE AGENDA CON SOLICITUDES LISTAS (RF-25, RN-04)
      // =========================================================
      addApplicationToAgenda: async (sessionId, applicationId, speakerId, actorId, actorName) => {
        const session = get().sessions.find((s) => s.id === sessionId);
        if (!session) {
          return { success: false, error: 'Sesión no encontrada.' };
        }

        // RN-04: No se admiten trámites adicionales si la agenda ya está cerrada
        if (session.is_agenda_closed) {
          return {
            success: false,
            error: 'RN-04: La agenda de la sesión se encuentra cerrada. No es posible incorporar más expedientes.',
          };
        }

        // RN-04: Solo solicitudes en estado LISTA_COMITE pueden incorporarse a la agenda
        const appStore = useApplicationStore.getState();
        const app = appStore.getApplicationById(applicationId);
        if (!app) {
          return { success: false, error: 'Solicitud no encontrada.' };
        }

        if (app.current_status !== 'LISTA_COMITE') {
          return {
            success: false,
            error: `RN-04: Solo los expedientes en estado "LISTA_COMITE" pueden incorporarse en la agenda. Estado actual: "${app.current_status}".`,
          };
        }

        // Verificar si ya está en la agenda
        const existingInAgenda = get().agendaItems.find(
          (a) => a.session_id === sessionId && a.application_id === applicationId
        );
        if (existingInAgenda) {
          return {
            success: false,
            error: 'El expediente ya se encuentra incorporado en el orden del día de esta sesión.',
          };
        }

        // Determinar nombre del ponente si se especificó
        let speakerName: string | null = null;
        if (speakerId) {
          const usersStore = useUserStore.getState();
          const speaker = usersStore.users.find((u) => u.id === speakerId);
          speakerName = speaker ? speaker.full_name : 'Ponente asignado';
        }

        const currentItems = get().agendaItems.filter((a) => a.session_id === sessionId);
        const nextOrder = currentItems.length + 1;

        const newAgendaItem: SessionAgendaItem = {
          id: `agd-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
          session_id: sessionId,
          application_id: applicationId,
          agenda_order: nextOrder,
          speaker_id: speakerId || null,
          speaker_name: speakerName,
          created_at: new Date().toISOString(),
        };

        set((state) => ({
          agendaItems: [...state.agendaItems, newAgendaItem],
        }));

        // Registrar en bitácora inmutable de la solicitud
        const auditEvent: AuditHistory = {
          id: `aud-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
          application_id: applicationId,
          actor_id: actorId,
          action: 'INCORPORACION_AGENDA_COMITE',
          previous_status: 'LISTA_COMITE' as ApplicationDbStatus,
          new_status: 'LISTA_COMITE' as ApplicationDbStatus,
          details: {
            session_id: sessionId,
            session_number: session.session_number,
            agenda_order: nextOrder,
            speaker_name: speakerName,
            actor_name: actorName,
            timestamp: new Date().toISOString(),
          },
          created_at: new Date().toISOString(),
        };

        useApplicationStore.setState((state) => ({
          auditHistory: [...state.auditHistory, auditEvent],
        }));

        return { success: true, agendaItem: newAgendaItem };
      },

      removeApplicationFromAgenda: async (sessionId, applicationId, actorId, actorName) => {
        const session = get().sessions.find((s) => s.id === sessionId);
        if (!session) {
          return { success: false, error: 'Sesión no encontrada.' };
        }

        if (session.is_agenda_closed) {
          return {
            success: false,
            error: 'RN-04: No es posible retirar expedientes una vez cerrada la agenda.',
          };
        }

        const remaining = get().agendaItems.filter(
          (a) => !(a.session_id === sessionId && a.application_id === applicationId)
        );

        // Reordenar secuencia consecutiva (1, 2, 3...)
        let order = 1;
        const reordered = remaining.map((item) => {
          if (item.session_id === sessionId) {
            return { ...item, agenda_order: order++ };
          }
          return item;
        });

        set({ agendaItems: reordered });
        return { success: true };
      },

      reorderAgenda: async (sessionId, orderedAgendaIds) => {
        const session = get().sessions.find((s) => s.id === sessionId);
        if (session?.is_agenda_closed) {
          return {
            success: false,
            error: 'RN-04: No es posible reordenar los temas de una agenda cerrada.',
          };
        }

        set((state) => {
          const updated = state.agendaItems.map((item) => {
            if (item.session_id === sessionId) {
              const newIndex = orderedAgendaIds.indexOf(item.id);
              if (newIndex !== -1) {
                return { ...item, agenda_order: newIndex + 1 };
              }
            }
            return item;
          });
          return { agendaItems: updated };
        });

        return { success: true };
      },

      getAgendaBySession: (sessionId) => {
        return get()
          .agendaItems.filter((a) => a.session_id === sessionId)
          .sort((a, b) => a.agenda_order - b.agenda_order);
      },

      // =========================================================
      // T4.3: CIERRE DE AGENDA Y CONVOCATORIA FORMAL (RF-26)
      // =========================================================
      closeAgendaAndSummon: async (sessionId, actorId, actorName) => {
        const session = get().sessions.find((s) => s.id === sessionId);
        if (!session) {
          return { success: false, error: 'Sesión no encontrada.' };
        }

        if (session.is_agenda_closed) {
          return { success: false, error: 'La agenda de esta sesión ya se encuentra formalmente cerrada.' };
        }

        const sessionAgenda = get().getAgendaBySession(sessionId);
        if (sessionAgenda.length === 0) {
          return {
            success: false,
            error: 'No se puede cerrar una agenda vacía. Incorpore al menos un expediente a deliberar.',
          };
        }

        const updatedSession: CommitteeSession = {
          ...session,
          is_agenda_closed: true,
        };

        set((state) => ({
          sessions: state.sessions.map((s) => (s.id === sessionId ? updatedSession : s)),
        }));

        return { success: true, session: updatedSession };
      },

      // =========================================================
      // T4.4: REGISTRO DE ASISTENCIA Y QUÓRUM REGLAMENTARIO (RF-27, RN-07)
      // =========================================================
      initializeSessionAttendance: (sessionId) => {
        const existing = get().attendances.filter((a) => a.session_id === sessionId);
        if (existing.length > 0) return;

        // Lista oficial de los 7 integrantes del comité institucional
        const defaultCommitteeMembers = [
          { id: 'usr-003', name: 'Dr. Alejandro Restrepo', role: 'Presidente Delegado' },
          { id: 'usr-004', name: 'Dra. Patricia Salamanca', role: 'Secretaria Técnica' },
          { id: 'usr-001', name: 'Dra. Carmen Lucía Morales', role: 'Vocal de Investigaciones' },
          { id: 'usr-005', name: 'Dr. Germán Valenzuela', role: 'Representante de Líderes' },
          { id: 'usr-002', name: 'Lic. Fernando Ortiz', role: 'Invitado Administrativo' },
          { id: 'usr-006', name: 'Dr. Roberto Gómez', role: 'Vocal Académico' },
          { id: 'usr-007', name: 'Dra. Elena Vargas', role: 'Representante de Posgrados' },
        ];

        const newAttendances: SessionAttendance[] = defaultCommitteeMembers.map((m, idx) => ({
          id: `att-${sessionId}-${m.id}`,
          session_id: sessionId,
          user_id: m.id,
          user_name: m.name,
          user_role: m.role,
          attended: idx < 4, // 4 miembros confirmados por defecto
          notes: idx < 4 ? 'Confirmado' : 'Pendiente',
          updated_at: new Date().toISOString(),
        }));

        set((state) => ({
          attendances: [...state.attendances, ...newAttendances],
        }));
      },

      toggleAttendance: (sessionId, userId, attended, notes) => {
        set((state) => ({
          attendances: state.attendances.map((a) => {
            if (a.session_id === sessionId && a.user_id === userId) {
              return {
                ...a,
                attended,
                notes: notes !== undefined ? notes : a.notes,
                updated_at: new Date().toISOString(),
              };
            }
            return a;
          }),
        }));
      },

      checkSessionQuorum: (sessionId) => {
        const session = get().sessions.find((s) => s.id === sessionId);
        const sessionAttendances = get().attendances.filter((a) => a.session_id === sessionId);
        const attendedCount = sessionAttendances.filter((a) => a.attended).length;
        const requiredCount = session ? session.quorum_required : 4;
        const totalMembers = sessionAttendances.length || 7;

        // RN-07: El quórum reglamentario exige al menos la mitad más uno de los miembros
        const hasQuorum = attendedCount >= requiredCount;

        return {
          hasQuorum,
          attendedCount,
          requiredCount,
          totalMembers,
        };
      },

      getAttendanceBySession: (sessionId) => {
        return get().attendances.filter((a) => a.session_id === sessionId);
      },

      // =========================================================
      // T4.5 & T4.6: REGISTRO FORMAL DE DECISIONES Y TRAZABILIDAD (RF-28, RN-05, RN-06, RF-23)
      // =========================================================
      registerSessionDecision: async (
        sessionId,
        applicationId,
        decision,
        justification,
        registeredBy,
        registeredByName
      ) => {
        const session = get().sessions.find((s) => s.id === sessionId);
        if (!session) {
          return { success: false, error: 'Sesión no encontrada.' };
        }

        // RN-07: Bloqueo estricto si no hay quórum reglamentario
        const quorum = get().checkSessionQuorum(sessionId);
        if (!quorum.hasQuorum) {
          return {
            success: false,
            error: `RN-07: No hay quórum reglamentario (${quorum.attendedCount} de ${quorum.requiredCount} requeridos). Está prohibido registrar votaciones o adoptar decisiones sin quórum.`,
          };
        }

        // RN-05: Toda decisión exige justificación motivada
        if (!justification || justification.trim().length === 0) {
          return {
            success: false,
            error: 'RN-05: El registro de la decisión colegiada exige una justificación motivada por escrito.',
          };
        }

        // Verificar que el expediente esté incorporado en la agenda de la sesión
        const inAgenda = get().agendaItems.find(
          (a) => a.session_id === sessionId && a.application_id === applicationId
        );
        if (!inAgenda) {
          return {
            success: false,
            error: 'El expediente no se encuentra incorporado en el orden del día de esta sesión.',
          };
        }

        // Crear o actualizar la decisión
        const existingDecision = get().decisions.find(
          (d) => d.session_id === sessionId && d.application_id === applicationId
        );

        const newDecision: SessionDecision = {
          id:
            existingDecision?.id ||
            `dec-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
          session_id: sessionId,
          application_id: applicationId,
          decision,
          justification: justification.trim(),
          registered_by: registeredBy,
          created_at: new Date().toISOString(),
        };

        set((state) => {
          const filtered = state.decisions.filter(
            (d) => !(d.session_id === sessionId && d.application_id === applicationId)
          );
          return { decisions: [newDecision, ...filtered] };
        });

        // T4.6: Actualización automática de estado y trazabilidad post-decisión
        const appStore = useApplicationStore.getState();

        if (decision === 'APLAZADA') {
          // RN-06: Si la solicitud es aplazada, PRESERVA su estado 'LISTA_COMITE' para ser deliberada en la siguiente sesión
          const auditEvent: AuditHistory = {
            id: `aud-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
            application_id: applicationId,
            actor_id: registeredBy,
            action: 'DECISION_COMITE_APLAZADA',
            previous_status: 'LISTA_COMITE' as ApplicationDbStatus,
            new_status: 'LISTA_COMITE' as ApplicationDbStatus, // Se preserva para la siguiente sesión (RN-06)
            details: {
              session_id: sessionId,
              session_number: session.session_number,
              decision: 'APLAZADA',
              justification: justification.trim(),
              registered_by_name: registeredByName,
              preserves_status: true,
              timestamp: new Date().toISOString(),
            },
            created_at: new Date().toISOString(),
          };

          useApplicationStore.setState((state) => ({
            auditHistory: [...state.auditHistory, auditEvent],
          }));

          return { success: true, decision: newDecision };
        } else {
          // APROBADA, APROBADA_CON_AJUSTES o RECHAZADA
          const transResult = await appStore.transitionApplicationStatus(
            applicationId,
            decision, // coincide exactamente con ApplicationDbStatus
            registeredBy,
            registeredByName,
            justification.trim(),
            {
              session_id: sessionId,
              session_number: session.session_number,
              decision,
              quorum_attendees: quorum.attendedCount,
              quorum_required: quorum.requiredCount,
            }
          );

          if (!transResult.success) {
            return {
              success: false,
              error: `Error al actualizar estado del expediente: ${transResult.error}`,
            };
          }

          return { success: true, decision: newDecision };
        }
      },

      getDecisionsBySession: (sessionId) => {
        return get().decisions.filter((d) => d.session_id === sessionId);
      },

      // Finalizar sesión colegiada
      finalizeSession: async (sessionId, actorId, actorName) => {
        const session = get().sessions.find((s) => s.id === sessionId);
        if (!session) {
          return { success: false, error: 'Sesión no encontrada.' };
        }

        const quorum = get().checkSessionQuorum(sessionId);
        if (!quorum.hasQuorum) {
          return {
            success: false,
            error: `RN-07: No se puede dar por finalizada la deliberación formal sin quórum reglamentario (${quorum.attendedCount} de ${quorum.requiredCount}).`,
          };
        }

        const updatedSession: CommitteeSession = {
          ...session,
          is_completed: true,
        };

        set((state) => ({
          sessions: state.sessions.map((s) => (s.id === sessionId ? updatedSession : s)),
        }));

        return { success: true, session: updatedSession };
      },

      resetToInitialSeed: () => {
        set({
          sessions: INITIAL_SESSIONS,
          agendaItems: INITIAL_AGENDA_ITEMS,
          attendances: INITIAL_ATTENDANCES,
          decisions: INITIAL_DECISIONS,
          isLoading: false,
        });
      },
    }),
    {
      name: 'seed_committee_sessions_store',
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
