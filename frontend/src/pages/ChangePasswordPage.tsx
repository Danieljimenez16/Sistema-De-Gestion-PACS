import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Lock, Eye, EyeOff, CheckCircle2, XCircle } from 'lucide-react';
import { Button, Alert } from '../components/ui';
import { FadeIn } from '../components/animations';
import { authService } from '../services';
import { useAuth } from '../context/AuthContext';

interface Props {
  forced?: boolean; // true = first-login forced change (no current-password field)
}

const RULES = [
  { label: 'Mínimo 8 caracteres', test: (p: string) => p.length >= 8 },
  { label: 'Al menos una mayúscula', test: (p: string) => /[A-Z]/.test(p) },
  { label: 'Al menos un carácter especial', test: (p: string) => /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(p) },
];

const PasswordStrength: React.FC<{ password: string }> = ({ password }) => (
  <ul className="space-y-1 mt-2">
    {RULES.map(r => {
      const ok = r.test(password);
      return (
        <li key={r.label} className={`flex items-center gap-1.5 text-xs ${ok ? 'text-green-400' : 'text-slate-500'}`}>
          {ok ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
          {r.label}
        </li>
      );
    })}
  </ul>
);

export const ChangePasswordPage: React.FC<Props> = ({ forced = false }) => {
  const navigate = useNavigate();
  const { refreshUser } = useAuth();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword]         = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew]                 = useState(false);
  const [showConfirm, setShowConfirm]         = useState(false);
  const [loading, setLoading]                 = useState(false);
  const [error, setError]                     = useState('');
  const [success, setSuccess]                 = useState(false);

  const allRulesMet = RULES.every(r => r.test(newPassword));
  const passwordsMatch = newPassword === confirmPassword && confirmPassword.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!allRulesMet) { setError('La contraseña no cumple los requisitos'); return; }
    if (!passwordsMatch) { setError('Las contraseñas no coinciden'); return; }

    setLoading(true);
    try {
      await authService.changePassword({
        current_password: forced ? undefined : currentPassword,
        new_password: newPassword,
        skip_current_check: forced,
      });
      setSuccess(true);
      await refreshUser();
      setTimeout(() => navigate('/dashboard', { replace: true }), 1500);
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e?.message ?? 'Error al cambiar contraseña');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <FadeIn delay={0} direction="up">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
              <ShieldCheck size={20} className="text-white" />
            </div>
            <div>
              <p className="text-lg font-bold text-slate-100">SIGAT-ES</p>
              <p className="text-xs text-slate-500">Seguridad de cuenta</p>
            </div>
          </div>
        </FadeIn>

        <FadeIn delay={80} direction="up">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-8">
            <h1 className="text-xl font-bold text-slate-100 mb-1">
              {forced ? 'Crear nueva contraseña' : 'Cambiar contraseña'}
            </h1>
            <p className="text-sm text-slate-400 mb-6">
              {forced
                ? 'Por seguridad, debes crear una nueva contraseña antes de continuar.'
                : 'Ingresa tu contraseña actual y elige una nueva.'}
            </p>

            {success ? (
              <div className="flex flex-col items-center gap-3 py-4 text-center">
                <CheckCircle2 size={40} className="text-green-400" />
                <p className="text-slate-200 font-medium">¡Contraseña actualizada!</p>
                <p className="text-xs text-slate-500">Redirigiendo…</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && <Alert type="error" message={error} />}

                {!forced && (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-slate-300">
                      Contraseña actual <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                      <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="password"
                        value={currentPassword}
                        onChange={e => setCurrentPassword(e.target.value)}
                        required
                        className="w-full bg-slate-800 border border-slate-600 rounded-lg text-slate-100 text-sm pl-9 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                )}

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-slate-300">
                    Nueva contraseña <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type={showNew ? 'text' : 'password'}
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      required
                      className="w-full bg-slate-800 border border-slate-600 rounded-lg text-slate-100 text-sm pl-9 pr-10 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button type="button" onClick={() => setShowNew(s => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200">
                      {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  {newPassword && <PasswordStrength password={newPassword} />}
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-slate-300">
                    Confirmar contraseña <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      required
                      className={`w-full bg-slate-800 border rounded-lg text-slate-100 text-sm pl-9 pr-10 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        confirmPassword && !passwordsMatch ? 'border-red-500' : 'border-slate-600'
                      }`}
                    />
                    <button type="button" onClick={() => setShowConfirm(s => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200">
                      {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  {confirmPassword && !passwordsMatch && (
                    <p className="text-xs text-red-400 flex items-center gap-1">
                      <XCircle size={11} /> Las contraseñas no coinciden
                    </p>
                  )}
                </div>

                <Button
                  variant="primary"
                  loading={loading}
                  className="w-full mt-2"
                  onClick={handleSubmit as unknown as () => void}
                  disabled={!allRulesMet || !passwordsMatch}
                >
                  {forced ? 'Crear contraseña' : 'Actualizar contraseña'}
                </Button>
              </form>
            )}
          </div>
        </FadeIn>
      </div>
    </div>
  );
};
