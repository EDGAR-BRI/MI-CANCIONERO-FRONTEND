import AppIcon from "@/components/Ui/AppIcon";
import { useBodyScrollLock } from "@/utils/useBodyScrollLock";
import React, { useState, useEffect } from 'react';
import {
    getMinistryById,
    updateMinistry,
    updateMemberRole,
    removeMember,
    searchUsersToInvite,
    addMemberDirectly,
    handlePendingRequest,
    regenerateInviteCode,
    deleteMinistry,
    setMinistriesAuthToken
} from '../services/ministries';
import { showSuccessToast, showError, showConfirm } from '../utils/alerts';
import UserAvatar from './UserAvatar';

export default function MinistryWorkspaceReact({ ministryId, currentUser, token }) {
    const [loading, setLoading] = useState(true);
    const [ministry, setMinistry] = useState(null);
    const [activeTab, setActiveTab] = useState('miembros'); // 'miembros' | 'solicitudes' | 'misas' | 'ajustes'
    const [copiedLink, setCopiedLink] = useState(false);

    // Member search modal state
    const [showAddMemberModal, setShowAddMemberModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searching, setSearching] = useState(false);
    const [addingUserId, setAddingUserId] = useState(null);

    // Edit settings form state
    const [settingsForm, setSettingsForm] = useState({
        name: '',
        description: '',
        foundedAt: '',
        requireApproval: false,
        allowMemberInvites: false
    });
    const [savingSettings, setSavingSettings] = useState(false);

    const loadMinistry = async () => {
        setLoading(true);
        if (token) setMinistriesAuthToken(token);
        const res = await getMinistryById(ministryId, token);
        if (res.success && res.data) {
            setMinistry(res.data);
            setSettingsForm({
                name: res.data.name || '',
                description: res.data.description || '',
                foundedAt: res.data.foundedAt ? res.data.foundedAt.split('T')[0] : '',
                requireApproval: res.data.requireApproval || false,
                allowMemberInvites: res.data.allowMemberInvites || false
            });
        } else {
            showError("Error", res.error || "No se pudo cargar la información del ministerio.");
        }
        setLoading(false);
    };

    useEffect(() => {
        if (token) setMinistriesAuthToken(token);
        loadMinistry();
    }, [ministryId, token]);

    useBodyScrollLock(showAddMemberModal);

    // Handle user search in add member modal
    useEffect(() => {
        const delayDebounce = setTimeout(async () => {
            if (searchQuery.trim().length >= 2) {
                setSearching(true);
                const res = await searchUsersToInvite(ministryId, searchQuery);
                if (res.success && res.data) {
                    setSearchResults(res.data);
                }
                setSearching(false);
            } else {
                setSearchResults([]);
            }
        }, 300);

        return () => clearTimeout(delayDebounce);
    }, [searchQuery, ministryId]);

    const handleAddDirect = async (userToAdd) => {
        setAddingUserId(userToAdd.id);
        const res = await addMemberDirectly(ministryId, { userId: userToAdd.id });
        setAddingUserId(null);

        if (res.success) {
            showSuccessToast("Agregado", `${userToAdd.name} ahora es parte del ministerio.`);
            setSearchResults(searchResults.filter(u => u.id !== userToAdd.id));
            loadMinistry();
        } else {
            showError("Error", res.error || "No se pudo agregar al integrante.");
        }
    };

    const handleRoleChange = async (member, newRole) => {
        const actionLabel = newRole === 'ADMIN' ? 'Hacer Administrador' : 'Degradar a Miembro';
        const confirm = await showConfirm(
            `¿${actionLabel}?`,
            `¿Estás seguro de cambiar el rol de ${member.name} a ${newRole === 'ADMIN' ? 'Administrador' : 'Miembro'}?`,
            "Sí, cambiar",
            "Cancelar"
        );
        if (!confirm.isConfirmed) return;

        const res = await updateMemberRole(ministryId, member.userId, newRole);
        if (res.success) {
            showSuccessToast("Rol actualizado", `El rol de ${member.name} fue cambiado.`);
            loadMinistry();
        } else {
            showError("No se pudo cambiar el rol", res.error || "Error al actualizar.");
        }
    };

    const handleRemoveMember = async (member, isSelf = false) => {
        const title = isSelf ? "¿Abandonar ministerio?" : `¿Expulsar a ${member.name}?`;
        const text = isSelf
            ? "Ya no tendrás acceso a las misas ni ajustes de este ministerio."
            : `El usuario ${member.name} será removido del ministerio.`;

        const confirm = await showConfirm(title, text, isSelf ? "Sí, salir" : "Sí, expulsar", "Cancelar");
        if (!confirm.isConfirmed) return;

        const res = await removeMember(ministryId, member.userId);
        if (res.success) {
            showSuccessToast("Completado", isSelf ? "Has salido del ministerio." : "Integrante removido.");
            if (isSelf) {
                window.location.href = "/perfil";
            } else {
                loadMinistry();
            }
        } else {
            showError("Error", res.error || "No se pudo completar la acción.");
        }
    };

    const handleRequestDecision = async (request, action) => {
        const res = await handlePendingRequest(ministryId, request.userId, action);
        if (res.success) {
            showSuccessToast(action === 'ACCEPT' ? "Aceptado" : "Rechazado", res.data?.message || "Solicitud resuelta.");
            loadMinistry();
        } else {
            showError("Error", res.error || "No se pudo procesar la solicitud.");
        }
    };

    const handleSaveSettings = async (e) => {
        e.preventDefault();
        setSavingSettings(true);
        const res = await updateMinistry(ministryId, settingsForm);
        setSavingSettings(false);

        if (res.success) {
            showSuccessToast("Ajustes guardados", "La configuración ha sido actualizada correctamente.");
            loadMinistry();
        } else {
            showError("Error", res.error || "No se pudieron guardar los cambios.");
        }
    };

    const handleRegenerateCode = async () => {
        const confirm = await showConfirm(
            "¿Regenerar enlace de invitación?",
            "El código anterior dejará de funcionar inmediatamente para nuevas personas.",
            "Sí, regenerar",
            "Cancelar"
        );
        if (!confirm.isConfirmed) return;

        const res = await regenerateInviteCode(ministryId);
        if (res.success) {
            showSuccessToast("Regenerado", "Se ha creado un nuevo enlace de invitación.");
            loadMinistry();
        } else {
            showError("Error", res.error || "No se pudo regenerar el enlace.");
        }
    };

    const handleDeleteMinistry = async () => {
        const confirm = await showConfirm(
            "¿Eliminar este ministerio?",
            "Esta acción es irreversible y eliminará el grupo y su lista de miembros.",
            "Sí, eliminar definitivamente",
            "Cancelar"
        );
        if (!confirm.isConfirmed) return;

        const res = await deleteMinistry(ministryId);
        if (res.success) {
            showSuccessToast("Eliminado", "El ministerio ha sido eliminado.");
            window.location.href = "/perfil";
        } else {
            showError("Error", res.error || "No se pudo eliminar el ministerio.");
        }
    };

    const getInviteUrl = () => {
        if (!ministry?.inviteCode) return '';
        const origin = typeof window !== 'undefined' ? window.location.origin : '';
        return `${origin}/ministerios/unirse?codigo=${ministry.inviteCode}`;
    };

    const handleCopyInviteLink = async () => {
        const url = getInviteUrl();
        if (!url) return;

        let copied = false;
        if (navigator?.clipboard?.writeText) {
            try {
                await navigator.clipboard.writeText(url);
                copied = true;
            } catch (err) {
                console.warn("Clipboard API failed, using fallback:", err);
            }
        }

        if (!copied) {
            try {
                const textArea = document.createElement("textarea");
                textArea.value = url;
                textArea.style.position = "fixed";
                textArea.style.left = "-9999px";
                textArea.style.top = "-9999px";
                textArea.setAttribute("readonly", "");
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                copied = document.execCommand("copy");
                document.body.removeChild(textArea);
            } catch (e) {
                console.error("Fallback copy failed:", e);
            }
        }

        setCopiedLink(true);
        showSuccessToast("¡Enlace Copiado!", "El enlace de invitación se copió al portapapeles.");
        setTimeout(() => {
            setCopiedLink(false);
        }, 2200);
    };

    const handleShareWhatsApp = () => {
        const url = getInviteUrl();
        const text = `¡Hola! Te invito a unirte a nuestro ministerio de música "${ministry.name}" en Cancionero. Puedes unirte usando este enlace:\n\n${url}`;
        const waUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
        window.open(waUrl, '_blank');
    };

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="bg-[#171717] border border-white/10 rounded-2xl p-8 h-48 animate-pulse"></div>
                <div className="bg-[#171717] border border-white/10 rounded-2xl p-6 h-64 animate-pulse"></div>
            </div>
        );
    }

    if (!ministry) {
        return (
            <div className="bg-[#171717] border border-white/10 rounded-2xl p-12 text-center space-y-4">
                <AppIcon name="triangle-exclamation" className="text-3xl text-amber-500" />
                <h3 className="text-xl font-bold text-white">Ministerio no disponible</h3>
                <a href="/perfil" className="inline-block px-4 py-2 bg-accent-main text-black font-bold text-sm rounded-xl">
                    Volver a mi perfil
                </a>
            </div>
        );
    }

    const isGroupAdmin = ministry.isGroupAdmin;
    const canManageInvites = ministry.canManageInvites;
    const pendingCount = ministry.pendingRequests?.length || 0;

    return (
        <div className="space-y-6 sm:space-y-8 w-full max-w-full min-w-0">
            {/* Header Card */}
            <div className="bg-[#171717] border border-white/10 rounded-2xl p-4 sm:p-6 md:p-8 shadow-xl relative overflow-hidden w-full max-w-full min-w-0">
                <div className="absolute top-0 right-0 w-80 h-80 bg-accent-main/5 rounded-full blur-3xl -z-10 pointer-events-none"></div>

                <div className="flex flex-col md:flex-row md:items-start justify-between gap-5 sm:gap-6">
                    <div className="flex items-start gap-3.5 sm:gap-5 min-w-0 flex-1">
                        <div className="w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-2xl bg-gradient-to-tr from-accent-main/20 to-amber-500/10 border border-accent-main/30 text-accent-main flex items-center justify-center text-2xl sm:text-3xl shrink-0 shadow-lg">
                            <AppIcon name="church" />
                        </div>

                        <div className="space-y-2 min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2.5">
                                <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight truncate">
                                    {ministry.name}
                                </h1>
                                <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full shrink-0 ${isGroupAdmin
                                        ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                                        : 'bg-zinc-800 text-zinc-300 border border-white/10'
                                    }`}>
                                    {isGroupAdmin ? '👑 Administrador' : '🎵 Miembro'}
                                </span>
                            </div>

                            <p className="text-zinc-300 text-sm max-w-2xl break-words">
                                {ministry.description || 'Sin descripción detallada.'}
                            </p>

                            <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs text-zinc-400 pt-1">
                                <span className="flex items-center gap-1.5 shrink-0">
                                    <AppIcon name="user-group" className="text-accent-main" />
                                    {ministry.activeMembers?.length || 0} integrantes
                                </span>
                                {ministry.foundedAt && (
                                    <span className="flex items-center gap-1.5 shrink-0">
                                        <AppIcon name="calendar" className="text-accent-main" />
                                        Fundado en {new Date(ministry.foundedAt).toLocaleDateString('es-ES', { year: 'numeric', month: 'long' })}
                                    </span>
                                )}
                                {ministry.requireApproval && (
                                    <span className="flex items-center gap-1 text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20 shrink-0">
                                        <AppIcon name="shield-halved" />
                                        Requiere aprobación
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* WhatsApp & Invite Actions */}
                    <div className="flex flex-row md:flex-col items-center md:items-end gap-2.5 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-white/10 w-full md:w-auto">
                        <button
                            onClick={handleShareWhatsApp}
                            className="flex-1 md:flex-initial inline-flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-xs font-bold text-white transition-all shadow-md active:scale-95 whitespace-nowrap"
                        >
                            <AppIcon name="whatsapp" className="text-sm" />
                            <span><span className="hidden sm:inline">Compartir en </span>WhatsApp</span>
                        </button>
                        <button
                            type="button"
                            onClick={handleCopyInviteLink}
                            className={`flex-1 md:flex-initial inline-flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-300 active:scale-95 whitespace-nowrap cursor-pointer ${
                                copiedLink
                                    ? 'bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 ring-2 ring-emerald-500/30 shadow-lg shadow-emerald-950/40 scale-[1.03]'
                                    : 'bg-[#262626] hover:bg-[#333333] border border-white/10 text-zinc-300 hover:text-white'
                            }`}
                            title={copiedLink ? "¡Enlace copiado al portapapeles!" : "Copiar enlace de invitación"}
                        >
                            <span className="inline-flex items-center gap-1.5 transition-transform duration-200">
                                {copiedLink ? (
                                    <>
                                        <AppIcon name="check" className="text-emerald-400 text-sm transition-transform duration-300 scale-125" />
                                        <span className="font-bold text-emerald-300">¡Copiado!</span>
                                    </>
                                ) : (
                                    <>
                                        <AppIcon name="copy" className="text-sm" />
                                        <span>Copiar Enlace</span>
                                    </>
                                )}
                            </span>
                        </button>
                    </div>
                </div>

                {/* Navigation Tabs */}
                <div className="flex items-center gap-2 pt-4 sm:pt-6 mt-4 sm:mt-6 border-t border-white/10 overflow-x-auto no-scrollbar pb-1 w-full max-w-full min-w-0">
                    <button
                        onClick={() => setActiveTab('miembros')}
                        className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${activeTab === 'miembros'
                                ? 'bg-accent-main text-black shadow-md shadow-accent-main/20'
                                : 'bg-[#222222] text-zinc-400 hover:text-white hover:bg-[#2c2c2c]'
                            }`}
                    >
                        <AppIcon name="users" />
                        <span>Integrantes ({ministry.activeMembers?.length || 0})</span>
                    </button>

                    {canManageInvites && (
                        <button
                            onClick={() => setActiveTab('solicitudes')}
                            className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${activeTab === 'solicitudes'
                                    ? 'bg-accent-main text-black shadow-md shadow-accent-main/20'
                                    : 'bg-[#222222] text-zinc-400 hover:text-white hover:bg-[#2c2c2c]'
                                }`}
                        >
                            <AppIcon name="user-clock" />
                            <span>Solicitudes</span>
                            {pendingCount > 0 && (
                                <span className="ml-1 px-1.5 py-0.2 bg-red-500 text-white rounded-full text-[10px] font-extrabold animate-pulse">
                                    {pendingCount}
                                </span>
                            )}
                        </button>
                    )}

                    <button
                        onClick={() => setActiveTab('misas')}
                        className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${activeTab === 'misas'
                                ? 'bg-accent-main text-black shadow-md shadow-accent-main/20'
                                : 'bg-[#222222] text-zinc-400 hover:text-white hover:bg-[#2c2c2c]'
                            }`}
                    >
                        <AppIcon name="book-bible" />
                        <span><span className="hidden sm:inline">Repertorio & </span>Misas ({ministry.misas?.length || 0})</span>
                    </button>

                    {isGroupAdmin && (
                        <button
                            onClick={() => setActiveTab('ajustes')}
                            className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${activeTab === 'ajustes'
                                    ? 'bg-accent-main text-black shadow-md shadow-accent-main/20'
                                    : 'bg-[#222222] text-zinc-400 hover:text-white hover:bg-[#2c2c2c]'
                                }`}
                        >
                            <AppIcon name="gear" />
                            <span>Ajustes</span>
                        </button>
                    )}
                </div>
            </div>

            {/* TAB CONTENT: MIEMBROS */}
            {activeTab === 'miembros' && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between gap-3">
                        <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                            <span>Lista de Integrantes</span>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-zinc-400">
                                {ministry.activeMembers?.length}
                            </span>
                        </h3>

                        {canManageInvites && (
                            <button
                                onClick={() => setShowAddMemberModal(true)}
                                className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 bg-accent-main hover:bg-amber-600 rounded-xl text-xs font-bold text-black transition-all shadow-md active:scale-95 shrink-0"
                            >
                                <AppIcon name="user-plus" className="text-[11px]" />
                                <span>
                                    <span className="hidden sm:inline">Agregar Integrante</span>
                                    <span className="sm:hidden">Agregar</span>
                                </span>
                            </button>
                        )}
                    </div>

                    <div className="bg-[#171717] border border-white/10 rounded-2xl overflow-hidden divide-y divide-white/5">
                        {ministry.activeMembers?.map(m => {
                            const isMemberAdmin = m.role === 'ADMIN';
                            const isMe = currentUser?.id === m.userId;
                            const memberAvatarUrl = m.avatarUrl || (isMe ? currentUser?.avatarUrl : null);

                            return (
                                <div key={m.id} className="p-3 sm:p-4 flex items-center justify-between gap-3 hover:bg-white/[0.02] transition-colors">
                                    <div className="flex items-center gap-3 min-w-0 flex-1">
                                        <UserAvatar
                                            user={{ ...m, avatarUrl: memberAvatarUrl }}
                                            size="w-10 h-10"
                                            rounded="rounded-xl"
                                            border="border border-white/10"
                                        />
                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                                                <span className="font-semibold text-white text-sm truncate">
                                                    {m.name} {isMe && '(Tú)'}
                                                </span>
                                                <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full shrink-0 ${isMemberAdmin
                                                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                                        : 'bg-zinc-800 text-zinc-400 border border-white/10'
                                                    }`}>
                                                    {isMemberAdmin ? '👑 Admin' : 'Miembro'}
                                                </span>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-x-2 text-xs text-zinc-400 mt-0.5 min-w-0">
                                                <span className="truncate">{m.email}</span>
                                                {m.phoneNumber && (
                                                    <>
                                                        <span className="text-zinc-600 hidden xs:inline">•</span>
                                                        <span className="flex items-center gap-1 text-zinc-400 shrink-0">
                                                            <AppIcon name="phone" className="text-[10px] text-zinc-500" />
                                                            <span>{m.phoneNumber}</span>
                                                        </span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Buttons for Members */}
                                    <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                                        {isGroupAdmin && !isMe && (
                                            <>
                                                {isMemberAdmin ? (
                                                    <button
                                                        onClick={() => handleRoleChange(m, 'MEMBER')}
                                                        title="Degradar a miembro regular"
                                                        className="px-2 sm:px-2.5 py-1 text-[11px] sm:text-xs rounded-lg border border-white/10 text-zinc-400 hover:text-white hover:bg-white/5 transition-colors whitespace-nowrap"
                                                    >
                                                        <span className="hidden sm:inline">Hacer </span>Miembro
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => handleRoleChange(m, 'ADMIN')}
                                                        title="Promover a administrador del grupo"
                                                        className="px-2 sm:px-2.5 py-1 text-[11px] sm:text-xs rounded-lg border border-amber-500/30 text-amber-400 hover:bg-amber-500/10 transition-colors whitespace-nowrap"
                                                    >
                                                        👑 <span className="hidden sm:inline">Hacer </span>Admin
                                                    </button>
                                                )}

                                                <button
                                                    onClick={() => handleRemoveMember(m)}
                                                    title="Expulsar integrante"
                                                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 flex items-center justify-center transition-colors shrink-0"
                                                >
                                                    <AppIcon name="user-xmark" className="text-xs" />
                                                </button>
                                            </>
                                        )}

                                        {isMe && (
                                            <button
                                                onClick={() => handleRemoveMember(m, true)}
                                                className="px-2.5 py-1.5 sm:px-3 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-red-500/20 rounded-lg transition-colors font-medium whitespace-nowrap"
                                            >
                                                <span>Salir<span className="hidden sm:inline"> del grupo</span></span>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* TAB CONTENT: SOLICITUDES PENDIENTES */}
            {activeTab === 'solicitudes' && canManageInvites && (
                <div className="space-y-4">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <span>Solicitudes de Ingreso Pendientes</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400">
                            {pendingCount}
                        </span>
                    </h3>

                    {pendingCount === 0 ? (
                        <div className="bg-[#171717] border border-white/10 rounded-2xl p-10 text-center space-y-2">
                            <AppIcon name="circle-check" className="text-2xl text-emerald-500" />
                            <p className="text-sm font-semibold text-white">No hay solicitudes pendientes</p>
                            <p className="text-xs text-zinc-400">
                                Cuando alguien intente unirse con el enlace, sus peticiones aparecerán aquí.
                            </p>
                        </div>
                    ) : (
                        <div className="bg-[#171717] border border-white/10 rounded-2xl overflow-hidden divide-y divide-white/5">
                            {ministry.pendingRequests.map(req => (
                                <div key={req.id} className="p-3 sm:p-4 flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-3 min-w-0 flex-1">
                                        <UserAvatar
                                            user={req}
                                            size="w-10 h-10"
                                            rounded="rounded-xl"
                                            border="border border-white/10"
                                        />
                                        <div className="min-w-0 flex-1">
                                            <span className="font-semibold text-white text-sm block truncate">{req.name}</span>
                                            <div className="flex flex-wrap items-center gap-x-2 text-xs text-zinc-400 min-w-0">
                                                <span className="truncate">{req.email}</span>
                                                {req.phoneNumber && (
                                                    <>
                                                        <span className="text-zinc-600 hidden xs:inline">•</span>
                                                        <span className="flex items-center gap-1 text-zinc-400 shrink-0">
                                                            <AppIcon name="phone" className="text-[10px] text-zinc-500" />
                                                            <span>{req.phoneNumber}</span>
                                                        </span>
                                                    </>
                                                )}
                                            </div>
                                            <span className="text-[10px] text-zinc-500 block mt-0.5">
                                                Solicitado: {new Date(req.requestedAt).toLocaleDateString('es-ES', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 shrink-0">
                                        <button
                                            onClick={() => handleRequestDecision(req, 'REJECT')}
                                            className="px-2.5 sm:px-3.5 py-1.5 rounded-xl border border-white/10 text-xs font-semibold text-zinc-400 hover:text-white hover:bg-white/5 transition-all"
                                        >
                                            Rechazar
                                        </button>
                                        <button
                                            onClick={() => handleRequestDecision(req, 'ACCEPT')}
                                            className="px-3 sm:px-4 py-1.5 rounded-xl bg-accent-main hover:bg-amber-600 text-xs font-bold text-black transition-all shadow-md active:scale-95"
                                        >
                                            Aceptar
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* TAB CONTENT: MISAS / REPERTORIO */}
            {activeTab === 'misas' && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-bold text-white">Repertorios de Misas</h3>
                        <a
                            href="/misas/add"
                            className="inline-flex items-center gap-2 px-4 py-2 bg-accent-main hover:bg-amber-600 text-black text-xs font-bold rounded-xl transition-all shadow-md"
                        >
                            <AppIcon name="plus" />
                            <span>Crear Misa</span>
                        </a>
                    </div>

                    {(!ministry.misas || ministry.misas.length === 0) ? (
                        <div className="bg-[#171717] border border-white/10 rounded-2xl p-10 text-center space-y-2">
                            <AppIcon name="book-bible" className="text-2xl text-zinc-500" />
                            <p className="text-sm font-semibold text-white">Aún no hay misas registradas</p>
                            <p className="text-xs text-zinc-400">
                                Planifica canciones y momentos litúrgicos para los próximos servicios.
                            </p>
                        </div>
                    ) : (
                        <div className="grid gap-4 sm:grid-cols-2">
                            {ministry.misas.map(misa => (
                                <a
                                    key={misa.id}
                                    href={`/misas/view/${misa.id}`}
                                    className="bg-[#171717] border border-white/10 hover:border-accent-main/40 rounded-2xl p-5 transition-all flex flex-col justify-between group"
                                >
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-bold text-accent-main">
                                                {new Date(misa.dateMisa).toLocaleDateString('es-ES', { weekday: 'short', month: 'short', day: 'numeric' })}
                                            </span>
                                            <span className="text-[10px] text-zinc-400 bg-white/5 px-2 py-0.5 rounded-full">
                                                {misa.misaSongs?.length || 0} cantos
                                            </span>
                                        </div>
                                        <h4 className="font-bold text-white text-base group-hover:text-accent-main transition-colors">
                                            {misa.title}
                                        </h4>
                                    </div>
                                    <span className="text-xs text-zinc-400 mt-4 flex items-center gap-1 group-hover:text-white">
                                        <span>Ver repertorio</span>
                                        <AppIcon name="arrow-right" className="text-[10px]" />
                                    </span>
                                </a>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* TAB CONTENT: AJUSTES (Solo Group Admin) */}
            {activeTab === 'ajustes' && isGroupAdmin && (
                <div className="bg-[#171717] border border-white/10 rounded-2xl p-6 md:p-8 space-y-8">
                    <form onSubmit={handleSaveSettings} className="space-y-6">
                        <h3 className="text-lg font-bold text-white border-b border-white/10 pb-3">
                            Información del Ministerio
                        </h3>

                        <div className="grid gap-5 sm:grid-cols-2">
                            <div>
                                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                                    Nombre del Ministerio
                                </label>
                                <input
                                    type="text"
                                    value={settingsForm.name}
                                    onChange={(e) => setSettingsForm({ ...settingsForm, name: e.target.value })}
                                    required
                                    className="w-full px-4 py-2.5 bg-[#0a0a0a] border border-white/10 focus:border-accent-main rounded-xl text-white text-sm outline-none transition-colors"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                                    Fecha de Fundación
                                </label>
                                <input
                                    type="date"
                                    value={settingsForm.foundedAt}
                                    onChange={(e) => setSettingsForm({ ...settingsForm, foundedAt: e.target.value })}
                                    className="w-full px-4 py-2.5 bg-[#0a0a0a] border border-white/10 focus:border-accent-main rounded-xl text-white text-sm outline-none transition-colors"
                                />
                            </div>

                            <div className="sm:col-span-2">
                                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                                    Descripción o Parroquia
                                </label>
                                <textarea
                                    value={settingsForm.description}
                                    onChange={(e) => setSettingsForm({ ...settingsForm, description: e.target.value })}
                                    rows="3"
                                    className="w-full px-4 py-2.5 bg-[#0a0a0a] border border-white/10 focus:border-accent-main rounded-xl text-white text-sm outline-none transition-colors resize-none"
                                />
                            </div>
                        </div>

                        {/* WhatsApp-like Group Settings */}
                        <div className="pt-4 border-t border-white/10 space-y-4">
                            <h4 className="text-sm font-bold text-white">Privacidad y Permisos de Ingreso</h4>

                            <label className="flex items-center justify-between cursor-pointer p-4 bg-black/30 rounded-xl border border-white/5 hover:border-white/15 transition-all">
                                <div>
                                    <span className="text-sm font-semibold text-white block">Aprobación de nuevos miembros</span>
                                    <span className="text-xs text-zinc-400 block mt-0.5">
                                        Cuando esté activado, las personas que entren por el enlace necesitarán que un administrador apruebe su solicitud.
                                    </span>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={settingsForm.requireApproval}
                                    onChange={(e) => setSettingsForm({ ...settingsForm, requireApproval: e.target.checked })}
                                    className="w-5 h-5 accent-amber-500 rounded cursor-pointer"
                                />
                            </label>

                            <label className="flex items-center justify-between cursor-pointer p-4 bg-black/30 rounded-xl border border-white/5 hover:border-white/15 transition-all">
                                <div>
                                    <span className="text-sm font-semibold text-white block">Permitir que todos los miembros inviten y acepten</span>
                                    <span className="text-xs text-zinc-400 block mt-0.5">
                                        Si se apaga, solo los administradores podrán compartir el código y aprobar solicitudes de nuevos miembros.
                                    </span>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={settingsForm.allowMemberInvites}
                                    onChange={(e) => setSettingsForm({ ...settingsForm, allowMemberInvites: e.target.checked })}
                                    className="w-5 h-5 accent-amber-500 rounded cursor-pointer"
                                />
                            </label>
                        </div>

                        <div className="flex justify-end pt-2">
                            <button
                                type="submit"
                                disabled={savingSettings}
                                className="px-6 py-2.5 bg-accent-main hover:bg-amber-600 text-black font-bold text-sm rounded-xl transition-all shadow-lg active:scale-95 disabled:opacity-50"
                            >
                                {savingSettings ? 'Guardando...' : 'Guardar Cambios'}
                            </button>
                        </div>
                    </form>

                    {/* Invite Link Management */}
                    <div className="pt-6 border-t border-white/10 space-y-3">
                        <h4 className="text-sm font-bold text-white">Enlace de Invitación</h4>
                        <div className="flex flex-col sm:flex-row items-center gap-3">
                            <input
                                type="text"
                                readOnly
                                value={getInviteUrl()}
                                className="w-full px-4 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-zinc-300 font-mono"
                            />
                            <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                                <button
                                    type="button"
                                    onClick={handleCopyInviteLink}
                                    className={`flex-1 sm:flex-initial px-3 sm:px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-300 active:scale-95 whitespace-nowrap flex items-center justify-center gap-1.5 cursor-pointer ${
                                        copiedLink
                                            ? 'bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 ring-2 ring-emerald-500/30'
                                            : 'bg-[#262626] hover:bg-[#333333] border border-white/10 text-zinc-300 hover:text-white'
                                    }`}
                                >
                                    {copiedLink ? (
                                        <>
                                            <AppIcon name="check" className="text-emerald-400" />
                                            <span>¡Copiado!</span>
                                        </>
                                    ) : (
                                        <>
                                            <AppIcon name="copy" />
                                            <span>Copiar</span>
                                        </>
                                    )}
                                </button>
                                <button
                                    type="button"
                                    onClick={handleRegenerateCode}
                                    className="flex-1 sm:flex-initial px-4 py-2 border border-amber-500/30 text-amber-400 hover:bg-amber-500/10 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                                >
                                    Regenerar Enlace
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Danger Zone */}
                    <div className="pt-6 border-t border-red-500/20 space-y-3">
                        <h4 className="text-sm font-bold text-red-400">Zona de Peligro</h4>
                        <p className="text-xs text-zinc-400">
                            Eliminar este ministerio desvinculará a todos los miembros y borrará su información permanentemente.
                        </p>
                        <button
                            onClick={handleDeleteMinistry}
                            className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 text-xs font-bold rounded-xl transition-colors"
                        >
                            Eliminar Ministerio
                        </button>
                    </div>
                </div>
            )}

            {/* MODAL: AGREGAR INTEGRANTE DIRECTAMENTE */}
            {showAddMemberModal && (
                <div
                    data-modal-open="true"
                    role="dialog"
                    aria-modal="true"
                    className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fadeIn overscroll-contain"
                    onClick={() => setShowAddMemberModal(false)}
                >
                    <div
                        className="bg-bg-secondary border border-white/10 rounded-2xl w-full max-w-lg p-5 sm:p-6 shadow-2xl relative space-y-4 max-h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-3.5rem)] overflow-y-auto scrollbar-thin my-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between pb-2 border-b border-white/10">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <AppIcon name="user-plus" className="text-accent-main" />
                                <span>Agregar Integrante al Ministerio</span>
                            </h3>
                            <button
                                type="button"
                                onClick={() => setShowAddMemberModal(false)}
                                className="p-1.5 sm:p-2 text-text-secondary hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer shrink-0 -mr-1 -mt-0.5"
                                title="Cerrar (Esc)"
                                aria-label="Cerrar modal"
                            >
                                <AppIcon name="xmark" className="w-5 h-5" />
                            </button>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                                Buscar por Nombre o Correo
                            </label>
                            <div className="relative">
                                <AppIcon name="search" className="absolute left-3.5 top-3 text-zinc-500 text-sm" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Escribe el nombre o correo del músico..."
                                    autoFocus
                                    className="w-full pl-10 pr-4 py-2.5 bg-[#0a0a0a] border border-white/10 focus:border-accent-main rounded-xl text-white text-sm outline-none transition-colors"
                                />
                            </div>
                        </div>

                        {/* Search Results */}
                        <div className="max-h-60 overflow-y-auto space-y-2 pt-2 divide-y divide-white/5">
                            {searching ? (
                                <p className="text-xs text-zinc-400 text-center py-4">Buscando usuarios registrados...</p>
                            ) : searchResults.length > 0 ? (
                                searchResults.map(userItem => (
                                    <div key={userItem.id} className="pt-2 flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-3">
                                            <UserAvatar
                                                user={userItem}
                                                size="w-9 h-9"
                                                rounded="rounded-xl"
                                                border="border border-white/10"
                                            />
                                            <div>
                                                <span className="font-semibold text-white text-sm block">{userItem.name}</span>
                                                <span className="text-xs text-zinc-400 block">{userItem.email}</span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleAddDirect(userItem)}
                                            disabled={addingUserId === userItem.id}
                                            className="px-3.5 py-1.5 bg-accent-main hover:bg-amber-600 text-black font-bold text-xs rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-50"
                                        >
                                            {addingUserId === userItem.id ? 'Agregando...' : '+ Agregar'}
                                        </button>
                                    </div>
                                ))
                            ) : searchQuery.trim().length >= 2 ? (
                                <p className="text-xs text-zinc-500 text-center py-4">No se encontraron usuarios coincidentes.</p>
                            ) : (
                                <p className="text-xs text-zinc-500 text-center py-4">Escribe al menos 2 caracteres para buscar.</p>
                            )}
                        </div>

                        <div className="pt-3 border-t border-white/10 flex justify-end">
                            <button
                                type="button"
                                onClick={() => setShowAddMemberModal(false)}
                                className="px-4 py-2 text-sm text-zinc-400 hover:text-white transition-colors"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
