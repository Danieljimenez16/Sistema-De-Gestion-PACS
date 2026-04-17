import React, { useState } from 'react';
import { Check, Key } from 'lucide-react';
import { FadeIn } from '../animations';
import { authService } from '../../services';
import { useToast } from '../Toast';
import { cls } from '../../utils/helpers';

interface ForgotPasswordModalProps {
  open: boolean;
  onClose: () => void;
}

export const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({
  open,
  onClose,
}) => {
  const [step, setStep] = useState(0); // 0: email input, 1: success
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const { addToast } = useToast();

  const handleReset = () => {
    setStep(0);
    setEmail('');
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const handleSubmitEmail = async (e: React.FormEvent) => {
    e.preventDefault();

    // Basic validation
    if (!email || !email.includes('@')) {
      addToast('error', 'Por favor ingresa un correo electrónico válido');
      return;
    }

    setLoading(true);
    try {
      await authService.forgotPassword(email);
      setStep(1); // Move to success step
    } catch (err) {
      // Backend siempre retorna mensaje genérico por seguridad
      setStep(1);
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} />

      {/* Modal - Paleta del login */}
      <div className="relative w-full max-w-2xl bg-slate-900 rounded-lg shadow-2xl flex flex-col overflow-hidden border border-slate-700">
        
        {/* Header with stepper */}
        <div className="px-8 pt-8 pb-6 border-b border-slate-700">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 id="modal-title" className="text-2xl font-bold text-slate-100 transition-all duration-500">
                {step === 0 ? 'Recuperar acceso' : 'Solicitud enviada'}
              </h2>
              <p className="text-sm text-slate-400 mt-2 transition-all duration-500">
                Paso {step + 1} de 2
              </p>
            </div>
            <button
              onClick={handleClose}
              className="text-slate-400 transition-colors flex-shrink-0"
              aria-label="Cerrar"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Stepper */}
          <div className="flex items-center justify-center gap-3">
            {/* Step 1 */}
            <div className="flex flex-col items-center">
              <div className={cls(
                'w-11 h-11 rounded-full flex items-center justify-center font-semibold transition-all duration-500 ease-out transform',
                step >= 0 
                  ? 'bg-blue-600 text-slate-100 scale-100 shadow-lg shadow-blue-600/50' 
                  : 'bg-slate-700 text-slate-400 scale-95'
              )}>
                {step > 0 ? <Check size={22} strokeWidth={3} className="animate-check-bounce" /> : '1'}
              </div>
            </div>

            {/* Connector line */}
            <div className={cls(
              'flex-1 h-1 rounded transition-all duration-700 ease-out',
              step > 0 ? 'bg-cyan-500 shadow-lg shadow-cyan-500/50' : 'bg-slate-600'
            )} />

            {/* Step 2 */}
            <div className="flex flex-col items-center">
              <div className={cls(
                'w-11 h-11 rounded-full flex items-center justify-center font-semibold transition-all duration-700 ease-out transform',
                step >= 1
                  ? 'bg-cyan-500 text-slate-100 scale-100 shadow-lg shadow-cyan-500/50'
                  : 'bg-slate-700 text-slate-400 scale-95'
              )}>
                2
              </div>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="px-8 py-6 flex-1 overflow-y-auto">
          {step === 0 ? (
            <FadeIn direction="up" duration={300}>
              <form onSubmit={handleSubmitEmail} className="space-y-6">
                {/* Icon */}
                <div className="flex justify-center mb-6">
                  <div className="w-20 h-20 bg-blue-600/10 rounded-full flex items-center justify-center border border-blue-600/20">
                    <Key size={40} className="text-blue-400" />
                  </div>
                </div>

                {/* Message */}
                <p className="text-base text-slate-300 text-center leading-relaxed font-medium">
                  No has perdido tu cuenta. Ingresa tu correo registrado y enviaremos tu solicitud al equipo administrador para ayudarte a restablecer el acceso.
                </p>

                {/* Email Input */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-2.5 uppercase tracking-wide">
                    Correo electrónico registrado
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      setEmail(e.target.value);
                    }}
                    placeholder="tu@empresa.com"
                    required
                    disabled={loading}
                    autoFocus
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-base disabled:opacity-50"
                  />
                </div>
              </form>
            </FadeIn>
          ) : (
            <FadeIn direction="up" duration={300}>
              <div className="space-y-6 text-center py-2">
                {/* Success icon with pulse */}
                <div className="flex justify-center mb-6">
                  <div className="relative w-20 h-20">
                    <div className="absolute inset-0 animate-pulse-ring rounded-full" />
                    <div className="animate-check-bounce w-20 h-20 bg-cyan-500/10 rounded-full flex items-center justify-center border border-cyan-500/20">
                      <Check size={40} className="text-cyan-400" strokeWidth={3} />
                    </div>
                  </div>
                </div>

                {/* Success message with stagger */}
                <h3 className="animate-text-bounce text-xl font-bold text-slate-100">
                  Solicitud enviada correctamente
                </h3>

                <p className="animate-text-bounce delay-100 text-base text-slate-300 leading-relaxed">
                  Un administrador se pondrá en contacto contigo para ayudarte a restablecer tu contraseña y brindarte una temporal si corresponde.
                </p>

                {/* Email display with animation */}
                <div className="animate-slide-scale delay-200 mt-6 p-4 bg-slate-800 rounded-lg border border-slate-600">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
                    Correo registrado
                  </p>
                  <p className="text-base font-semibold text-slate-100 mt-2">
                    {email}
                  </p>
                </div>
              </div>
            </FadeIn>
          )}
        </div>

        {/* Footer */}
        <div className="px-8 py-5 border-t border-slate-700 flex items-center justify-center gap-3">
          {step === 0 ? (
            <>
              <button
                onClick={handleClose}
                className="px-6 py-2.5 text-slate-300 font-semibold rounded-lg border border-slate-600 bg-transparent transition-all text-base hover:bg-slate-800"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                onClick={handleSubmitEmail}
                className="px-6 py-2.5 bg-blue-600 text-white font-semibold rounded-lg transition-all text-base disabled:opacity-50 hover:bg-blue-700"
              >
                {loading ? 'Enviando…' : 'Continuar'}
              </button>
            </>
          ) : (
            <button
              onClick={handleClose}
              className="px-8 py-2.5 bg-blue-600 text-white font-semibold rounded-lg transition-all text-base hover:bg-blue-700"
            >
              Cerrar
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
