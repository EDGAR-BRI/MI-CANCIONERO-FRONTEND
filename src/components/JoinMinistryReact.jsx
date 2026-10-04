import AppIcon from "@/components/Ui/AppIcon";
import React, { useState, useEffect } from 'react';
import { joinMinistryByCode, setMinistriesAuthToken } from '../services/ministries';
import { showSuccessToast, showError } from '../utils/alerts';

export default function JoinMinistryReact({ code, isLoggedIn, token }) {
    const [inputCode, setInputCode] = useState(code || '');
    const [joining, setJoining] = useState(false);
    const [joinedMinistry, setJoinedMinistry] = useState(null);

    useEffect(() => {
        if (token) setMinistriesAuthToken(token);
    }, [token]);

    const handleJoin = async (e) => {
        if (e) e.preventDefault();
        const cleanCode = inputCode.trim();
        if (!cleanCode) {
            showError("Código requerido", "Por favor ingresa un código de invitación válido.");
            return;
        }

        setJoining(true);
        if (token) setMinistriesAuthToken(token);
        const res = await joinMinistryByCode(cleanCode, token);
        setJoining(false);

        if (res.success) {
            setJoinedMinistry(res.data);
            if (res.data?.status === 'PENDING') {
                showSuccessToast("Solicitud enviada", "Un administrador revisará tu petición.");
            } else {
                showSuccessToast("¡Bienvenido!", res.data?.message || "Te has unido al ministerio.");
            }
        } else {
            showError("No se pudo unir", res.error || "Código inválido o expirado.");
        }
    };

    if (joinedMinistry) {
        const isPending = joinedMinistry.status === 'PENDING';
        return (
            <div className="bg-[#171717] border border-white/10 rounded-2xl p-8 text-center space-y-5 max-w-md mx-auto shadow-2xl">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto text-2xl ${
                    isPending ? 'bg-amber-500/15 text-amber-400' : 'bg-emerald-500/15 text-emerald-400'
                }`}>
                    <AppIcon name={isPending ? "clock" : "check"} className="text-2xl" />
                </div>

                <div className="space-y-2">
                    <h3 className="text-xl font-bold text-white">
                        {isPending ? 'Solicitud Enviada' : '¡Ya formas parte del ministerio!'}
                    </h3>
                    <p className="text-zinc-400 text-sm">
                        {isPending
                            ? 'Tu solicitud ha sido recibida y está en espera de aprobación por un administrador del grupo.'
                            : `Te has integrado exitosamente al ministerio "${joinedMinistry.ministry?.name || 'de música'}".`
                        }
                    </p>
                </div>

                <div className="pt-2 flex justify-center gap-3">
                    <a
                        href="/perfil"
                        className="px-5 py-2.5 bg-accent-main hover:bg-amber-600 text-black font-bold text-sm rounded-xl transition-all shadow-lg active:scale-95"
                    >
                        Ir a mi Perfil
                    </a>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-[#171717] border border-white/10 rounded-2xl p-6 sm:p-8 max-w-lg mx-auto shadow-2xl space-y-6">
            <div className="text-center space-y-2">
                <div className="w-16 h-16 rounded-2xl bg-accent-main/10 border border-accent-main/20 text-accent-main flex items-center justify-center mx-auto text-2xl shadow-lg">
                    <AppIcon name="music" />
                </div>
                <h2 className="text-2xl font-bold text-white tracking-tight">
                    Invitación a Ministerio de Música
                </h2>
                <p className="text-zinc-400 text-sm">
                    Has recibido una invitación para sumarte como músico o cantante a esta agrupación litúrgica.
                </p>
            </div>

            {!isLoggedIn ? (
                <div className="space-y-4 pt-4 border-t border-white/10 text-center">
                    <p className="text-sm text-zinc-300">
                        Para unirte, primero debes iniciar sesión o crear tu cuenta gratuita en Cancionero.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                        <a
                            href={`/login?redirect=${encodeURIComponent(typeof window !== 'undefined' ? window.location.pathname + window.location.search : '/perfil')}`}
                            className="w-full sm:w-auto px-6 py-2.5 bg-accent-main hover:bg-amber-600 text-black font-bold text-sm rounded-xl transition-all shadow-md active:scale-95"
                        >
                            Iniciar Sesión
                        </a>
                        <a
                            href="/register"
                            className="w-full sm:w-auto px-6 py-2.5 bg-[#262626] hover:bg-[#333333] border border-white/10 text-white font-semibold text-sm rounded-xl transition-all active:scale-95"
                        >
                            Registrarme
                        </a>
                    </div>
                </div>
            ) : (
                <form onSubmit={handleJoin} className="space-y-4 pt-2">
                    <div>
                        <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                            Código de Invitación
                        </label>
                        <input
                            type="text"
                            value={inputCode}
                            onChange={(e) => setInputCode(e.target.value)}
                            placeholder="Ej. c78f12a9"
                            required
                            className="w-full px-4 py-2.5 bg-[#0a0a0a] border border-white/10 focus:border-accent-main rounded-xl text-white text-sm outline-none font-mono text-center tracking-widest text-lg transition-colors"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={joining || !inputCode.trim()}
                        className="w-full py-3 bg-accent-main hover:bg-amber-600 text-black font-bold text-sm rounded-xl transition-all shadow-lg active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        <AppIcon name="right-to-bracket" />
                        <span>{joining ? 'Verificando...' : 'Confirmar y Unirme al Grupo'}</span>
                    </button>
                </form>
            )}
        </div>
    );
}
