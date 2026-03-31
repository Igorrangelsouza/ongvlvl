'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'

export default function CadastroPage() {
  const router = useRouter()
  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '',
    username: '', password: '', confirm_password: ''
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  function validate() {
    const e: Record<string, string> = {}
    if (!form.first_name) e.first_name = 'Nome obrigatório'
    if (!form.username) e.username = 'Usuário obrigatório'
    if (!form.email) e.email = 'E-mail obrigatório'
    if (form.password.length < 6) e.password = 'Senha deve ter ao menos 6 caracteres'
    if (form.password !== form.confirm_password) e.confirm_password = 'Senhas não coincidem'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    try {
      await api.post('/usuarios/cadastrar/', {
        username: form.username,
        email: form.email,
        password: form.password,
        first_name: form.first_name,
        last_name: form.last_name,
      })
      setSuccess(true)
      setTimeout(() => router.push('/login'), 2000)
    } catch (err: any) {
      const msg = err.response?.data?.erro || 'Erro ao cadastrar. Tente novamente.'
      setErrors({ general: msg })
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = (hasError: boolean) => ({
    width: '100%', padding: '13px 14px',
    border: hasError ? '1.5px solid #ef4444' : '1.5px solid #e8edf2',
    borderRadius: '10px', fontSize: '0.9rem',
    outline: 'none', boxSizing: 'border-box' as const,
    backgroundColor: '#f8fafc', color: '#1a2535',
  })

  return (
    <div style={{
      minHeight: '100vh', backgroundColor: '#f0f2f5',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Segoe UI', sans-serif", padding: '20px',
    }}>

      {/* Logo */}
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <img src="/logo.png" alt="Vira Lata Vira Luxo"
          style={{ width: '90px', height: '90px', objectFit: 'contain', margin: '0 auto 12px', display: 'block' }} />
        <p style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.15em', color: '#8a9ab0', textTransform: 'uppercase' }}>
          VIRA LATA VIRA LUXO
        </p>
      </div>

      {/* Card */}
      <div style={{
        background: '#fff', borderRadius: '20px', padding: '40px',
        width: '100%', maxWidth: '440px',
        boxShadow: '0 4px 24px rgba(0,0,0,0.07)',
      }}>
        <h1 style={{ fontSize: '1.7rem', fontWeight: 700, color: '#1a2535', marginBottom: '6px' }}>
          Criar conta
        </h1>
        <p style={{ color: '#8a9ab0', fontSize: '0.9rem', marginBottom: '32px' }}>
          Preencha os dados para se cadastrar no portal.
        </p>

        {success && (
          <div style={{ background: '#e6f9f5', border: '1px solid #3dbdb0', borderRadius: '8px', padding: '10px 14px', color: '#3dbdb0', fontSize: '0.85rem', marginBottom: '16px' }}>
            Conta criada com sucesso! Redirecionando para o login...
          </div>
        )}

        {errors.general && (
          <div style={{ background: '#fff5f5', border: '1px solid #fca5a5', borderRadius: '8px', padding: '10px 14px', color: '#dc2626', fontSize: '0.85rem', marginBottom: '16px' }}>
            {errors.general}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>

            {/* Nome */}
            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1a2535', display: 'block', marginBottom: '6px' }}>Nome</label>
              <input value={form.first_name} onChange={e => setForm({ ...form, first_name: e.target.value })}
                placeholder="João" style={inputStyle(!!errors.first_name)} />
              {errors.first_name && <p style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '3px' }}>{errors.first_name}</p>}
            </div>

            {/* Sobrenome */}
            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1a2535', display: 'block', marginBottom: '6px' }}>Sobrenome</label>
              <input value={form.last_name} onChange={e => setForm({ ...form, last_name: e.target.value })}
                placeholder="Silva" style={inputStyle(false)} />
            </div>

            {/* E-mail */}
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1a2535', display: 'block', marginBottom: '6px' }}>E-mail</label>
              <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                placeholder="seu@email.com" style={inputStyle(!!errors.email)} />
              {errors.email && <p style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '3px' }}>{errors.email}</p>}
            </div>

            {/* Usuário */}
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1a2535', display: 'block', marginBottom: '6px' }}>Usuário</label>
              <input value={form.username} onChange={e => setForm({ ...form, username: e.target.value })}
                placeholder="joaosilva" style={inputStyle(!!errors.username)} />
              {errors.username && <p style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '3px' }}>{errors.username}</p>}
            </div>

            {/* Senha */}
            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1a2535', display: 'block', marginBottom: '6px' }}>Senha</label>
              <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
                placeholder="••••••••" style={inputStyle(!!errors.password)} />
              {errors.password && <p style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '3px' }}>{errors.password}</p>}
            </div>

            {/* Confirmar senha */}
            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1a2535', display: 'block', marginBottom: '6px' }}>Confirmar senha</label>
              <input type="password" value={form.confirm_password} onChange={e => setForm({ ...form, confirm_password: e.target.value })}
                placeholder="••••••••" style={inputStyle(!!errors.confirm_password)} />
              {errors.confirm_password && <p style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '3px' }}>{errors.confirm_password}</p>}
            </div>

          </div>

          <button type="submit" disabled={loading} style={{
            width: '100%', padding: '15px', marginTop: '24px',
            background: loading ? '#7dd3cb' : '#3dbdb0',
            color: '#fff', border: 'none', borderRadius: '10px',
            fontSize: '0.95rem', fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
          }}>
            {loading ? 'Cadastrando...' : 'Criar conta'}
          </button>
        </form>
      </div>

      {/* Footer */}
      <p style={{ marginTop: '24px', fontSize: '0.85rem', color: '#4a5568' }}>
        Já tem uma conta?{' '}
        <a href="/login" style={{ color: '#f59e0b', fontWeight: 600, textDecoration: 'none' }}>
          Faça login
        </a>
      </p>
      <p style={{ marginTop: '12px', fontSize: '0.7rem', color: '#b0bec5', letterSpacing: '0.1em' }}>
        INSTITUCIONAL • ADOÇÃO RESPONSÁVEL • 2026
      </p>
    </div>
  )
}