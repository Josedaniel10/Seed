import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { useAuthStore } from './features/auth/authStore.ts';
import { useCatalogStore } from './features/catalog/catalogStore.ts';
import { useGroupsStore } from './features/groups/groupsStore.ts';
import { useMinutesStore } from './features/minutes/minutesStore.ts';
import { useRequestStore } from './features/requests/requestStore.ts';
import { useCommitteeSessionsStore } from './features/sessions/committeeSessionsStore.ts';
import { useSessionStore } from './stores/session.store.ts';
import { useUserStore } from './features/users/userStore.ts';

const demoDataKeys = [
  'seed_auth_session',
  'seed_catalog_store',
  'seed_committee_sessions_store',
  'seed_minutes_store',
  'seed_notifications_store',
  'seed_research_groups',
  'seed_requests_store',
  'seed_session_store',
  'seed_users_management',
];

if (typeof window !== 'undefined') {
  for (const key of demoDataKeys) {
    window.localStorage.removeItem(key);
  }
}

useAuthStore.setState({
  profile: null,
  token: null,
  isAuthenticated: false,
  error: null,
});
useCatalogStore.setState({
  types: [],
  requirements: [],
  selectedTypeId: null,
  isInitialized: false,
  error: null,
});
useGroupsStore.setState({ groups: [], isInitialized: false, error: null });
useMinutesStore.setState({ minutes: [] });
useRequestStore.setState({
  requests: [],
  documents: [],
  auditHistory: [],
  assignments: [],
  observations: [],
  isInitialized: false,
});
useCommitteeSessionsStore.setState({
  sessions: [],
  agendaItems: [],
  attendances: [],
  decisions: [],
  nonDeliberations: [],
});
useSessionStore.setState({ user: null, isAuthenticated: false });
useUserStore.setState({ users: [], isInitialized: false, error: null });

if (typeof window !== 'undefined') {
  for (const key of demoDataKeys) {
    window.localStorage.removeItem(key);
  }
}

createRoot(document.getElementById('root')!).render(<App />);
