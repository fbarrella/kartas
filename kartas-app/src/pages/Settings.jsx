import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import UserDropdown from '../components/UserDropdown';
import Breadcrumb from '../components/Breadcrumb';
import AdminPaletteEditor from '../components/AdminPaletteEditor';
import AdminEmailSettings from '../components/AdminEmailSettings';
import AdminBackupSettings from '../components/AdminBackupSettings';
import TwoFactorSettings from '../components/TwoFactorSettings';
import '../components/navigation.css';
import kartasLogoWhite from '../assets/kartas-logo-white.png';

const Settings = () => {
    const { t } = useTranslation(['settings', 'common']);
    const { user, updateThemePreference, updateLanguagePreference } = useAuth();
    const [error, setError] = useState('');
    const isDark = user?.themePreference === 'dark';
    const isAdmin = user?.role === 'admin';
    // SET-01: two tabs — "Admin" only ever shown/reachable for admins at all,
    // not just visually disabled for everyone else.
    const [activeTab, setActiveTab] = useState('personal');
    // TFA-09: dismissible for this page visit only (not persisted) — reappears
    // on next load until the admin actually enables 2FA.
    const [twoFactorBannerDismissed, setTwoFactorBannerDismissed] = useState(false);

    const handleThemeToggle = async (e) => {
        setError('');
        const result = await updateThemePreference(e.target.checked ? 'dark' : 'light');
        if (!result.success) {
            setError(result.error);
        }
    };

    // I18N-04: not admin-gated — every user can change their own language,
    // matching the theme toggle right above it in the same "Appearance" card.
    const handleLanguageChange = async (e) => {
        setError('');
        const result = await updateLanguagePreference(e.target.value);
        if (!result.success) {
            setError(result.error);
        }
    };

    return (
        <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-background)' }}>
            {/* Header */}
            <header style={{
                backgroundColor: 'var(--color-primary)',
                color: 'white',
                padding: 'var(--spacing-md) 0',
                boxShadow: 'var(--shadow-md)'
            }}>
                <div className="container flex flex-between" style={{ alignItems: 'center' }}>
                    <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                        <img src={kartasLogoWhite} alt="Kartas" style={{ height: '36px' }} />
                        <span style={{ color: 'white', fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-semibold)' }}>Kartas</span>
                    </Link>
                    <UserDropdown />
                </div>
            </header>

            {/* Main Content */}
            <div className="container" style={{ marginTop: 'var(--spacing-xl)', maxWidth: '760px' }}>
                <Breadcrumb items={[{ label: t('settings:page.title') }]} />
                <div className="mb-md">
                    <Link to="/" className="btn btn-secondary btn-sm">
                        ← {t('settings:page.backToProjects')}
                    </Link>
                </div>

                <div className="flex flex-between mb-md" style={{ alignItems: 'center' }}>
                    <h2 style={{ margin: 0 }}>{t('settings:page.title')}</h2>
                </div>

                {error && <div className="form-error mb-md">{error}</div>}

                {/* SET-01: the whole tab bar — including "Personal" — only
                    renders for admins. A non-admin has nothing to switch
                    between, so no tab affordance should appear at all. */}
                {isAdmin && (
                    <div className="flex flex-gap-sm mb-lg">
                        <button
                            type="button"
                            className={`btn btn-sm ${activeTab === 'personal' ? 'btn-primary' : 'btn-secondary'}`}
                            onClick={() => setActiveTab('personal')}
                        >
                            {t('settings:page.tabs.personal')}
                        </button>
                        <button
                            type="button"
                            className={`btn btn-sm ${activeTab === 'admin' ? 'btn-primary' : 'btn-secondary'}`}
                            onClick={() => setActiveTab('admin')}
                        >
                            {t('settings:page.tabs.admin')}
                        </button>
                    </div>
                )}

                {(!isAdmin || activeTab === 'personal') && (
                    <div className="card">
                        <h2>{t('settings:page.appearance.title')}</h2>
                        <div className="form-group" style={{ marginBottom: 0, marginTop: 'var(--spacing-md)' }}>
                            <label className="switch switch-primary">
                                <input
                                    type="checkbox"
                                    checked={isDark}
                                    onChange={handleThemeToggle}
                                />
                                <span className="switch-track">
                                    <span className="switch-thumb" />
                                </span>
                                <span className="switch-text">{isDark ? t('settings:page.appearance.darkMode') : t('settings:page.appearance.lightMode')}</span>
                            </label>
                            <small className="text-muted" style={{ display: 'block', marginTop: 'var(--spacing-sm)' }}>{t('settings:page.appearance.themeHelp')}</small>
                        </div>

                        <div className="form-group" style={{ marginBottom: 0, marginTop: 'var(--spacing-lg)' }}>
                            <label className="form-label">{t('settings:page.appearance.language')}</label>
                            <select
                                className="form-select"
                                value={user?.languagePreference || 'en'}
                                onChange={handleLanguageChange}
                                style={{ maxWidth: '260px' }}
                            >
                                <option value="en">English</option>
                                <option value="es">Español</option>
                                <option value="pt-BR">Português (Brasil)</option>
                            </select>
                            <small className="text-muted" style={{ display: 'block', marginTop: 'var(--spacing-sm)' }}>{t('settings:page.appearance.languageHelp')}</small>
                        </div>
                    </div>
                )}

                {(!isAdmin || activeTab === 'personal') && (
                    <div className="card mt-lg">
                        <h2>{t('settings:page.twoFactor.title')}</h2>
                        <p className="text-muted mb-md" style={{ fontSize: 'var(--font-size-sm)' }}>
                            {t('settings:page.twoFactor.description')}
                        </p>
                        <TwoFactorSettings />
                    </div>
                )}

                {isAdmin && activeTab === 'admin' && (
                    <>
                        {!user?.twoFactorEnabled && !twoFactorBannerDismissed && (
                            <div className="card mb-lg" style={{ borderLeft: '4px solid var(--color-warning)' }}>
                                <div className="flex flex-between" style={{ alignItems: 'center' }}>
                                    <span>{t('settings:page.twoFactorBanner.message')}</span>
                                    <button
                                        type="button"
                                        className="btn btn-secondary btn-sm"
                                        onClick={() => setTwoFactorBannerDismissed(true)}
                                    >
                                        {t('common:close')}
                                    </button>
                                </div>
                            </div>
                        )}
                        <div className="card">
                            <h2>{t('settings:page.palette.title')}</h2>
                            <p className="text-muted mb-md" style={{ fontSize: 'var(--font-size-sm)' }}>
                                {t('settings:page.palette.description')}
                            </p>
                            <AdminPaletteEditor />
                        </div>

                        <div className="card mt-lg">
                            <h2>{t('settings:page.email.title')}</h2>
                            <p className="text-muted mb-md" style={{ fontSize: 'var(--font-size-sm)' }}>
                                {t('settings:page.email.description')}
                            </p>
                            <AdminEmailSettings />
                        </div>

                        <div className="card mt-lg">
                            <h2>{t('settings:page.backups.title')}</h2>
                            <p className="text-muted mb-md" style={{ fontSize: 'var(--font-size-sm)' }}>
                                {t('settings:page.backups.description')}
                            </p>
                            <AdminBackupSettings />
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default Settings;
