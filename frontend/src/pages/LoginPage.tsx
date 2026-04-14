import React, { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { ShieldCheck, Eye, EyeOff, Lock, Mail, Search, Key, BarChart3 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button, Input, Alert, Modal } from '../components/ui';
import { BlurText, FadeIn, GlowCard } from '../components/animations';
import { FloatingLines } from '../components/FloatingLines';
import { authService } from '../services';

export const LoginPage: React.FC = () => {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Forgot password modal state
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMsg, setForgotMsg] = useState('');

  if (user) return <Navigate to="/dashboard" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { mustChangePassword } = await login({ email, password });
      if (mustChangePassword) {
        navigate('/change-password', { replace: true });
      }
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e?.message ?? 'Credenciales inválidas');
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotLoading(true);
    setForgotMsg('');
    try {
      const res = await authService.forgotPassword(forgotEmail);
      setForgotMsg(res.data?.message ?? 'Si la cuenta existe, se enviará una solicitud a los administradores.');
    } catch {
      setForgotMsg('Si la cuenta existe, se enviará una solicitud a los administradores.');
    } finally {
      setForgotLoading(false);
    }
  };

  const features = [
    { label: 'Trazabilidad', icon: <Search size={20} className="text-blue-400" />, delay: 400 },
    { label: 'Licencias',    icon: <Key    size={20} className="text-purple-400" />, delay: 480 },
    { label: 'Reportes',     icon: <BarChart3 size={20} className="text-green-400" />, delay: 560 },
  ];

  return (
    <div className="min-h-screen bg-slate-950 flex">

      {/* ── Left panel ─────────────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-1/2 relative flex-col justify-between p-12
                      border-r border-slate-800 overflow-hidden
                      bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950">
        <FloatingLines
          lineCount={10}
          speed={0.5}
          colors={['#3b82f6', '#6366f1', '#8b5cf6', '#06b6d4', '#2563eb']}
          opacity={0.5}
          interactive
        />

        {/* Logo */}
        <FadeIn delay={50} direction="left" className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="animate-float w-11 h-11 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-900/50">
              <ShieldCheck size={22} className="text-white" />
            </div>
            <div>
              <p className="text-lg font-bold text-slate-100">SIGAT-ES</p>
              <p className="text-xs text-slate-500">Sistema de Gestión de Activos Tecnológicos</p>
            </div>
          </div>
        </FadeIn>

        {/* Headline */}
        <div className="relative z-10">
          <h2 className="text-4xl font-bold text-slate-100 leading-tight mb-4">
            <BlurText text="Control total de" className="block" startDelay={100} />
            <BlurText
              text="tus activos tecnológicos"
              className="block text-blue-400"
              startDelay={260}
            />
          </h2>
          <FadeIn delay={560} direction="up" duration={600}>
            <p className="text-slate-400 text-base leading-relaxed max-w-xs">
              Inventario, asignaciones, licencias y auditoría en un solo lugar.
              Trazabilidad completa con historial inmutable.
            </p>
          </FadeIn>
        </div>

        {/* Feature cards */}
        <div className="relative z-10 grid grid-cols-3 gap-4">
          {features.map(f => (
            <FadeIn key={f.label} delay={f.delay} direction="up" duration={500}>
              <GlowCard className="p-4 text-center">
                <div className="flex justify-center mb-2">{f.icon}</div>
                <p className="text-xs font-medium text-slate-300">{f.label}</p>
              </GlowCard>
            </FadeIn>
          ))}
        </div>
      </div>

      {/* ── Right panel ─────────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center px-8 relative">
        {/* subtle bg radial */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(59,130,246,0.06),transparent)]" />

        <div className="relative w-full max-w-md">

          {/* Mobile logo */}
          <FadeIn delay={0} direction="none" className="lg:hidden mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
                <ShieldCheck size={20} className="text-white" />
              </div>
              <p className="text-xl font-bold text-slate-100">SIGAT-ES</p>
            </div>
          </FadeIn>

          {/* Header */}
          <FadeIn delay={100} direction="up">
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-slate-100">Iniciar sesión</h1>
              <p className="text-slate-400 mt-1 text-sm">Ingresa tus credenciales para continuar</p>
            </div>
          </FadeIn>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <FadeIn delay={0} direction="none">
                <Alert type="error" message={error} />
              </FadeIn>
            )}

            <FadeIn delay={180} direction="up">
              <Input
                label="Correo electrónico"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="usuario@elemento.com"
                required
                autoComplete="email"
                icon={<Mail size={16} />}
              />
            </FadeIn>

            <FadeIn delay={260} direction="up">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-300">
                  Contraseña <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    autoComplete="current-password"
                    className="w-full bg-slate-800 border border-slate-600 rounded-lg text-slate-100 placeholder-slate-500 text-sm pl-10 pr-10 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(s => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer transition-colors"
                    aria-label={showPass ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  >
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            </FadeIn>

            <FadeIn delay={340} direction="up">
              <button
                type="submit"
                disabled={loading}
                className="btn-shimmer w-full flex items-center justify-center gap-2 font-semibold rounded-lg text-white px-5 py-2.5 text-base transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
                    </svg>
                    Ingresando…
                  </>
                ) : (
                  'Ingresar al sistema'
                )}
              </button>
            </FadeIn>

            <FadeIn delay={400} direction="up">
              <div className="text-center mt-2">
                <button
                  type="button"
                  onClick={() => { setShowForgot(true); setForgotMsg(''); setForgotEmail(''); }}
                  className="text-xs text-slate-500 hover:text-blue-400 transition-colors"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
            </FadeIn>

          </form>

          <FadeIn delay={500} direction="none">
            <p className="text-center text-xs text-slate-600 mt-8">
              Element System © {new Date().getFullYear()} · SIGAT-ES
            </p>
          </FadeIn>
        </div>
      </div>

      {/* ── Forgot password modal ──────────────────────────────── */}
      <Modal
        open={showForgot}
        onClose={() => setShowForgot(false)}
        title="Recuperar contraseña"
        size="sm"
        footer={
          forgotMsg ? (
            <Button variant="primary" onClick={() => setShowForgot(false)}>Cerrar</Button>
          ) : (
            <>
              <Button variant="ghost" onClick={() => setShowForgot(false)}>Cancelar</Button>
              <Button variant="primary" loading={forgotLoading} onClick={handleForgot as unknown as () => void}>
                Enviar
              </Button>
            </>
          )
        }
      >
        {forgotMsg ? (
          <p className="text-sm text-slate-300">{forgotMsg}</p>
        ) : (
          <form onSubmit={handleForgot} className="space-y-4">
            <p className="text-sm text-slate-400">
              Ingresa tu correo electrónico y un administrador revisará la solicitud si la cuenta existe.
            </p>
            <Input
              label="Correo electrónico"
              type="email"
              value={forgotEmail}
              onChange={e => setForgotEmail(e.target.value)}
              required
              icon={<Mail size={16} />}
            />
          </form>
        )}
      </Modal>
    </div>
  );
};
