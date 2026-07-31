import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import enCommon from './locales/en/common.json';
import enAuth from './locales/en/auth.json';
import enDashboard from './locales/en/dashboard.json';
import enBacklog from './locales/en/backlog.json';
import enEpics from './locales/en/epics.json';
import enSprints from './locales/en/sprints.json';
import enKanban from './locales/en/kanban.json';
import enStoryDetail from './locales/en/storyDetail.json';
import enSettings from './locales/en/settings.json';
import enUsers from './locales/en/users.json';
import enNavigation from './locales/en/navigation.json';
import enSearch from './locales/en/search.json';
import enProject from './locales/en/project.json';

import esCommon from './locales/es/common.json';
import esAuth from './locales/es/auth.json';
import esDashboard from './locales/es/dashboard.json';
import esBacklog from './locales/es/backlog.json';
import esEpics from './locales/es/epics.json';
import esSprints from './locales/es/sprints.json';
import esKanban from './locales/es/kanban.json';
import esStoryDetail from './locales/es/storyDetail.json';
import esSettings from './locales/es/settings.json';
import esUsers from './locales/es/users.json';
import esNavigation from './locales/es/navigation.json';
import esSearch from './locales/es/search.json';
import esProject from './locales/es/project.json';

import ptBRCommon from './locales/pt-BR/common.json';
import ptBRAuth from './locales/pt-BR/auth.json';
import ptBRDashboard from './locales/pt-BR/dashboard.json';
import ptBRBacklog from './locales/pt-BR/backlog.json';
import ptBREpics from './locales/pt-BR/epics.json';
import ptBRSprints from './locales/pt-BR/sprints.json';
import ptBRKanban from './locales/pt-BR/kanban.json';
import ptBRStoryDetail from './locales/pt-BR/storyDetail.json';
import ptBRSettings from './locales/pt-BR/settings.json';
import ptBRUsers from './locales/pt-BR/users.json';
import ptBRNavigation from './locales/pt-BR/navigation.json';
import ptBRSearch from './locales/pt-BR/search.json';
import ptBRProject from './locales/pt-BR/project.json';

// I18N-01: all namespaces loaded eagerly at startup — the app is small enough
// that lazy per-namespace loading (the pattern recommended for very large
// multilingual apps) isn't worth the added complexity here.
const NAMESPACES = [
    'common', 'auth', 'dashboard', 'backlog', 'epics', 'sprints', 'kanban',
    'storyDetail', 'settings', 'users', 'navigation', 'search', 'project'
];

const resources = {
    en: {
        common: enCommon, auth: enAuth, dashboard: enDashboard, backlog: enBacklog, epics: enEpics,
        sprints: enSprints, kanban: enKanban, storyDetail: enStoryDetail, settings: enSettings,
        users: enUsers, navigation: enNavigation, search: enSearch, project: enProject
    },
    es: {
        common: esCommon, auth: esAuth, dashboard: esDashboard, backlog: esBacklog, epics: esEpics,
        sprints: esSprints, kanban: esKanban, storyDetail: esStoryDetail, settings: esSettings,
        users: esUsers, navigation: esNavigation, search: esSearch, project: esProject
    },
    'pt-BR': {
        common: ptBRCommon, auth: ptBRAuth, dashboard: ptBRDashboard, backlog: ptBRBacklog, epics: ptBREpics,
        sprints: ptBRSprints, kanban: ptBRKanban, storyDetail: ptBRStoryDetail, settings: ptBRSettings,
        users: ptBRUsers, navigation: ptBRNavigation, search: ptBRSearch, project: ptBRProject
    }
};

// I18N-01/I18N-03: deliberately not using i18next-browser-languagedetector's
// own localStorage caching — reading the cached preference here, synchronously
// at module-import time (before React mounts), mirrors DM-03's theme-preference
// pre-paint read exactly, keeping language driven by the same single
// account-level, localStorage-cached-before-paint pattern rather than a second,
// independent caching mechanism that could drift out of sync.
i18n.use(initReactI18next).init({
    resources,
    lng: localStorage.getItem('language') || 'en',
    fallbackLng: 'en',
    defaultNS: 'common',
    ns: NAMESPACES,
    interpolation: { escapeValue: false } // React already escapes
});

export default i18n;
