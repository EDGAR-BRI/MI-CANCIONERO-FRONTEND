import AppIcon from "@/components/Ui/AppIcon";
import { useBodyScrollLock } from "@/utils/useBodyScrollLock";
import React, { useState, useEffect } from 'react';
import { getMyMinistries, createMinistry, joinMinistryByCode, setMinistriesAuthToken } from '../services/ministries';
import { updateProfile } from '../services/auth';
import { showSuccessToast, showError } from '../utils/alerts';
import { isPWAStandalone, installPWA } from '@/utils/pwa';
import UserAvatar from './UserAvatar';
import { Blobatar } from '@blobatar/react';
import * as expressions from 'blobatar/expression';

export default function ProfileReact({ user, token }) {
    const [currentUser, setCurrentUser] = useState(user);
    const [loading, setLoading] = useState(true);
    const [ministries, setMinistries] = useState([]);
    const [pendingRequests, setPendingRequests] = useState([]);

    // PWA installation state
    const [isPwaInstalled, setIsPwaInstalled] = useState(false);
    const [installingPwa, setInstallingPwa] = useState(false);

    useEffect(() => {
        const updatePwaState = () => {
            setIsPwaInstalled(isPWAStandalone());
        };

        updatePwaState();

        const mediaQuery = window.matchMedia('(display-mode: standalone)');
        mediaQuery.addEventListener('change', updatePwaState);
        window.addEventListener('pwa-app-installed', updatePwaState);
        window.addEventListener('appinstalled', updatePwaState);

        return () => {
            mediaQuery.removeEventListener('change', updatePwaState);
            window.removeEventListener('pwa-app-installed', updatePwaState);
            window.removeEventListener('appinstalled', updatePwaState);
        };
    }, []);

    const handleInstallPwa = async () => {
        setInstallingPwa(true);
        try {
            const res = await installPWA();
            if (res.installed) {
                setIsPwaInstalled(true);
            }
        } finally {
            setInstallingPwa(false);
        }
    };

    // Modals state
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showJoinModal, setShowJoinModal] = useState(false);
    const [showAvatarModal, setShowAvatarModal] = useState(false);

    // Avatar customization state
    const [avatarTab, setAvatarTab] = useState('blobatar'); // 'blobatar' | 'url'
    const [selectedAvatar, setSelectedAvatar] = useState(null);
    const [customSeed, setCustomSeed] = useState('');
    const [customHue, setCustomHue] = useState(undefined); // number | undefined
    const [customExpr, setCustomExpr] = useState('idle'); // string
    const [customUrl, setCustomUrl] = useState('');
    const [seedSuggestions, setSeedSuggestions] = useState([]);
    const [savingAvatar, setSavingAvatar] = useState(false);

    const EXPRESSIONS = [
        { id: 'idle', name: 'Normal' },
        { id: 'happy', name: 'Feliz' },
        { id: 'sad', name: 'Triste' },
        { id: 'mad', name: 'Molesto' },
        { id: 'surprised', name: 'Sorpresa' },
        { id: 'wink', name: 'Guiño' },
        { id: 'sleepy', name: 'Sueño' },
        { id: 'smug', name: 'Confiado' },
        { id: 'unsure', name: 'Dudoso' },
        { id: 'scared', name: 'Asustado' },
        { id: 'love', name: 'Amor' },
        { id: 'shy', name: 'Tímido' },
        { id: 'sick', name: 'Enfermo' },
        { id: 'thinking', name: 'Pensando' }
    ];

    const COLOR_PRESETS = [
        { name: 'Original', hue: undefined, bg: 'bg-zinc-600' },
        { name: 'Ámbar Litúrgico', hue: 45, bg: 'bg-amber-400' },
        { name: 'Esmeralda', hue: 140, bg: 'bg-emerald-500' },
        { name: 'Turquesa', hue: 180, bg: 'bg-teal-400' },
        { name: 'Azul Mariano', hue: 220, bg: 'bg-blue-500' },
        { name: 'Púrpura Cuaresmal', hue: 280, bg: 'bg-purple-500' },
        { name: 'Rosa Laetare', hue: 330, bg: 'bg-pink-500' },
        { name: 'Rojo Pentecostés', hue: 15, bg: 'bg-red-500' }
    ];

    useEffect(() => {
        setCurrentUser(user);
    }, [user]);

    const buildBlobatarUrl = (seed, hue, expr) => {
        const defaultName = (currentUser?.name || currentUser?.email || 'Usuario').trim();
        const cleanSeed = (seed && seed.trim()) ? seed.trim() : defaultName;
        const params = new URLSearchParams();
        if (hue !== undefined && hue !== null && hue !== '') {
            params.set('hue', String(hue));
        }
        if (expr && expr !== 'idle') {
            params.set('expr', expr);
        }
        const qs = params.toString();
        return qs ? `blobatar:${cleanSeed}?${qs}` : `blobatar:${cleanSeed}`;
    };

    const generateRandomSeeds = (baseName) => {
        const words = ['armonia', 'melodia', 'canto', 'alegria', 'guitarra', 'piano', 'paz', 'fe', 'luz', 'sol', 'ritmo', 'coro', 'cielo', 'vida'];
        const shuffled = [...words].sort(() => 0.5 - Math.random());
        // El primer elemento siempre es el nombre del usuario
        return [baseName, ...shuffled.slice(0, 5)];
    };

    const openAvatarModal = () => {
        const defaultName = (currentUser?.name || currentUser?.email || 'Usuario').trim();
        const currentAvatar = currentUser?.avatarUrl || null;
        setSelectedAvatar(currentAvatar);

        if (currentAvatar?.startsWith('blobatar:')) {
            const raw = currentAvatar.slice(9);
            if (raw.includes('?')) {
                const [s, q] = raw.split('?');
                const params = new URLSearchParams(q);
                setCustomSeed(s || defaultName);
                const h = params.get('hue');
                setCustomHue(h !== null && !isNaN(Number(h)) ? Number(h) : undefined);
                const ex = params.get('expr');
                setCustomExpr(ex && expressions[ex] ? ex : 'idle');
            } else {
                setCustomSeed(raw || defaultName);
                setCustomHue(undefined);
                setCustomExpr('idle');
            }
            setAvatarTab('blobatar');
        } else if (currentAvatar) {
            setCustomUrl(currentAvatar);
            setCustomHue(undefined);
            setCustomExpr('idle');
            setAvatarTab('url');
        } else {
            // Por defecto: el nombre del usuario
            const defaultBlobatar = buildBlobatarUrl(defaultName, undefined, 'idle');
            setSelectedAvatar(defaultBlobatar);
            setAvatarTab('blobatar');
            setCustomSeed(defaultName);
            setCustomHue(undefined);
            setCustomExpr('idle');
        }
        setSeedSuggestions(generateRandomSeeds(defaultName));
        setShowAvatarModal(true);
    };

    // Edit profile (name, phone, password) state
    const [showEditProfileModal, setShowEditProfileModal] = useState(false);
    const [profileForm, setProfileForm] = useState({
        name: '',
        phoneNumber: '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [showPasswordFields, setShowPasswordFields] = useState(false);
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [savingProfile, setSavingProfile] = useState(false);

    const openEditProfileModal = () => {
        setProfileForm({
            name: currentUser?.name || '',
            phoneNumber: currentUser?.phoneNumber || '',
            currentPassword: '',
            newPassword: '',
            confirmPassword: ''
        });
        setShowPasswordFields(false);
        setShowCurrentPassword(false);
        setShowNewPassword(false);
        setShowEditProfileModal(true);
    };

    const handleSaveProfile = async (e) => {
        e.preventDefault();
        if (!profileForm.name.trim()) {
            showError("Campo requerido", "El nombre no puede estar vacío.");
            return;
        }

        const wantsPasswordChange = showPasswordFields || Boolean(profileForm.newPassword || profileForm.currentPassword);
        if (wantsPasswordChange) {
            if (!profileForm.newPassword) {
                showError("Campo requerido", "Ingresa la nueva contraseña que deseas establecer.");
                return;
            }
            if (profileForm.newPassword.length < 6) {
                showError("Contraseña muy corta", "La nueva contraseña debe tener al menos 6 caracteres.");
                return;
            }
            if (profileForm.newPassword !== profileForm.confirmPassword) {
                showError("Las contraseñas no coinciden", "La nueva contraseña y su confirmación deben ser exactamente iguales.");
                return;
            }
            if (!currentUser?.isGoogleUser && !profileForm.currentPassword) {
                showError("Contraseña actual requerida", "Debes ingresar tu contraseña actual para confirmar el cambio.");
                return;
            }
        }

        setSavingProfile(true);
        const updatePayload = {
            name: profileForm.name.trim(),
            phoneNumber: profileForm.phoneNumber.trim() || null
        };
        if (wantsPasswordChange && profileForm.newPassword) {
            updatePayload.newPassword = profileForm.newPassword;
            if (profileForm.currentPassword) {
                updatePayload.currentPassword = profileForm.currentPassword;
            }
        }

        const res = await updateProfile(updatePayload, token);
        setSavingProfile(false);

        if (res.success) {
            showSuccessToast("¡Perfil actualizado!", wantsPasswordChange ? "Tus datos y contraseña se han actualizado correctamente." : "Tus datos se han guardado exitosamente.");
            const updatedUser = res.data?.user || res.data?.data?.user;
            if (updatedUser) {
                setCurrentUser(updatedUser);
            } else {
                setCurrentUser(prev => ({
                    ...prev,
                    name: profileForm.name.trim(),
                    phoneNumber: profileForm.phoneNumber.trim() || null
                }));
            }
            setShowEditProfileModal(false);
            setTimeout(() => {
                window.location.reload();
            }, 600);
        } else {
            showError("Error al guardar", res.error || "No se pudo actualizar el perfil.");
        }
    };

    const handleSaveAvatar = async () => {
        setSavingAvatar(true);
        let avatarToSave = selectedAvatar;
        if (avatarTab === 'blobatar' && !avatarToSave) {
            avatarToSave = buildBlobatarUrl(customSeed, customHue, customExpr);
        } else if (avatarTab === 'url') {
            avatarToSave = customUrl.trim() || null;
        }

        const res = await updateProfile({ avatarUrl: avatarToSave }, token);
        setSavingAvatar(false);

        if (res.success) {
            showSuccessToast("¡Avatar actualizado!", "Tu nuevo avatar se ha guardado exitosamente.");
            const updatedUser = res.data?.user || res.data?.data?.user;
            if (updatedUser) {
                setCurrentUser(updatedUser);
            } else {
                setCurrentUser(prev => ({ ...prev, avatarUrl: avatarToSave }));
            }
            setShowAvatarModal(false);
            setTimeout(() => {
                window.location.reload();
            }, 600);
        } else {
            showError("Error al guardar", res.error || "No se pudo actualizar el avatar.");
        }
    };

    // Create form state
    const [createForm, setCreateForm] = useState({
        name: '',
        description: '',
        foundedAt: new Date().toISOString().split('T')[0],
        requireApproval: false,
        allowMemberInvites: false
    });
    const [creating, setCreating] = useState(false);

    // Join form state
    const [joinCode, setJoinCode] = useState('');
    const [joining, setJoining] = useState(false);

    const loadData = async () => {
        setLoading(true);
        try {
            if (token) setMinistriesAuthToken(token);
            const res = await getMyMinistries(token);
            if (res.success && res.data) {
                setMinistries(res.data.ministries || []);
                setPendingRequests(res.data.pendingRequests || []);
            } else {
                console.error("Error fetching ministries:", res.error);
            }
        } catch (err) {
            console.error("Error in loadData:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (token) setMinistriesAuthToken(token);
        loadData();
    }, [token]);

    const isAnyProfileModalOpen = showCreateModal || showJoinModal || showAvatarModal || showEditProfileModal;
    useBodyScrollLock(isAnyProfileModalOpen);

    const handleCreateSubmit = async (e) => {
        e.preventDefault();
        if (!createForm.name.trim()) {
            showError("Campo requerido", "Por favor ingresa un nombre para el ministerio.");
            return;
        }

        setCreating(true);
        const res = await createMinistry(createForm, token);
        setCreating(false);

        if (res.success) {
            showSuccessToast("¡Creado!", "El ministerio ha sido creado exitosamente.");
            setShowCreateModal(false);
            setCreateForm({
                name: '',
                description: '',
                foundedAt: new Date().toISOString().split('T')[0],
                requireApproval: false,
                allowMemberInvites: false
            });
            loadData();
        } else {
            showError("Error", res.error || "No se pudo crear el ministerio.");
        }
    };

    const handleJoinSubmit = async (e) => {
        e.preventDefault();
        let code = joinCode.trim();
        if (!code) {
            showError("Campo requerido", "Por favor ingresa un código de invitación.");
            return;
        }

        // If user pasted a full URL, extract the code
        if (code.includes('codigo=')) {
            code = code.split('codigo=')[1].split('&')[0];
        } else if (code.includes('/unirse/')) {
            code = code.split('/unirse/')[1].split('?')[0];
        }

        setJoining(true);
        const res = await joinMinistryByCode(code, token);
        setJoining(false);

        if (res.success) {
            if (res.data?.status === 'PENDING') {
                showSuccessToast("Solicitud enviada", "Un administrador del ministerio revisará tu solicitud.");
            } else {
                showSuccessToast("¡Te has unido!", "Ahora formas parte del ministerio.");
            }
            setShowJoinModal(false);
            setJoinCode('');
            loadData();
        } else {
            showError("No se pudo unir", res.error || "Código inválido o error al procesar.");
        }
    };

    return (
        <div className="space-y-8">
            {/* User Profile Card */}
            <div className="bg-[#171717] border border-white/10 rounded-2xl p-6 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-accent-main/5 rounded-full blur-3xl -z-10 pointer-events-none"></div>

                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                    {/* User Avatar with Google / Blobatar fallback and Edit Button */}
                    <div className="relative group shrink-0">
                        <UserAvatar
                            user={currentUser}
                            size="w-20 h-20"
                            rounded="rounded-2xl"
                            border="border-2 border-accent-main/40"
                        />
                        <button
                            type="button"
                            onClick={openAvatarModal}
                            title="Cambiar avatar"
                            className="absolute -bottom-1 -right-1 w-7 h-7 rounded-xl bg-accent-main hover:bg-amber-500 text-black flex items-center justify-center shadow-lg transition-transform hover:scale-110 active:scale-95 border-2 border-[#171717] cursor-pointer"
                        >
                            <AppIcon name="camera" className="text-[11px]" />
                        </button>
                    </div>

                    {/* User Info */}
                    <div className="flex-1 text-center sm:text-left space-y-2">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                            <h2 className="text-2xl font-bold text-white">{currentUser?.name || (currentUser?.role === 'MUSICO' ? 'Músico' : 'Usuario')}</h2>
                            {currentUser?.role === 'ADMIN' ? (
                                <span className="inline-block px-2.5 py-0.5 text-xs font-semibold rounded-full bg-purple-500/15 text-purple-400 border border-purple-500/30 w-fit mx-auto sm:mx-0">
                                    Admin del Sistema
                                </span>
                            ) : currentUser?.role === 'MUSICO' ? (
                                <span className="inline-block px-2.5 py-0.5 text-xs font-semibold rounded-full bg-accent-main/15 text-accent-main border border-accent-main/30 w-fit mx-auto sm:mx-0">
                                    Músico verificado
                                </span>
                            ) : (
                                <span className="inline-block px-2.5 py-0.5 text-xs font-semibold rounded-full bg-zinc-800 text-zinc-300 border border-white/10 w-fit mx-auto sm:mx-0">
                                    Usuario
                                </span>
                            )}
                        </div>
                        <p className="text-zinc-400 text-sm flex items-center justify-center sm:justify-start gap-2">
                            <AppIcon name="envelope" className="text-zinc-500" />
                            {currentUser?.email || 'Sin correo'}
                        </p>
                        {currentUser?.phoneNumber && (
                            <p className="text-zinc-400 text-sm flex items-center justify-center sm:justify-start gap-2">
                                <AppIcon name="phone" className="text-zinc-500" />
                                {currentUser.phoneNumber}
                            </p>
                        )}
                        <div className="pt-2 flex flex-wrap items-center justify-center sm:justify-start gap-2">
                            <button
                                type="button"
                                onClick={openAvatarModal}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-accent-main hover:text-amber-400 font-medium transition-colors cursor-pointer"
                            >
                                <AppIcon name="paintbrush" />
                                <span>Personalizar mi avatar</span>
                            </button>
                            <button
                                type="button"
                                onClick={openEditProfileModal}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-zinc-300 hover:text-white font-medium transition-colors cursor-pointer"
                            >
                                <AppIcon name="user-pen" />
                                <span>Editar mis datos</span>
                            </button>
                            {isPwaInstalled ? (
                                <span
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 font-medium"
                                    title="Cancionero está funcionando como aplicación instalada"
                                >
                                    <AppIcon name="circle-check" />
                                    <span>App instalada</span>
                                </span>
                            ) : (
                                <button
                                    type="button"
                                    onClick={handleInstallPwa}
                                    disabled={installingPwa}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-accent-main/15 hover:bg-accent-main/25 border border-accent-main/30 text-xs text-accent-main hover:text-white font-semibold transition-colors cursor-pointer disabled:opacity-50"
                                    title="Instalar Cancionero como App en tu dispositivo"
                                >
                                    <AppIcon name="download" />
                                    <span>{installingPwa ? 'Instalando...' : 'Instalar App'}</span>
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Logout Button */}
                    <div className="shrink-0">
                        <a
                            href="/logout"
                            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors"
                        >
                            <AppIcon name="arrow-right-from-bracket" />
                            <span>Cerrar Sesión</span>
                        </a>
                    </div>
                </div>
            </div>

            {/* Pending Requests Alert (if user has any pending) */}
            {pendingRequests.length > 0 && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-5 space-y-3">
                    <h3 className="text-sm font-semibold text-amber-400 flex items-center gap-2">
                        <AppIcon name="clock" />
                        <span>Solicitudes de Ingreso Pendientes ({pendingRequests.length})</span>
                    </h3>
                    <div className="grid gap-2">
                        {pendingRequests.map(req => (
                            <div key={req.ministryId} className="flex items-center justify-between bg-black/30 p-3 rounded-xl border border-white/5 text-sm">
                                <span className="font-medium text-white">{req.name}</span>
                                <span className="text-xs text-amber-300/80 bg-amber-500/20 px-2 py-0.5 rounded-full">
                                    En espera de aprobación
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Music Ministries Section Header & Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <AppIcon name="users-viewfinder" className="text-accent-main" />
                        <span>Mis Ministerios de Música</span>
                    </h3>
                    <p className="text-zinc-400 text-sm">
                        Agrupaciones litúrgicas, coros y bandas a las que perteneces.
                    </p>
                </div>

                <div className="grid grid-cols-2 sm:flex sm:items-center gap-2.5 sm:gap-3 w-full sm:w-auto">
                    <button
                        type="button"
                        onClick={() => setShowJoinModal(true)}
                        className="h-11 sm:h-10 px-2.5 sm:px-4 bg-[#262626] hover:bg-[#333333] border border-white/10 rounded-xl text-xs sm:text-sm font-semibold text-white transition-all shadow-md active:scale-95 flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer whitespace-nowrap min-w-0"
                    >
                        <AppIcon name="key" className="text-accent-main shrink-0 text-xs sm:text-sm" />
                        <span className="truncate">
                            Unirme <span className="hidden min-[380px]:inline">con Código</span>
                        </span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setShowCreateModal(true)}
                        className="h-11 sm:h-10 px-2.5 sm:px-4 bg-accent-main hover:bg-amber-600 rounded-xl text-xs sm:text-sm font-bold text-black transition-all shadow-lg shadow-accent-main/20 active:scale-95 flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer whitespace-nowrap min-w-0"
                    >
                        <AppIcon name="plus" className="shrink-0 text-xs sm:text-sm" />
                        <span className="truncate">
                            Crear <span className="hidden min-[380px]:inline">Ministerio</span>
                        </span>
                    </button>
                </div>
            </div>

            {/* Ministries Grid */}
            {loading ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="bg-[#171717] border border-white/10 rounded-2xl p-5 h-48 animate-pulse"></div>
                    ))}
                </div>
            ) : ministries.length === 0 ? (
                <div className="bg-[#171717] border border-white/10 border-dashed rounded-2xl p-12 text-center space-y-4">
                    <div className="w-16 h-16 rounded-full bg-accent-main/10 text-accent-main flex items-center justify-center mx-auto text-2xl">
                        <AppIcon name="music" />
                    </div>
                    <div className="space-y-1">
                        <h4 className="text-lg font-bold text-white">Aún no perteneces a ningún ministerio</h4>
                        <p className="text-zinc-400 text-sm max-w-md mx-auto">
                            Crea tu primer grupo para gestionar misas y repertorios con tu equipo, o únete a uno existente usando un código de invitación.
                        </p>
                    </div>
                    <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
                        <button
                            type="button"
                            onClick={() => setShowJoinModal(true)}
                            className="h-10 px-4 bg-[#262626] hover:bg-[#333333] border border-white/10 rounded-xl text-sm font-semibold text-white transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                        >
                            <AppIcon name="key" className="text-accent-main" />
                            <span>Unirme con Código</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setShowCreateModal(true)}
                            className="h-10 px-5 bg-accent-main hover:bg-amber-600 text-black font-bold text-sm rounded-xl transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                        >
                            <AppIcon name="plus" />
                            <span>Crear Ministerio</span>
                        </button>
                    </div>
                </div>
            ) : (
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {ministries.map(m => {
                        const isAdmin = m.myRole === 'ADMIN';
                        return (
                            <div
                                key={m.id}
                                className="bg-[#171717] border border-white/10 hover:border-accent-main/40 rounded-2xl p-5 transition-all duration-300 flex flex-col justify-between hover:shadow-xl hover:shadow-black/50 group"
                            >
                                <div className="space-y-3">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="w-12 h-12 rounded-xl bg-accent-main/10 border border-accent-main/20 text-accent-main flex items-center justify-center text-xl shrink-0 group-hover:scale-105 transition-transform">
                                            <AppIcon name="church" />
                                        </div>
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full ${isAdmin
                                                ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                                                : 'bg-zinc-800 text-zinc-300 border border-white/10'
                                            }`}>
                                            {isAdmin ? 'Administrador' : ' Miembro'}
                                        </span>
                                    </div>

                                    <div>
                                        <h4 className="text-lg font-bold text-white group-hover:text-accent-main transition-colors line-clamp-1">
                                            {m.name}
                                        </h4>
                                        <p className="text-zinc-400 text-xs line-clamp-2 mt-1">
                                            {m.description || 'Sin descripción.'}
                                        </p>
                                    </div>
                                </div>

                                <div className="pt-5 mt-4 border-t border-white/5 space-y-3">
                                    <div className="flex items-center justify-between text-xs text-zinc-400">
                                        <span className="flex items-center gap-1.5">
                                            <AppIcon name="user-group" className="text-zinc-500" />
                                            {m.memberCount} {m.memberCount === 1 ? 'integrante' : 'integrantes'}
                                        </span>
                                        {m.foundedAt && (
                                            <span className="flex items-center gap-1 text-zinc-500">
                                                <AppIcon name="calendar" />
                                                {new Date(m.foundedAt).toLocaleDateString('es-ES', { year: 'numeric', month: 'short' })}
                                            </span>
                                        )}
                                    </div>

                                    <a
                                        href={`/ministerios/${m.id}`}
                                        className="w-full inline-flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-[#262626] hover:bg-accent-main hover:text-black font-semibold text-xs text-white transition-all active:scale-95"
                                    >
                                        <span>Entrar al Ministerio</span>
                                        <AppIcon name="arrow-right" className="text-[10px]" />
                                    </a>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Modal: Crear Ministerio */}
            {showCreateModal && (
                <div
                    data-modal-open="true"
                    role="dialog"
                    aria-modal="true"
                    className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm animate-fadeIn overscroll-contain"
                    onClick={() => setShowCreateModal(false)}
                >
                    <div
                        className="bg-bg-secondary border border-white/10 rounded-2xl w-full max-w-lg p-5 sm:p-6 shadow-2xl relative space-y-5 max-h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-3.5rem)] overflow-y-auto scrollbar-thin my-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <AppIcon name="plus-circle" className="text-accent-main" />
                                <span>Crear Nuevo Ministerio</span>
                            </h3>
                            <button
                                type="button"
                                onClick={() => setShowCreateModal(false)}
                                className="p-1.5 sm:p-2 text-text-secondary hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer shrink-0 -mr-1 -mt-0.5"
                                title="Cerrar (Esc)"
                                aria-label="Cerrar modal"
                            >
                                <AppIcon name="xmark" className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleCreateSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                                    Nombre del Ministerio *
                                </label>
                                <input
                                    type="text"
                                    value={createForm.name}
                                    onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                                    placeholder="Ej. Coro Parroquial San Juan Bautista"
                                    required
                                    className="w-full px-4 py-2.5 bg-[#0a0a0a] border border-white/10 focus:border-accent-main rounded-xl text-white text-sm outline-none transition-colors"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                                    Descripción (Opcional)
                                </label>
                                <textarea
                                    value={createForm.description}
                                    onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                                    placeholder="Breve reseña, parroquia, comunidad o detalles del grupo..."
                                    rows="3"
                                    className="w-full px-4 py-2.5 bg-[#0a0a0a] border border-white/10 focus:border-accent-main rounded-xl text-white text-sm outline-none transition-colors resize-none"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                                    Fecha de Fundación / Creación
                                </label>
                                <input
                                    type="date"
                                    value={createForm.foundedAt}
                                    onChange={(e) => setCreateForm({ ...createForm, foundedAt: e.target.value })}
                                    className="w-full px-4 py-2.5 bg-[#0a0a0a] border border-white/10 focus:border-accent-main rounded-xl text-white text-sm outline-none transition-colors"
                                />
                            </div>

                            {/* Switches tipo WhatsApp */}
                            <div className="space-y-3 pt-2 border-t border-white/10">
                                <label className="flex items-center justify-between cursor-pointer gap-4">
                                    <div>
                                        <span className="text-sm font-medium text-white block">Aprobar nuevos miembros</span>
                                        <span className="text-xs text-zinc-400 block">Si está activo, los ingresos por enlace requieren confirmación de un admin.</span>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={createForm.requireApproval}
                                        onChange={(e) => setCreateForm({ ...createForm, requireApproval: e.target.checked })}
                                        className="w-5 h-5 accent-amber-500 rounded cursor-pointer"
                                    />
                                </label>

                                <label className="flex items-center justify-between cursor-pointer gap-4">
                                    <div>
                                        <span className="text-sm font-medium text-white block">Permitir que todos inviten</span>
                                        <span className="text-xs text-zinc-400 block">Cualquier miembro podrá compartir el código y aceptar solicitudes.</span>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={createForm.allowMemberInvites}
                                        onChange={(e) => setCreateForm({ ...createForm, allowMemberInvites: e.target.checked })}
                                        className="w-5 h-5 accent-amber-500 rounded cursor-pointer"
                                    />
                                </label>
                            </div>

                            <div className="pt-4 flex items-center justify-end gap-3 border-t border-white/10">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className="px-4 py-2 text-sm text-zinc-400 hover:text-white transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={creating}
                                    className="px-5 py-2.5 bg-accent-main hover:bg-amber-600 text-black font-bold text-sm rounded-xl transition-all shadow-lg active:scale-95 disabled:opacity-50"
                                >
                                    {creating ? 'Creando...' : 'Crear Ministerio'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Unirse con Código */}
            {showJoinModal && (
                <div
                    data-modal-open="true"
                    role="dialog"
                    aria-modal="true"
                    className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm animate-fadeIn overscroll-contain"
                    onClick={() => setShowJoinModal(false)}
                >
                    <div
                        className="bg-bg-secondary border border-white/10 rounded-2xl w-full max-w-md p-5 sm:p-6 shadow-2xl relative space-y-5 max-h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-3.5rem)] overflow-y-auto scrollbar-thin my-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <AppIcon name="key" className="text-accent-main" />
                                <span>Unirse a un Ministerio</span>
                            </h3>
                            <button
                                type="button"
                                onClick={() => setShowJoinModal(false)}
                                className="p-1.5 sm:p-2 text-text-secondary hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer shrink-0 -mr-1 -mt-0.5"
                                title="Cerrar (Esc)"
                                aria-label="Cerrar modal"
                            >
                                <AppIcon name="xmark" className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleJoinSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                                    Código o Enlace de Invitación
                                </label>
                                <input
                                    type="text"
                                    value={joinCode}
                                    onChange={(e) => setJoinCode(e.target.value)}
                                    placeholder="Ej. a8f3bc42 o pega el enlace completo..."
                                    required
                                    className="w-full px-4 py-2.5 bg-[#0a0a0a] border border-white/10 focus:border-accent-main rounded-xl text-white text-sm outline-none transition-colors"
                                />
                                <p className="text-zinc-500 text-xs mt-1.5">
                                    Pide el código de invitación al administrador de tu coro o agrupación.
                                </p>
                            </div>

                            <div className="pt-2 flex items-center justify-end gap-3 border-t border-white/10">
                                <button
                                    type="button"
                                    onClick={() => setShowJoinModal(false)}
                                    className="px-4 py-2 text-sm text-zinc-400 hover:text-white transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={joining}
                                    className="px-5 py-2.5 bg-accent-main hover:bg-amber-600 text-black font-bold text-sm rounded-xl transition-all shadow-lg active:scale-95 disabled:opacity-50"
                                >
                                    {joining ? 'Procesando...' : 'Unirme'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Personalizar Avatar */}
            {showAvatarModal && (
                <div
                    data-modal-open="true"
                    role="dialog"
                    aria-modal="true"
                    className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm animate-fadeIn overscroll-contain"
                    onClick={() => setShowAvatarModal(false)}
                >
                    <div
                        className="bg-bg-secondary border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl relative flex flex-col max-h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-3.5rem)] overflow-hidden my-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Fixed Top: Header & Live Preview (Solid background, takes 100% top width) */}
                        <div className="bg-bg-secondary border-b border-white/10 px-5 pt-5 pb-3.5 sm:px-7 sm:pt-6 space-y-3 shrink-0 z-10">
                            {/* Header */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 rounded-xl bg-accent-main/10 text-accent-main flex items-center justify-center text-sm">
                                        <AppIcon name="wand-magic-sparkles" />
                                    </div>
                                    <div>
                                        <h3 className="text-base font-bold text-white leading-tight">Personalizar Avatar</h3>
                                        <p className="text-[11px] text-zinc-400 leading-tight">Elige expresión, color o una foto por enlace</p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setShowAvatarModal(false)}
                                    className="p-1.5 sm:p-2 text-text-secondary hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer shrink-0 -mr-1 -mt-0.5"
                                    title="Cerrar (Esc)"
                                    aria-label="Cerrar modal"
                                >
                                    <AppIcon name="xmark" className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Live Preview */}
                            <div className="flex flex-col items-center justify-center py-1 space-y-2">
                                <div className="relative group cursor-pointer" title="¡Pasa el cursor por encima para ver la animación interactiva!">
                                    <UserAvatar
                                        user={{
                                            ...currentUser,
                                            avatarUrl: selectedAvatar
                                        }}
                                        animate="hover"
                                        size="w-20 h-20 sm:w-22 sm:h-22"
                                        rounded="rounded-2xl"
                                        border="border-4 border-accent-main shadow-xl shadow-accent-main/25"
                                    />
                                    {selectedAvatar && (
                                        <span className="absolute -top-2 -right-2 px-2 py-0.5 rounded-full bg-accent-main text-black text-[10px] font-black uppercase tracking-wider shadow-md">
                                            Nuevo
                                        </span>
                                    )}
                                </div>
                                <div className="text-center space-y-0.5">
                                    <span className="text-xs text-zinc-200 font-semibold block">
                                        {selectedAvatar?.startsWith('blobatar:')
                                            ? `Estilo: "${customSeed || currentUser?.name || 'Usuario'}" • ${customExpr} ${customHue !== undefined ? `• ${customHue}°` : ''}`
                                            : selectedAvatar
                                            ? 'Foto personalizada por enlace'
                                            : `Por defecto con tu nombre ("${currentUser?.name || 'Usuario'}")`}
                                    </span>
                                    <div className="flex items-center justify-center gap-1.5 text-[11px] text-amber-400 font-medium">
                                    
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const defaultName = (currentUser?.name || currentUser?.email || 'Usuario').trim();
                                            setSelectedAvatar(null);
                                            setCustomSeed(defaultName);
                                            setCustomHue(undefined);
                                            setCustomExpr('idle');
                                            setCustomUrl('');
                                        }}
                                        className="text-[11px] text-zinc-400 hover:text-amber-400 hover:underline cursor-pointer block mx-auto pt-0.5"
                                    >
                                        Restablecer a mi nombre original
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Scrollable Body: Content scrolls inside this container ONLY */}
                        <div className="overflow-y-auto px-5 py-4 sm:px-7 sm:py-5 space-y-5 sm:space-y-6 flex-1 min-h-0">

                        {/* Tabs */}
                        <div className="grid grid-cols-2 p-1.5 rounded-2xl bg-[#0a0a0a] border border-white/10 gap-1.5">
                            <button
                                type="button"
                                onClick={() => {
                                    setAvatarTab('blobatar');
                                    setSelectedAvatar(buildBlobatarUrl(customSeed, customHue, customExpr));
                                }}
                                className={`py-2 px-2.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer min-h-[40px] text-center ${
                                    avatarTab === 'blobatar'
                                        ? 'bg-accent-main text-black shadow-md font-extrabold'
                                        : 'text-zinc-400 hover:text-white hover:bg-white/5'
                                }`}
                            >
                                <AppIcon name="shapes" className="text-xs sm:text-sm shrink-0" />
                                <span className="truncate">
                                    <span className="hidden sm:inline">Estilo </span>Blobatar
                                </span>
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setAvatarTab('url');
                                    setSelectedAvatar(customUrl.trim() || null);
                                }}
                                className={`py-2 px-2.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer min-h-[40px] text-center ${
                                    avatarTab === 'url'
                                        ? 'bg-accent-main text-black shadow-md font-extrabold'
                                        : 'text-zinc-400 hover:text-white hover:bg-white/5'
                                }`}
                            >
                                <AppIcon name="link" className="text-xs sm:text-sm shrink-0" />
                                <span className="truncate">
                                    <span className="hidden sm:inline">Foto por </span>Enlace
                                </span>
                            </button>
                        </div>

                        {/* Tab: Blobatar */}
                        {avatarTab === 'blobatar' && (
                            <div className="space-y-4">
                                {/* Expression Selector */}
                                <div className="space-y-3 bg-[#0a0a0a] p-3.5 rounded-2xl border border-white/10">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                                            <AppIcon name="face-smile" className="text-accent-main" />
                                            <span>Expresión del Avatar</span>
                                        </span>
                                        <span className="text-xs font-mono text-accent-main font-bold">
                                            {customExpr} ({EXPRESSIONS.find(e => e.id === customExpr)?.name || 'Normal'})
                                        </span>
                                    </div>

                                    {/* 4-column grid matching the official Blobatar interface */}
                                    <div className="grid grid-cols-4 gap-2">
                                        {EXPRESSIONS.map((exprItem) => {
                                            const isSelected = customExpr === exprItem.id;
                                            return (
                                                <button
                                                    key={exprItem.id}
                                                    type="button"
                                                    onClick={() => {
                                                        setCustomExpr(exprItem.id);
                                                        setSelectedAvatar(buildBlobatarUrl(customSeed, customHue, exprItem.id));
                                                    }}
                                                    className={`py-2 px-1 rounded-2xl border transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer active:scale-95 group ${
                                                        isSelected
                                                            ? 'border-accent-main bg-accent-main/20 shadow-md shadow-accent-main/25 ring-2 ring-accent-main/40'
                                                            : 'border-white/10 bg-[#171717] hover:bg-white/5 hover:border-white/30'
                                                    }`}
                                                >
                                                    <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0 flex items-center justify-center pointer-events-none">
                                                        <Blobatar
                                                            name={customSeed || currentUser?.name || 'Usuario'}
                                                            hue={customHue}
                                                            expression={expressions[exprItem.id]}
                                                            animate="hover"
                                                            className="w-full h-full object-cover"
                                                        />
                                                    </div>
                                                    <span className={`text-[11px] font-mono leading-none tracking-tight ${isSelected ? 'text-accent-main font-bold' : 'text-zinc-300 group-hover:text-white'}`}>
                                                        {exprItem.id}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Color Editor */}
                                <div className="space-y-3 bg-[#0a0a0a] p-3.5 rounded-2xl border border-white/10">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                                            <AppIcon name="palette" className="text-accent-main" />
                                            <span>Editar Color del Avatar</span>
                                        </span>
                                        <span className="text-xs font-mono text-accent-main font-bold">
                                            {customHue !== undefined ? `${customHue}°` : 'Color original'}
                                        </span>
                                    </div>

                                    {/* Presets */}
                                    <div className="flex flex-wrap items-center gap-1.5">
                                        {COLOR_PRESETS.map((p) => {
                                            const isSelected = customHue === p.hue;
                                            return (
                                                <button
                                                    key={p.name}
                                                    type="button"
                                                    onClick={() => {
                                                        setCustomHue(p.hue);
                                                        setSelectedAvatar(buildBlobatarUrl(customSeed, p.hue, customExpr));
                                                    }}
                                                    className={`px-2.5 py-1 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all border cursor-pointer active:scale-95 ${
                                                        isSelected
                                                            ? 'border-accent-main bg-accent-main/15 text-white ring-2 ring-accent-main/30'
                                                            : 'border-white/10 bg-[#171717] text-zinc-400 hover:text-white hover:border-white/30'
                                                    }`}
                                                >
                                                    <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${p.bg}`}></span>
                                                    <span>{p.name}</span>
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {/* Hue Slider */}
                                    <div className="pt-1 space-y-1">
                                        <input
                                            type="range"
                                            min="0"
                                            max="360"
                                            value={customHue !== undefined ? customHue : 45}
                                            onChange={(e) => {
                                                const h = Number(e.target.value);
                                                setCustomHue(h);
                                                setSelectedAvatar(buildBlobatarUrl(customSeed, h, customExpr));
                                            }}
                                            className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                                            style={{
                                                background: 'linear-gradient(to right, #f43f5e, #fb923c, #facc15, #4ade80, #2dd4bf, #38bdf8, #818cf8, #c084fc, #f43f5e)'
                                            }}
                                        />
                                        <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
                                            <span>0° Rojo</span>
                                            <span>90° Verde</span>
                                            <span>180° Cian</span>
                                            <span>270° Violeta</span>
                                            <span>360°</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Suggestions Grid */}
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                                            Estilos Rápidos (Con tu color y expresión)
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const base = (currentUser?.name || currentUser?.email || 'Usuario').trim();
                                                setSeedSuggestions(generateRandomSeeds(base));
                                            }}
                                            className="inline-flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 font-medium active:scale-95 transition-transform cursor-pointer"
                                        >
                                            <AppIcon name="dice" />
                                            <span>Barajar opciones</span>
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                                        {seedSuggestions.map((s, idx) => {
                                            const isSelected = (customSeed || (currentUser?.name || 'Usuario').trim()) === s;
                                            const isMyName = idx === 0;
                                            return (
                                                <button
                                                    key={s}
                                                    type="button"
                                                    onClick={() => {
                                                        setCustomSeed(s);
                                                        setSelectedAvatar(buildBlobatarUrl(s, customHue, customExpr));
                                                    }}
                                                    className={`p-1.5 rounded-xl border-2 transition-all flex flex-col items-center gap-1 bg-[#0a0a0a] hover:scale-105 active:scale-95 cursor-pointer ${
                                                        isSelected
                                                            ? 'border-accent-main bg-accent-main/10 shadow-lg shadow-accent-main/20 ring-2 ring-accent-main/30'
                                                            : 'border-white/10 hover:border-white/30'
                                                    }`}
                                                >
                                                    <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0">
                                                        <Blobatar name={s} hue={customHue} expression={expressions[customExpr]} animate="hover" className="w-full h-full object-cover" />
                                                    </div>
                                                    <span className="text-[10px] text-zinc-400 font-mono truncate max-w-[55px]">
                                                        {isMyName ? 'Mi Nombre' : s}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Custom seed input */}
                                <div className="pt-1">
                                    <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                                        Clave / Semilla (Por defecto: tu nombre)
                                    </label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={customSeed}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                setCustomSeed(val);
                                                setSelectedAvatar(buildBlobatarUrl(val, customHue, customExpr));
                                            }}
                                            placeholder={`Ej: ${currentUser?.name || 'Edgar'}`}
                                            className="flex-1 px-4 py-2.5 bg-[#0a0a0a] border border-white/10 focus:border-accent-main rounded-xl text-white text-sm outline-none transition-colors"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const defaultName = (currentUser?.name || currentUser?.email || 'Usuario').trim();
                                                setCustomSeed(defaultName);
                                                setSelectedAvatar(buildBlobatarUrl(defaultName, customHue, customExpr));
                                            }}
                                            title="Usar mi nombre"
                                            className="px-3 bg-zinc-800 hover:bg-zinc-700 text-amber-400 rounded-xl text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer shrink-0"
                                        >
                                            <AppIcon name="user" />
                                            <span className="hidden sm:inline">Mi Nombre</span>
                                        </button>
                                    </div>
                                    <p className="text-[11px] text-zinc-500 mt-1">
                                        Cualquier palabra genera una combinación de ojos, boca y formas única.
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Tab: URL */}
                        {avatarTab === 'url' && (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                                        URL directa de la imagen:
                                    </label>
                                    <input
                                        type="url"
                                        value={customUrl}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            setCustomUrl(val);
                                            if (val.trim()) {
                                                setSelectedAvatar(val.trim());
                                            } else {
                                                setSelectedAvatar(null);
                                            }
                                        }}
                                        placeholder="https://ejemplo.com/mi-foto.png"
                                        className="w-full px-4 py-2.5 bg-[#0a0a0a] border border-white/10 focus:border-accent-main rounded-xl text-white text-sm outline-none transition-colors"
                                    />
                                    <p className="text-[11px] text-zinc-500 mt-1.5">
                                        Ingresa un enlace público a una imagen (PNG, JPG, WebP o SVG).
                                    </p>
                                </div>
                            </div>
                        )}
                        </div>

                        {/* Fixed Bottom: Action Buttons (Solid background, always visible) */}
                        <div className="bg-[#171717] border-t border-white/10 px-5 py-3 sm:px-7 sm:py-3.5 flex items-center justify-end gap-3 shrink-0 z-10">
                            <button
                                type="button"
                                onClick={() => setShowAvatarModal(false)}
                                className="px-4 py-2.5 text-sm text-zinc-400 hover:text-white transition-colors cursor-pointer"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={handleSaveAvatar}
                                disabled={savingAvatar}
                                className="px-6 py-2.5 bg-accent-main hover:bg-amber-600 text-black font-bold text-sm rounded-xl transition-all shadow-lg active:scale-95 disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                            >
                                {savingAvatar ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin"></div>
                                        <span>Guardando...</span>
                                    </>
                                ) : (
                                    <>
                                        <AppIcon name="check" />
                                        <span>Guardar Avatar</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: Editar Datos de Perfil */}
            {showEditProfileModal && (
                <div
                    data-modal-open="true"
                    role="dialog"
                    aria-modal="true"
                    className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm animate-fadeIn overscroll-contain"
                    onClick={() => setShowEditProfileModal(false)}
                >
                    <div
                        className="bg-bg-secondary border border-white/10 rounded-2xl w-full max-w-md shadow-2xl relative overflow-hidden my-auto max-h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-3.5rem)] flex flex-col"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="bg-bg-secondary border-b border-white/10 px-5 py-4 sm:px-6 flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-xl bg-accent-main/10 text-accent-main flex items-center justify-center text-sm shrink-0">
                                    <AppIcon name="user-pen" />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-white leading-tight">Editar Mis Datos</h3>
                                    <p className="text-[11px] text-zinc-400 leading-tight">Actualiza tu nombre, teléfono y contraseña de acceso</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowEditProfileModal(false)}
                                className="p-1.5 sm:p-2 text-text-secondary hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer shrink-0 -mr-1 -mt-0.5"
                                title="Cerrar (Esc)"
                                aria-label="Cerrar modal"
                            >
                                <AppIcon name="xmark" className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleSaveProfile} className="flex flex-col flex-1 min-h-0 overflow-hidden">
                            {/* Scrollable Body */}
                            <div className="p-5 sm:p-6 space-y-4 overflow-y-auto overscroll-contain flex-1 scrollbar-thin">
                                <div>
                                    <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                                        Nombre completo o visible:
                                    </label>
                                    <input
                                        type="text"
                                        value={profileForm.name}
                                        onChange={(e) => setProfileForm(prev => ({ ...prev, name: e.target.value }))}
                                        placeholder="Ej: Edgar Músico"
                                        required
                                        className="w-full px-4 py-2.5 bg-[#0a0a0a] border border-white/10 focus:border-accent-main rounded-xl text-white text-sm outline-none transition-colors"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                                        Teléfono / WhatsApp (opcional):
                                    </label>
                                    <input
                                        type="tel"
                                        value={profileForm.phoneNumber}
                                        onChange={(e) => setProfileForm(prev => ({ ...prev, phoneNumber: e.target.value }))}
                                        placeholder="Ej: +584121234567"
                                        className="w-full px-4 py-2.5 bg-[#0a0a0a] border border-white/10 focus:border-accent-main rounded-xl text-white text-sm outline-none transition-colors"
                                    />
                                    <p className="text-[11px] text-zinc-500 mt-1">
                                        Formato internacional con código de país (ej. +58 para Venezuela, +52 México, etc.).
                                    </p>
                                </div>

                                {/* Cambio de Contraseña Opcional */}
                                <div className="pt-2 border-t border-white/5">
                                    <button
                                        type="button"
                                        onClick={() => setShowPasswordFields(!showPasswordFields)}
                                        className="flex items-center justify-between w-full py-2 text-left text-xs font-semibold text-zinc-300 hover:text-white transition-colors cursor-pointer group"
                                    >
                                        <span className="flex items-center gap-2">
                                            <AppIcon name="lock" className="text-accent-main text-sm" />
                                            <span>Cambiar contraseña</span>
                                        </span>
                                        <span className="text-[11px] text-zinc-500 group-hover:text-accent-main transition-colors flex items-center gap-1 font-normal">
                                            <span>{showPasswordFields ? 'Cancelar cambio' : 'Modificar'}</span>
                                            <AppIcon name={showPasswordFields ? 'chevron-up' : 'chevron-down'} className="text-[10px]" />
                                        </span>
                                    </button>

                                    {showPasswordFields && (
                                        <div className="space-y-3 mt-2 p-3.5 bg-bg-main/60 rounded-xl border border-white/5">
                                            {!currentUser?.isGoogleUser ? (
                                                <div>
                                                    <label className="block text-[11px] font-semibold text-zinc-300 uppercase tracking-wider mb-1">
                                                        Contraseña actual:
                                                    </label>
                                                    <div className="relative">
                                                        <input
                                                            type={showCurrentPassword ? "text" : "password"}
                                                            value={profileForm.currentPassword}
                                                            onChange={(e) => setProfileForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                                                            placeholder="Tu contraseña actual"
                                                            className="w-full pl-3.5 pr-10 py-2 bg-bg-main border border-white/10 focus:border-accent-main rounded-xl text-white text-xs outline-none transition-colors"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition-colors cursor-pointer text-xs"
                                                            title={showCurrentPassword ? "Ocultar" : "Mostrar"}
                                                        >
                                                            <AppIcon name={showCurrentPassword ? "eye-slash" : "eye"} className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <p className="text-[11px] text-zinc-400">
                                                    Tu cuenta fue creada con Google. Puedes definir una contraseña si deseas iniciar sesión también mediante correo y contraseña.
                                                </p>
                                            )}

                                            <div>
                                                <label className="block text-[11px] font-semibold text-zinc-300 uppercase tracking-wider mb-1">
                                                    Nueva contraseña:
                                                </label>
                                                <div className="relative">
                                                    <input
                                                        type={showNewPassword ? "text" : "password"}
                                                        value={profileForm.newPassword}
                                                        onChange={(e) => setProfileForm(prev => ({ ...prev, newPassword: e.target.value }))}
                                                        placeholder="Mínimo 6 caracteres"
                                                        className="w-full pl-3.5 pr-10 py-2 bg-bg-main border border-white/10 focus:border-accent-main rounded-xl text-white text-xs outline-none transition-colors"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowNewPassword(!showNewPassword)}
                                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition-colors cursor-pointer text-xs"
                                                        title={showNewPassword ? "Ocultar" : "Mostrar"}
                                                    >
                                                        <AppIcon name={showNewPassword ? "eye-slash" : "eye"} className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-[11px] font-semibold text-zinc-300 uppercase tracking-wider mb-1">
                                                    Confirmar nueva contraseña:
                                                </label>
                                                <input
                                                    type={showNewPassword ? "text" : "password"}
                                                    value={profileForm.confirmPassword}
                                                    onChange={(e) => setProfileForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                                                    placeholder="Repite la nueva contraseña"
                                                    className="w-full px-3.5 py-2 bg-bg-main border border-white/10 focus:border-accent-main rounded-xl text-white text-xs outline-none transition-colors"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Actions Footer */}
                            <div className="px-5 sm:px-6 py-3.5 border-t border-white/10 flex items-center justify-end gap-3 shrink-0 bg-bg-secondary/95 backdrop-blur-xs">
                                <button
                                    type="button"
                                    onClick={() => setShowEditProfileModal(false)}
                                    className="px-4 py-2.5 text-xs sm:text-sm font-semibold text-text-secondary hover:text-white transition-colors cursor-pointer"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={savingProfile}
                                    className="px-5 sm:px-6 py-2.5 bg-accent-main hover:bg-accent-main/90 text-white font-bold text-xs sm:text-sm rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                                >
                                    {savingProfile ? (
                                        <>
                                            <AppIcon name="spinner" spin className="animate-spin text-sm" />
                                            <span>Guardando...</span>
                                        </>
                                    ) : (
                                        <>
                                            <AppIcon name="check" className="text-sm" />
                                            <span>Guardar Cambios</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

