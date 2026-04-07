'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import { logout } from '@/lib/auth'

type Animal = {
  id: number; nome: string; raca?: string; sexo: string
  porte: string; status: string; foto?: string
}

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  NO_ABRIGO: { bg: 'rgba(64,191,193,0.1)', color: '#40BFC1' },
  ADOTADO: { bg: '#DBEAFE', color: '#3B82F6' },
  FALECIDO: { bg: '#FEE2E2', color: '#EF4444' },
  DESAPARECIDO: { bg: '#FEF3C7', color: '#F59E0B' },
  LT: { bg: '#F3E8FF', color: '#A855F7' },
}

const STATUS_LABELS: Record<string, string> = {
  NO_ABRIGO: 'No Abrigo', ADOTADO: 'Adotado', FALECIDO: 'Falecido',
  DESAPARECIDO: 'Desaparecido', LT: 'Lar Temporário',
}

const SEXO_LABELS: Record<string, string> = { M: 'Macho', F: 'Fêmea' }
const PORTE_LABELS: Record<string, string> = { PEQUENO: 'Pequeno', MEDIO: 'Médio', GRANDE: 'Grande' }

export default function AnimaisPage() {
  const router = useRouter()
  const [animais, setAnimais] = useState<Animal[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ status: '', porte: '', sexo: '', search: '' })
  const [showModal, setShowModal] = useState(false)
  const [editAnimal, setEditAnimal] = useState<Animal | null>(null)
  const [viewAnimal, setViewAnimal] = useState<Animal | null>(null)
  const [form, setForm] = useState({
    nome: '', raca: '', sexo: 'M', porte: 'MEDIO', status: 'NO_ABRIGO',
    castrado: false, aparencia: '', comportamento: '', observacoes: '',
    fotoFile: null as File | null, fotoPreview: ''
  })
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [page, setPage] = useState(1)
  const PER_PAGE = 5

  async function fetchAnimais() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filters.status) params.append('status', filters.status)
      if (filters.porte) params.append('porte', filters.porte)
      if (filters.sexo) params.append('sexo', filters.sexo)
      if (filters.search) params.append('search', filters.search)
      const { data } = await api.get(`/animais/?${params}`)
      if (Array.isArray(data)) setAnimais(data)
      else if (Array.isArray(data.results)) setAnimais(data.results)
      else setAnimais([])
    } catch { setAnimais([]) }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchAnimais() }, [filters])

  function clearFilters() { setFilters({ status: '', porte: '', sexo: '', search: '' }); setPage(1) }

  function openNew() {
    setEditAnimal(null)
    setForm({ nome: '', raca: '', sexo: 'M', porte: 'MEDIO', status: 'NO_ABRIGO', castrado: false, aparencia: '', comportamento: '', observacoes: '', fotoFile: null, fotoPreview: '' })
    setFormErrors({})
    setShowModal(true)
  }

  function openEdit(a: Animal) {
    setEditAnimal(a)
    setForm({
      nome: a.nome, raca: a.raca || '', sexo: a.sexo, porte: a.porte, status: a.status,
      castrado: (a as any).castrado || false,
      aparencia: (a as any).aparencia || '',
      comportamento: (a as any).comportamento || '',
      observacoes: (a as any).observacoes || '',
      fotoFile: null,
      fotoPreview: (a as any).foto_url || ''
    })
    setFormErrors({})
    setShowModal(true)
  }

  async function handleDelete(id: number) {
    if (confirm('Deseja excluir este animal?')) { await api.delete(`/animais/${id}/`); fetchAnimais() }
  }

  function validateForm() {
    const e: Record<string, string> = {}
    if (!form.nome.trim()) e.nome = 'Nome obrigatório'
    setFormErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSave() {
    if (!validateForm()) return
    try {
      const fd = new FormData()
      fd.append('nome', form.nome); fd.append('raca', form.raca)
      fd.append('sexo', form.sexo); fd.append('porte', form.porte)
      fd.append('status', form.status); fd.append('castrado', String(form.castrado))
      fd.append('aparencia', form.aparencia); fd.append('comportamento', form.comportamento)
      fd.append('observacoes', form.observacoes)
      if (form.fotoFile) fd.append('foto', form.fotoFile)
      const cfg = { headers: { 'Content-Type': 'multipart/form-data' } }
      if (editAnimal) await api.put(`/animais/${editAnimal.id}/`, fd, cfg)
      else await api.post('/animais/', fd, cfg)
      setShowModal(false); fetchAnimais()
    } catch { setFormErrors({ general: 'Erro ao salvar. Verifique os dados.' }) }
  }

  const paginated = animais.slice((page - 1) * PER_PAGE, page * PER_PAGE)
  const totalPages = Math.max(1, Math.ceil(animais.length / PER_PAGE))

  const selectStyle: React.CSSProperties = {
    padding: '8px 36px 8px 13px', border: '1px solid #E2E8F0', borderRadius: '8px',
    fontSize: '14px', color: '#0F172A', backgroundColor: '#fff', appearance: 'none',
    cursor: 'pointer', outline: 'none', fontFamily: 'Manrope, sans-serif', height: '38px',
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236B7280' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center',
  }

  const labelStyle: React.CSSProperties = {
    fontSize: '12px', fontWeight: 700, color: '#94A3B8',
    letterSpacing: '0.6px', textTransform: 'uppercase', marginBottom: '6px', paddingLeft: '4px',
  }

  const inputModalStyle = (hasError = false): React.CSSProperties => ({
    width: '100%', padding: '10px 12px', border: `1px solid ${hasError ? '#EF4444' : '#E2E8F0'}`,
    borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box',
    backgroundColor: '#F8FAFC', color: '#0F172A', fontFamily: 'Manrope, sans-serif',
  })

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#F6F8F8', fontFamily: 'Manrope, sans-serif' }}>

      {/* SIDEBAR */}
      <aside style={{ width: '288px', minWidth: '288px', backgroundColor: '#fff', borderRight: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '9999px', backgroundColor: '#40BFC1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem', flexShrink: 0 }}>🐾</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '18px', color: '#0F172A', lineHeight: '22px' }}>Vira Lata</div>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', letterSpacing: '0.6px', textTransform: 'uppercase' }}>VIRA LUXO</div>
          </div>
        </div>

        <nav style={{ padding: '24px 16px', flex: 1, display: 'flex', flexDirection: 'column', gap: '32px' }}>
          <div>
            <p style={{ fontSize: '12px', fontWeight: 700, color: '#94A3B8', letterSpacing: '1.2px', textTransform: 'uppercase', padding: '0 12px', marginBottom: '16px' }}>PELUDOS</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {[
                { icon: '🐾', label: 'Cadastro de Animais', active: true, href: '/animais' },
                { icon: '💊', label: 'Saúde dos animais', active: false, href: '/saude' },
                { icon: '📄', label: 'Exportação de dados', active: false, href: '/exportacao' },
              ].map(item => (
                <div key={item.label} onClick={() => router.push(item.href)}
                  style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', borderRadius: '8px', cursor: 'pointer', backgroundColor: item.active ? 'rgba(64,191,193,0.1)' : 'transparent', color: item.active ? '#40BFC1' : '#334155', fontWeight: item.active ? 600 : 500, fontSize: '14px', borderRight: item.active ? '4px solid #40BFC1' : '4px solid transparent' }}>
                  <span>{item.icon}</span> {item.label}
                </div>
              ))}
            </div>
          </div>

          <div>
            <p style={{ fontSize: '12px', fontWeight: 700, color: '#94A3B8', letterSpacing: '1.2px', textTransform: 'uppercase', padding: '0 12px', marginBottom: '16px' }}>CONTROLE FINANCEIRO</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {[
                { icon: '📋', label: 'Lançamento de contas', href: '/financeiro', active: false },
              ].map(item => (
                <div key={item.label} onClick={() => router.push(item.href)}
                  style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', borderRadius: '8px', cursor: 'pointer', color: '#334155', fontSize: '14px', fontWeight: 500, borderRight: '4px solid transparent' }}>
                  <span>{item.icon}</span> {item.label}
                </div>
              ))}
            </div>
          </div>
        </nav>

        <div style={{ padding: '24px', borderTop: '1px solid #E2E8F0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px', backgroundColor: '#F8FAFC', borderRadius: '12px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '9999px', backgroundColor: '#CBD5E1', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '14px', flexShrink: 0 }}>A</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>Admin Vira Lata</div>
              <div style={{ fontSize: '12px', color: '#64748B' }}>Sair do sistema</div>
            </div>
            <button onClick={logout} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', fontSize: '18px', flexShrink: 0 }}>↪</button>
          </div>
        </div>
      </aside>

      {/* MAIN */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* HEADER */}
        <header style={{ backgroundColor: '#fff', borderBottom: '1px solid #E2E8F0', padding: '0 32px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
            <span style={{ color: '#94A3B8', fontWeight: 400 }}>Peludos</span>
            <span style={{ color: '#CBD5E1', fontSize: '12px' }}>›</span>
            <span style={{ color: '#0F172A', fontWeight: 600 }}>Gestão de Peludos</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ position: 'relative', isolation: 'isolate' }}>
              <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', fontSize: '14px', zIndex: 1 }}>⌕</span>
              <input
                placeholder="Buscar animal pelo nome..."
                value={filters.search}
                onChange={e => { setFilters({ ...filters, search: e.target.value }); setPage(1) }}
                style={{ padding: '8px 16px 9px 40px', border: 'none', borderRadius: '8px', fontSize: '14px', width: '256px', outline: 'none', backgroundColor: '#F1F5F9', color: '#6B7280', fontFamily: 'Manrope, sans-serif' }}
              />
            </div>
            <div style={{ width: '1px', height: '32px', backgroundColor: '#E2E8F0' }} />
            <button onClick={openNew}
              style={{ backgroundColor: '#40BFC1', color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 20px', fontSize: '14px', fontWeight: 700, cursor: 'pointer', boxShadow: '0px 1px 2px rgba(64,191,193,0.2)', fontFamily: 'Manrope, sans-serif' }}>
              + Cadastrar animal
            </button>
          </div>
        </header>

        <main style={{ padding: '32px', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>

          {/* TITLE */}
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
            <div>
              <h1 style={{ fontSize: '30px', fontWeight: 800, color: '#0F172A', lineHeight: '36px', marginBottom: '4px' }}>Gestão de Peludos</h1>
              <p style={{ fontSize: '16px', color: '#64748B', fontWeight: 400 }}>Gerencie a listagem e informações de todos os animais resgatados.</p>
            </div>
          </div>

          {/* FILTERS */}
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', flexDirection: 'column', width: '160px' }}>
              <span style={labelStyle}>STATUS</span>
              <select value={filters.status} onChange={e => { setFilters({ ...filters, status: e.target.value }); setPage(1) }} style={{ ...selectStyle, width: '160px' }}>
                <option value="">Todos os Status</option>
                <option value="NO_ABRIGO">No Abrigo</option>
                <option value="ADOTADO">Adotado</option>
                <option value="FALECIDO">Falecido</option>
                <option value="DESAPARECIDO">Desaparecido</option>
                <option value="LT">Lar Temporário</option>
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', width: '158px' }}>
              <span style={labelStyle}>PORTE</span>
              <select value={filters.porte} onChange={e => { setFilters({ ...filters, porte: e.target.value }); setPage(1) }} style={{ ...selectStyle, width: '158px' }}>
                <option value="">Todos os Portes</option>
                <option value="PEQUENO">Pequeno</option>
                <option value="MEDIO">Médio</option>
                <option value="GRANDE">Grande</option>
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', width: '120px' }}>
              <span style={labelStyle}>SEXO</span>
              <select value={filters.sexo} onChange={e => { setFilters({ ...filters, sexo: e.target.value }); setPage(1) }} style={{ ...selectStyle, width: '120px' }}>
                <option value="">Todos</option>
                <option value="M">Macho</option>
                <option value="F">Fêmea</option>
              </select>
            </div>
            <div style={{ paddingBottom: '0px' }}>
              <button onClick={clearFilters}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#475569', fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '8px', height: '38px', fontFamily: 'Manrope, sans-serif' }}>
                ⊘ Limpar
              </button>
            </div>
          </div>

          {/* TABLE */}
          <div style={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0px 1px 2px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                  {[
                    { label: 'FOTO', w: '96px' },
                    { label: 'NOME', w: '137px' },
                    { label: 'PORTE', w: '157px' },
                    { label: 'SEXO', w: '106px' },
                    { label: 'STATUS', w: '92px' },
                    { label: 'AÇÕES', w: '165px', right: true },
                  ].map(h => (
                    <th key={h.label} style={{ padding: '16px 24px', textAlign: h.right ? 'right' : 'left', fontSize: '12px', fontWeight: 700, color: '#64748B', letterSpacing: '0.6px', textTransform: 'uppercase', width: h.w }}>
                      {h.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#94A3B8', fontSize: '14px' }}>Carregando...</td></tr>
                ) : paginated.length === 0 ? (
                  <tr><td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#94A3B8', fontSize: '14px' }}>Nenhum animal encontrado.</td></tr>
                ) : paginated.map((animal, i) => {
                  const sc = STATUS_COLORS[animal.status] || { bg: '#F1F5F9', color: '#64748B' }
                  return (
                    <tr key={animal.id}
                      style={{ borderTop: i > 0 ? '1px solid #F1F5F9' : 'none' }}
                      onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                      onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}>

                      {/* FOTO */}
                      <td style={{ padding: '16px 24px' }}>
                        <div style={{ width: '48px', height: '48px', borderRadius: '8px', border: '1px solid #E2E8F0', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', backgroundColor: '#F8FAFC' }}>
                          {(animal as any).foto_url
                            ? <img src={(animal as any).foto_url} alt={animal.nome} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : '🐾'}
                        </div>
                      </td>

                      {/* NOME */}
                      <td style={{ padding: '22px 24px' }}>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>{animal.nome}</div>
                        <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>ID: #VL-{String(animal.id).padStart(3, '0')}</div>
                      </td>

                      {/* PORTE */}
                      <td style={{ padding: '30px 24px', fontSize: '14px', color: '#475569' }}>{PORTE_LABELS[animal.porte] || animal.porte}</td>

                      {/* SEXO */}
                      <td style={{ padding: '30px 24px', fontSize: '14px', color: '#475569' }}>{SEXO_LABELS[animal.sexo] || animal.sexo}</td>

                      {/* STATUS */}
                      <td style={{ padding: '27px 24px' }}>
                        <span style={{ backgroundColor: sc.bg, color: sc.color, padding: '4.5px 10px', borderRadius: '9999px', fontSize: '12px', fontWeight: 700, letterSpacing: '-0.3px', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                          {STATUS_LABELS[animal.status] || animal.status}
                        </span>
                      </td>

                      {/* AÇÕES */}
                      <td style={{ padding: '0 24px 0 0' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '8px' }}>
                          <button title="Visualizar" onClick={() => setViewAnimal(animal)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', fontSize: '1rem', padding: '8px', borderRadius: '8px' }}
                            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = '#40BFC1')}
                            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = '#94A3B8')}>○</button>
                          <button title="Editar" onClick={() => openEdit(animal)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', fontSize: '1rem', padding: '8px', borderRadius: '8px' }}
                            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = '#40BFC1')}
                            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = '#94A3B8')}>✎</button>
                          <button title="Excluir" onClick={() => handleDelete(animal.id)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', fontSize: '1rem', padding: '8px', borderRadius: '8px' }}
                            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = '#EF4444')}
                            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = '#94A3B8')}>✕</button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {/* PAGINATION */}
            <div style={{ padding: '16px 24px', borderTop: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', fontWeight: 500, color: '#64748B' }}>
                Mostrando {animais.length === 0 ? 0 : (page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, animais.length)} de {animais.length} peludos registrados
              </span>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  style={{ width: '22px', height: '25px', border: '1px solid #E2E8F0', borderRadius: '8px', background: '#fff', cursor: page === 1 ? 'not-allowed' : 'pointer', color: '#94A3B8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>‹</button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                  <button key={n} onClick={() => setPage(n)}
                    style={{ width: '32px', height: '32px', border: 'none', borderRadius: '8px', background: n === page ? '#40BFC1' : 'transparent', color: n === page ? '#fff' : '#475569', cursor: 'pointer', fontWeight: 700, fontSize: '12px', fontFamily: 'Manrope, sans-serif' }}>
                    {n}
                  </button>
                ))}
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  style={{ width: '22px', height: '25px', border: '1px solid #E2E8F0', borderRadius: '8px', background: '#fff', cursor: page === totalPages ? 'not-allowed' : 'pointer', color: '#94A3B8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>›</button>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* MODAL CADASTRO / EDIÇÃO */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}
          onClick={e => { if (e.target === e.currentTarget) setShowModal(false) }}>
          <div style={{ background: '#fff', borderRadius: '16px', padding: '32px', width: '100%', maxWidth: '480px', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A' }}>{editAnimal ? 'Editar Animal' : 'Cadastrar Animal'}</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.3rem', color: '#94A3B8' }}>✕</button>
            </div>

            {formErrors.general && (
              <div style={{ background: '#fff5f5', border: '1px solid #fca5a5', borderRadius: '8px', padding: '10px 14px', color: '#dc2626', fontSize: '14px', marginBottom: '16px' }}>
                {formErrors.general}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', maxHeight: '60vh', overflowY: 'auto', paddingRight: '4px' }}>

              {/* FOTO */}
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#0F172A', display: 'block', marginBottom: '6px', letterSpacing: '0.3px' }}>
                  Foto <span style={{ color: '#94A3B8', fontWeight: 400 }}>(opcional)</span>
                </label>
                <div
                  style={{ border: '1.5px dashed #E2E8F0', borderRadius: '8px', padding: '16px', textAlign: 'center', cursor: 'pointer', backgroundColor: '#F8FAFC' }}
                  onClick={() => document.getElementById('foto-input')?.click()}>
                  {form.fotoPreview ? (
                    <img src={form.fotoPreview} alt="Preview" style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '8px', margin: '0 auto', display: 'block' }} />
                  ) : (
                    <div>
                      <div style={{ fontSize: '1.5rem', color: '#CBD5E1', marginBottom: '6px' }}>⊕</div>
                      <div style={{ fontSize: '12px', color: '#94A3B8' }}>Clique para adicionar foto</div>
                    </div>
                  )}
                  <input id="foto-input" type="file" accept="image/*" style={{ display: 'none' }}
                    onChange={e => {
                      const file = e.target.files?.[0]
                      if (file) setForm({ ...form, fotoFile: file, fotoPreview: URL.createObjectURL(file) })
                    }} />
                </div>
                {form.fotoPreview && (
                  <button type="button" onClick={() => setForm({ ...form, fotoFile: null, fotoPreview: '' })}
                    style={{ marginTop: '6px', background: 'none', border: 'none', color: '#EF4444', fontSize: '12px', cursor: 'pointer' }}>
                    ✕ Remover foto
                  </button>
                )}
              </div>

              {/* NOME */}
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#0F172A', display: 'block', marginBottom: '6px' }}>Nome *</label>
                <input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })}
                  style={inputModalStyle(!!formErrors.nome)} />
                {formErrors.nome && <p style={{ color: '#EF4444', fontSize: '12px', marginTop: '3px' }}>{formErrors.nome}</p>}
              </div>

              {/* SEXO */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#0F172A', display: 'block', marginBottom: '6px' }}>Sexo</label>
                <select value={form.sexo} onChange={e => setForm({ ...form, sexo: e.target.value })}
                  style={{ ...selectStyle, width: '100%', boxSizing: 'border-box' }}>
                  <option value="M">Macho</option>
                  <option value="F">Fêmea</option>
                </select>
              </div>

              {/* PORTE */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#0F172A', display: 'block', marginBottom: '6px' }}>Porte</label>
                <select value={form.porte} onChange={e => setForm({ ...form, porte: e.target.value })}
                  style={{ ...selectStyle, width: '100%', boxSizing: 'border-box' }}>
                  <option value="PEQUENO">Pequeno</option>
                  <option value="MEDIO">Médio</option>
                  <option value="GRANDE">Grande</option>
                </select>
              </div>

              {/* STATUS */}
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#0F172A', display: 'block', marginBottom: '6px' }}>Status</label>
                <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}
                  style={{ ...selectStyle, width: '100%', boxSizing: 'border-box' }}>
                  <option value="NO_ABRIGO">No Abrigo</option>
                  <option value="ADOTADO">Adotado</option>
                  <option value="FALECIDO">Falecido</option>
                  <option value="DESAPARECIDO">Desaparecido</option>
                  <option value="LT">Lar Temporário</option>
                </select>
              </div>

              {/* CASTRADO */}
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#0F172A', display: 'block', marginBottom: '8px' }}>Castrado?</label>
                <div style={{ display: 'flex', gap: '12px' }}>
                  {[{ label: 'Sim', value: true }, { label: 'Não', value: false }].map(opt => (
                    <button key={opt.label} type="button" onClick={() => setForm({ ...form, castrado: opt.value })}
                      style={{ padding: '9px 24px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 600, border: form.castrado === opt.value ? 'none' : '1px solid #E2E8F0', background: form.castrado === opt.value ? '#40BFC1' : '#fff', color: form.castrado === opt.value ? '#fff' : '#475569', fontFamily: 'Manrope, sans-serif' }}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* APARÊNCIA */}
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#0F172A', display: 'block', marginBottom: '6px' }}>
                  Aparência <span style={{ color: '#94A3B8', fontWeight: 400 }}>(opcional)</span>
                </label>
                <textarea value={form.aparencia} onChange={e => setForm({ ...form, aparencia: e.target.value })}
                  placeholder="Descreva a aparência do animal..." rows={2}
                  style={{ ...inputModalStyle(), resize: 'vertical' }} />
              </div>

              {/* COMPORTAMENTO */}
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#0F172A', display: 'block', marginBottom: '6px' }}>
                  Comportamento <span style={{ color: '#94A3B8', fontWeight: 400 }}>(opcional)</span>
                </label>
                <textarea value={form.comportamento} onChange={e => setForm({ ...form, comportamento: e.target.value })}
                  placeholder="Descreva o comportamento do animal..." rows={2}
                  style={{ ...inputModalStyle(), resize: 'vertical' }} />
              </div>

              {/* OBSERVAÇÕES */}
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#0F172A', display: 'block', marginBottom: '6px' }}>
                  Observações <span style={{ color: '#94A3B8', fontWeight: 400 }}>(opcional)</span>
                </label>
                <textarea value={form.observacoes} onChange={e => setForm({ ...form, observacoes: e.target.value })}
                  placeholder="Alguma observação importante..." rows={2}
                  style={{ ...inputModalStyle(), resize: 'vertical' }} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              <button onClick={() => setShowModal(false)}
                style={{ flex: 1, padding: '12px', border: '1px solid #E2E8F0', borderRadius: '8px', background: '#fff', cursor: 'pointer', fontSize: '14px', fontWeight: 600, color: '#475569', fontFamily: 'Manrope, sans-serif' }}>
                Cancelar
              </button>
              <button onClick={handleSave}
                style={{ flex: 1, padding: '12px', border: 'none', borderRadius: '8px', background: '#40BFC1', cursor: 'pointer', fontSize: '14px', fontWeight: 700, color: '#fff', fontFamily: 'Manrope, sans-serif' }}>
                {editAnimal ? 'Salvar alterações' : 'Cadastrar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DETALHES */}
      {viewAnimal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}
          onClick={e => { if (e.target === e.currentTarget) setViewAnimal(null) }}>
          <div style={{ background: '#fff', borderRadius: '16px', padding: '32px', width: '100%', maxWidth: '480px', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A' }}>Detalhes do Animal</h2>
              <button onClick={() => setViewAnimal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.3rem', color: '#94A3B8' }}>✕</button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px', padding: '16px', backgroundColor: '#F8FAFC', borderRadius: '12px' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '12px', border: '4px solid #F8FAFC', boxShadow: '0px 1px 2px rgba(0,0,0,0.05)', overflow: 'hidden', backgroundColor: 'rgba(64,191,193,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', flexShrink: 0 }}>
                {(viewAnimal as any).foto_url
                  ? <img src={(viewAnimal as any).foto_url} alt={viewAnimal.nome} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : '🐾'}
              </div>
              <div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', marginBottom: '2px' }}>{viewAnimal.nome}</div>
                <div style={{ fontSize: '12px', color: '#64748B', marginBottom: '6px' }}>ID: #VL-{String(viewAnimal.id).padStart(3, '0')}</div>
                <span style={{ backgroundColor: (STATUS_COLORS[viewAnimal.status] || { bg: '#F1F5F9' }).bg, color: (STATUS_COLORS[viewAnimal.status] || { color: '#64748B' }).color, padding: '2px 8px', borderRadius: '9999px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase' }}>
                  {STATUS_LABELS[viewAnimal.status] || viewAnimal.status}
                </span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              {[
                { label: 'SEXO', value: SEXO_LABELS[viewAnimal.sexo] || viewAnimal.sexo },
                { label: 'PORTE', value: PORTE_LABELS[viewAnimal.porte] || viewAnimal.porte },
                { label: 'CASTRADO', value: (viewAnimal as any).castrado ? 'Sim' : 'Não' },
                { label: 'NASCIMENTO', value: (viewAnimal as any).data_nascimento || 'Não informado' },
                { label: 'CADASTRADO', value: (viewAnimal as any).criado_em ? new Date((viewAnimal as any).criado_em).toLocaleDateString('pt-BR') : '—' },
                { label: 'ATUALIZADO', value: (viewAnimal as any).atualizado_em ? new Date((viewAnimal as any).atualizado_em).toLocaleDateString('pt-BR') : '—' },
              ].map(item => (
                <div key={item.label} style={{ backgroundColor: '#F8FAFC', borderRadius: '8px', padding: '12px' }}>
                  <div style={{ fontSize: '10px', fontWeight: 700, color: '#94A3B8', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '4px' }}>{item.label}</div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#334155' }}>{item.value}</div>
                </div>
              ))}
            </div>

            {(viewAnimal as any).aparencia && (
              <div style={{ backgroundColor: '#F8FAFC', borderRadius: '8px', padding: '12px', marginBottom: '12px' }}>
                <div style={{ fontSize: '10px', fontWeight: 700, color: '#94A3B8', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '6px' }}>APARÊNCIA</div>
                <div style={{ fontSize: '14px', color: '#475569', lineHeight: '1.6' }}>{(viewAnimal as any).aparencia}</div>
              </div>
            )}

            {(viewAnimal as any).comportamento && (
              <div style={{ backgroundColor: '#F8FAFC', borderRadius: '8px', padding: '12px', marginBottom: '12px' }}>
                <div style={{ fontSize: '10px', fontWeight: 700, color: '#94A3B8', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '6px' }}>COMPORTAMENTO</div>
                <div style={{ fontSize: '14px', color: '#475569', lineHeight: '1.6' }}>{(viewAnimal as any).comportamento}</div>
              </div>
            )}

            {(viewAnimal as any).observacoes && (
              <div style={{ backgroundColor: '#F8FAFC', borderRadius: '8px', padding: '12px', marginBottom: '16px' }}>
                <div style={{ fontSize: '10px', fontWeight: 700, color: '#94A3B8', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '6px' }}>OBSERVAÇÕES</div>
                <div style={{ fontSize: '14px', color: '#475569', lineHeight: '1.6' }}>{(viewAnimal as any).observacoes}</div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              <button onClick={() => setViewAnimal(null)}
                style={{ flex: 1, padding: '12px', border: '1px solid #E2E8F0', borderRadius: '8px', background: '#fff', cursor: 'pointer', fontSize: '14px', fontWeight: 600, color: '#475569', fontFamily: 'Manrope, sans-serif' }}>
                Fechar
              </button>
              <button onClick={() => { setViewAnimal(null); openEdit(viewAnimal) }}
                style={{ flex: 1, padding: '12px', border: 'none', borderRadius: '8px', background: '#40BFC1', cursor: 'pointer', fontSize: '14px', fontWeight: 700, color: '#fff', fontFamily: 'Manrope, sans-serif' }}>
                ✎ Editar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
