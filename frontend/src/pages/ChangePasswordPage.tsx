import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Eye, EyeOff, Check } from 'lucide-react';
import { FadeIn } from '../components/animations';
import { authService } from '../services';
import { useAuth } from '../context/AuthContext';

interface Props {
  forced?: boolean; // true = first-login forced change (no current-password field)
}

interface PasswordRule {
  label: string;
  test: (p: string) => boolean;
}

const RULES: PasswordRule[] = [
  { label: 'Al menos 8 caracteres', test: (p: string) => p.length >= 8 },
  { label: 'Incluir un alfabeto (A-Z)', test: (p: string) => /[A-Z]/.test(p) },
  { label: 'Incluir signo (/*-+=)', test: (p: string) => /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(p) },
];

export const ChangePasswordPage: React.FC<Props> = ({ forced = false }) => {
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const { addToast } = useToast();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const allRulesMet = RULES.every(r => r.test(newPassword));
  const passwordsMatch = newPassword === confirmPassword && confirmPassword.length > 0;
  const isFormValid = allRulesMet && passwordsMatch;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isFormValid) return;

    setLoading(true);
    try {
      await authService.changePassword({
        current_password: forced ? undefined : currentPassword,
        new_password: newPassword,
        skip_current_check: forced,
      });
      setSuccess(true);
      await refreshUser();
      setTimeout(() => navigate('/dashboard', { replace: true }), 2000);
    } catch (err: unknown) {
      const e = err as { message?: string };
      addToast('error', e?.message ?? 'Error al cambiar contraseña');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
        <div className="text-center">
          <FadeIn direction="up" duration={300}>
            <div className="flex justify-center mb-6">
              <div className="animate-pulse-ring relative w-24 h-24">
                <div className="absolute inset-0 animate-pulse-ring rounded-full" />
                <div className="animate-check-bounce w-24 h-24 bg-emerald-500/15 rounded-full flex items-center justify-center border-2 border-emerald-500/30">
                  <Check size={48} className="text-emerald-400" strokeWidth={3} />
                </div>
              </div>
            </div>
            <h2 className="animate-text-bounce text-2xl font-bold text-slate-100 mb-2">
              ¡Contraseña actualizada!
            </h2>
            <p className="animate-text-bounce delay-100 text-slate-400">
              Redirigiendo al dashboard…
            </p>
          </FadeIn>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <FadeIn direction="up" duration={400}>
          <div className="bg-slate-900 rounded-2xl shadow-2xl border border-slate-700 p-8">
            {/* Icon centered */}
            <div className="flex justify-center mb-8">
              <div className="w-24 h-24 bg-gradient-to-br from-teal-500/20 to-cyan-500/20 rounded-full flex items-center justify-center border-2 border-teal-500/30">
                <Lock size={48} className="text-teal-400" strokeWidth={1.5} />
              </div>
            </div>

            {/* Title centered */}
            <h1 className="text-2xl font-bold text-slate-100 text-center mb-3">
              {forced ? 'Crear nueva contraseña' : 'Establecer su contraseña'}
            </h1>

            {/* Description centered */}
            <p className="text-slate-400 text-center text-sm mb-8 leading-relaxed">
              {forced
                ? 'Por seguridad, debes crear una nueva contraseña antes de continuar.'
                : 'Para mantener tu cuenta segura, necesitas crear una contraseña fuerte.'}
            </p>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Current password field - only if not forced */}
              {!forced && (
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wide">
                    Contraseña actual
                  </label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={e => setCurrentPassword(e.target.value)}
                      required
                      placeholder="Ingresa tu contraseña actual"
                      className="w-full bg-slate-800 border border-slate-600 rounded-lg text-slate-100 text-sm pl-10 pr-4 py-3 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    />
                  </div>
                </div>
              )}

              {/* New password field */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wide">
                  {forced ? 'Nueva contraseña' : 'Contraseña'}
                </label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type={showNew ? 'text' : 'password'}
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="Crea una contraseña fuerte"
                    required
                    className="w-full bg-slate-800 border border-slate-600 rounded-lg text-slate-100 text-sm pl-10 pr-10 py-3 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(s => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Confirm password field */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wide">
                  Confirmar contraseña
                </label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Repite tu contraseña"
                    required
                    className={`w-full bg-slate-800 border rounded-lg text-slate-100 text-sm pl-10 pr-10 py-3 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                      confirmPassword && !passwordsMatch ? 'border-red-500' : 'border-slate-600'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(s => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {confirmPassword && !passwordsMatch && (
                  <p className="text-xs text-red-400 font-medium">
                    Las contraseñas no coinciden
                  </p>
                )}
                {confirmPassword && passwordsMatch && (
                  <p className="text-xs text-emerald-400 font-medium flex items-center gap-1">
                    <Check size={12} /> Las contraseñas coinciden
                  </p>
                )}
              </div>

              {/* Password requirements list - ALWAYS VISIBLE */}
              <div className="space-y-2.5 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Tu contraseña debe contener
                </p>
                <ul className="space-y-2">
                  {RULES.map((rule, idx) => {
                    const isMet = rule.test(newPassword);
                    return (
                      <li
                        key={idx}
                        className={`flex items-center gap-2.5 text-sm transition-all ${
                          isMet ? 'text-emerald-400' : 'text-slate-500'
                        }`}
                      >
                        {isMet ? (
                          <div className="animate-check-bounce flex-shrink-0 w-5 h-5 bg-emerald-500/20 rounded-full flex items-center justify-center border border-emerald-500/40">
                            <Check size={14} className="text-emerald-400" strokeWidth={3} />
                          </div>
                        ) : (
                          <div className="flex-shrink-0 w-5 h-5 bg-slate-700/50 rounded-full flex items-center justify-center border border-slate-600/50" />
                        )}
                        {rule.label}
                      </li>
                    );
                  })}
                </ul>
              </div>

              {/* Submit button */}
              <button
                type="submit"
                disabled={!isFormValid || loading}
                className={`w-full py-3 font-semibold rounded-lg transition-all text-base uppercase tracking-wide ${
                  isFormValid && !loading
                    ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white hover:from-teal-600 hover:to-cyan-600 shadow-lg shadow-teal-500/20'
                    : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                }`}
              >
                {loading ? 'Guardando…' : forced ? 'Crear contraseña' : 'Guardar contraseña'}
              </button>
            </form>
          </div>
        </FadeIn>
      </div>
    </div>
  );
};
