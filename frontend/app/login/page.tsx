'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { login } from '@/lib/auth'
import Image from 'next/image'

export default function LoginPage() {
  const router = useRouter()
  const [form, setForm] = useState({ username: '', password: '', remember: false })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)

  function validate() {
    const e: Record<string, string> = {}
    if (!form.username) e.username = 'E-mail obrigatório'
    if (form.password.length < 6) e.password = 'Senha deve ter ao menos 6 caracteres'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    try {
      await login(form.username, form.password)
      router.push('/animais')
    } catch {
      setErrors({ general: 'E-mail ou senha inválidos' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f0f2f5',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Segoe UI', sans-serif",
      padding: '20px',
    }}>

      {/* Logo */}
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <img
          src="/logo.png"
          alt="Vira Lata Vira Luxo"
          style={{ width: '90px', height: '90px', objectFit: 'contain', margin: '0 auto 12px', display: 'block' }}
          onError={(e) => console.log('Erro ao carregar imagem:', e)}
          onLoad={() => console.log('Imagem carregada com sucesso!')}
        />
        <p style={{
          fontSize: '0.7rem', fontWeight: 700,
          letterSpacing: '0.15em', color: '#8a9ab0',
          textTransform: 'uppercase',
        }}>VIRA LATA VIRA LUXO</p>
      </div>

      {/* Card */}
      <div style={{
        background: '#fff',
        borderRadius: '20px',
        padding: '40px',
        width: '100%',
        maxWidth: '440px',
        boxShadow: '0 4px 24px rgba(0,0,0,0.07)',
      }}>
        <h1 style={{ fontSize: '1.7rem', fontWeight: 700, color: '#1a2535', marginBottom: '6px' }}>
          Portal do Assistente
        </h1>
        <p style={{ color: '#8a9ab0', fontSize: '0.9rem', marginBottom: '32px' }}>
          Bem-vindo(a) ao portal da instituição!
        </p>

        {errors.general && (
          <div style={{
            background: '#fff5f5', border: '1px solid #fca5a5',
            borderRadius: '8px', padding: '10px 14px',
            color: '#dc2626', fontSize: '0.85rem', marginBottom: '16px',
          }}>{errors.general}</div>
        )}

        <form onSubmit={handleSubmit}>
          {/* E-mail */}
          <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1a2535', display: 'block', marginBottom: '6px' }}>
            Usuário
          </label>
          <div style={{ position: 'relative', marginBottom: errors.username ? '4px' : '20px' }}>
            <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#b0bec5', fontSize: '1rem' }}>✉️</span>
            <input
              type="text"
              placeholder="Digite seu usuário"
              value={form.username}
              onChange={e => setForm({ ...form, username: e.target.value })}
              style={{
                width: '100%', padding: '13px 14px 13px 42px',
                border: errors.username ? '1.5px solid #ef4444' : '1.5px solid #e8edf2',
                borderRadius: '10px', fontSize: '0.9rem',
                outline: 'none', boxSizing: 'border-box',
                backgroundColor: '#f8fafc', color: '#1a2535',
              }}
            />
          </div>
          {errors.username && <p style={{ color: '#ef4444', fontSize: '0.75rem', marginBottom: '16px' }}>{errors.username}</p>}

          {/* Senha */}
          <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1a2535', display: 'block', marginBottom: '6px' }}>
            Senha
          </label>
          <div style={{ position: 'relative', marginBottom: errors.password ? '4px' : '8px' }}>
            <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#b0bec5', fontSize: '1rem' }}>🔒</span>
            <input
              type="password"
              placeholder="••••••••"
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              style={{
                width: '100%', padding: '13px 14px 13px 42px',
                border: errors.password ? '1.5px solid #ef4444' : '1.5px solid #e8edf2',
                borderRadius: '10px', fontSize: '0.9rem',
                outline: 'none', boxSizing: 'border-box',
                backgroundColor: '#f8fafc', color: '#1a2535',
              }}
            />
          </div>
          {errors.password && <p style={{ color: '#ef4444', fontSize: '0.75rem', marginBottom: '4px' }}>{errors.password}</p>}

          {/* Esqueceu senha */}
          <div style={{ textAlign: 'left', marginBottom: '14px' }}>
            <a href="#" style={{ color: '#f59e0b', fontSize: '0.82rem', textDecoration: 'none', fontWeight: 500 }}>
              Esqueceu a senha?
            </a>
          </div>

          {/* Lembrar */}
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '28px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={form.remember}
              onChange={e => setForm({ ...form, remember: e.target.checked })}
              style={{ width: '16px', height: '16px', accentColor: '#3dbdb0' }}
            />
            <span style={{ fontSize: '0.85rem', color: '#4a5568' }}>Lembrar de mim</span>
          </label>

          {/* Botão */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '15px',
              background: loading ? '#7dd3cb' : '#3dbdb0',
              color: '#fff', border: 'none', borderRadius: '10px',
              fontSize: '0.95rem', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
              marginBottom: '20px', transition: 'background 0.2s',
            }}
          >
            {loading ? 'Entrando...' : 'Entrar no Portal'}
          </button>

          {/* Divider */}
          <div style={{ textAlign: 'center', marginBottom: '16px' }}>
            <span style={{ fontSize: '0.7rem', color: '#b0bec5', letterSpacing: '0.1em', fontWeight: 600 }}>OU ACESSE COM</span>
          </div>

          {/* Social */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {[
              { icon: '🇬', label: 'Google' },
              { icon: '🍎', label: 'Apple' },
            ].map(s => (
              <button key={s.label} type="button" style={{
                padding: '11px', border: '1.5px solid #e8edf2', borderRadius: '10px',
                background: '#fff', cursor: 'pointer', display: 'flex',
                alignItems: 'center', justifyContent: 'center', gap: '8px',
                fontSize: '0.85rem', fontWeight: 600, color: '#1a2535',
              }}>
                <span>{s.icon}</span> {s.label}
              </button>
            ))}
          </div>
        </form>
      </div>

      {/* Footer */}
      <p style={{ marginTop: '24px', fontSize: '0.85rem', color: '#4a5568' }}>
        Ainda não faz parte?{' '}
        <a href="/cadastro" style={{ color: '#f59e0b', fontWeight: 600, textDecoration: 'none' }}>
          Crie sua conta aqui
        </a>
      </p>
      <p style={{ marginTop: '24px', fontSize: '0.7rem', color: '#b0bec5', letterSpacing: '0.1em' }}>
        INSTITUCIONAL • ADOÇÃO RESPONSÁVEL • 2026
      </p>

    </div>
  )
}