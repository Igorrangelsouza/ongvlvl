'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import { logout } from '@/lib/auth'

type Animal = {
  id: number
  nome: string
  raca?: string
  sexo: string
  porte: string
  status: string
  castrado?: boolean
  aparencia?: string
  comportamento?: string
  observacoes?: string
  data_nascimento?: string
  criado_em?: string
  atualizado_em?: string
  foto_url?: string
}

const STATUS_LABELS: Record<string, string> = {
  NO_ABRIGO: 'No Abrigo', ADOTADO: 'Adotado', FALECIDO: 'Falecido',
  DESAPARECIDO: 'Desaparecido', LT: 'Lar Temporário',
}
const SEXO_LABELS: Record<string, string> = { M: 'Macho', F: 'Fêmea' }
const PORTE_LABELS: Record<string, string> = { PEQUENO: 'Pequeno', MEDIO: 'Médio', GRANDE: 'Grande' }

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  NO_ABRIGO: { bg: 'rgba(64,191,193,0.1)', color: '#40BFC1' },
  ADOTADO:   { bg: '#DBEAFE', color: '#3B82F6' },
  FALECIDO:  { bg: '#FEE2E2', color: '#EF4444' },
  DESAPARECIDO: { bg: '#FEF3C7', color: '#F59E0B' },
  LT:        { bg: '#F3E8FF', color: '#A855F7' },
}

const COLUNAS_DISPONIVEIS = [
  { key: 'id',              label: 'ID' },
  { key: 'nome',            label: 'Nome' },
  { key: 'raca',            label: 'Raça' },
  { key: 'sexo',            label: 'Sexo' },
  { key: 'porte',           label: 'Porte' },
  { key: 'status',          label: 'Status' },
  { key: 'castrado',        label: 'Castrado' },
  { key: 'aparencia',       label: 'Aparência' },
  { key: 'comportamento',   label: 'Comportamento' },
  { key: 'observacoes',     label: 'Observações' },
  { key: 'data_nascimento', label: 'Nascimento' },
  { key: 'criado_em',       label: 'Cadastrado em' },
  { key: 'atualizado_em',   label: 'Atualizado em' },
]

export default function ExportacaoPage() {
  const router = useRouter()
  const [animais, setAnimais]     = useState<Animal[]>([])
  const [loading, setLoading]     = useState(true)
  const [exporting, setExporting] = useState(false)

  const [filters, setFilters] = useState({
    status: '', porte: '', sexo: '', castrado: '', search: '',
    dataInicio: '', dataFim: '',
  })

  const [colunas, setColunas] = useState<string[]>(
    ['id', 'nome', 'sexo', 'porte', 'status', 'castrado', 'criado_em']
  )

  const [formato, setFormato] = useState<'csv' | 'json'>('csv')
  const [preview, setPreview] = useState(false)

  async function fetchAnimais() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filters.status)   params.append('status', filters.status)
      if (filters.porte)    params.append('porte', filters.porte)
      if (filters.sexo)     params.append('sexo', filters.sexo)
      if (filters.search)   params.append('search', filters.search)
      const { data } = await api.get(`/animais/?${params}`)
      let lista: Animal[] = Array.isArray(data) ? data : (data.results ?? [])

      if (filters.castrado !== '') {
        const val = filters.castrado === 'true'
        lista = lista.filter(a => a.castrado === val)
      }
      if (filters.dataInicio) {
        lista = lista.filter(a => a.criado_em && a.criado_em >= filters.dataInicio)
      }
      if (filters.dataFim) {
        lista = lista.filter(a => a.criado_em && a.criado_em <= filters.dataFim + 'T23:59:59')
      }

      setAnimais(lista)
    } catch {
      setAnimais([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchAnimais() }, [filters])

  function toggleColuna(key: string) {
    setColunas(prev =>
      prev.includes(key) ? prev.filter(c => c !== key) : [...prev, key]
    )
  }

  function selecionarTodas() { setColunas(COLUNAS_DISPONIVEIS.map(c => c.key)) }
  function limparColunas()   { setColunas([]) }

  function getValor(animal: Animal, key: string): string {
    const v = (animal as any)[key]
    if (key === 'sexo')    return SEXO_LABELS[v] ?? v ?? ''
    if (key === 'porte')   return PORTE_LABELS[v] ?? v ?? ''
    if (key === 'status')  return STATUS_LABELS[v] ?? v ?? ''
    if (key === 'castrado') return v ? 'Sim' : 'Não'
    if ((key === 'criado_em' || key === 'atualizado_em') && v)
      return new Date(v).toLocaleDateString('pt-BR')
    return v ?? ''
  }

  function exportarCSV() {
    setExporting(true)
    const colsOrdenadas = COLUNAS_DISPONIVEIS.filter(c => colunas.includes(c.key))
    const header = colsOrdenadas.map(c => c.label).join(';')
    const rows = animais.map(a =>
      colsOrdenadas.map(c => {
        const val = getValor(a, c.key)
        return `"${String(val).replace(/"/g, '""')}"`
      }).join(';')
    )
    const csv = [header, ...rows].join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `animais_vlvl_${new Date().toISOString().slice(0,10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
    setExporting(false)
  }

  function exportarJSON() {
    setExporting(true)
    const colsOrdenadas = COLUNAS_DISPONIVEIS.filter(c => colunas.includes(c.key))
    const dados = animais.map(a =>
      Object.fromEntries(colsOrdenadas.map(c => [c.key, getValor(a, c.key)]))
    )
    const blob = new Blob([JSON.stringify(dados, null, 2)], { type: 'application/json' })
    const url  = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `animais_vlvl_${new Date().toISOString().slice(0,10)}.json`
    link.click()
    URL.revokeObjectURL(url)
    setExporting(false)
  }

  function handleExportar() {
    if (formato === 'csv') exportarCSV()
    else exportarJSON()
  }

  function limparFiltros() {
    setFilters({ status: '', porte: '', sexo: '', castrado: '', search: '', dataInicio: '', dataFim: '' })
  }

  const colsOrdenadas = COLUNAS_DISPONIVEIS.filter(c => colunas.includes(c.key))

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

  const inputStyle: React.CSSProperties = {
    padding: '8px 13px', border: '1px solid #E2E8F0', borderRadius: '8px',
    fontSize: '14px', color: '#0F172A', backgroundColor: '#fff',
    outline: 'none', fontFamily: 'Manrope, sans-serif', height: '38px',
    boxSizing: 'border-box', width: '100%',
  }

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
                { icon: '🐾', label: 'Cadastro de Animais', active: false, href: '/animais' },
                { icon: '💊', label: 'Saúde dos animais',   active: false, href: '/saude' },
                { icon: '📄', label: 'Exportação de dados', active: true,  href: '/exportacao' },
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
              {[{ icon: '📋', label: 'Lançamento de contas', href: '/financeiro', active: false }].map(item => (
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
            <span style={{ color: '#0F172A', fontWeight: 600 }}>Exportação de Dados</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '8px', padding: '6px 14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '9999px', backgroundColor: '#22C55E', display: 'inline-block' }} />
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#16A34A' }}>
                {loading ? '...' : `${animais.length} registro${animais.length !== 1 ? 's' : ''} encontrado${animais.length !== 1 ? 's' : ''}`}
              </span>
            </div>
          </div>
        </header>

        <main style={{ padding: '32px', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>

          {/* TITLE */}
          <div>
            <h1 style={{ fontSize: '30px', fontWeight: 800, color: '#0F172A', lineHeight: '36px', marginBottom: '4px' }}>Exportação de Dados</h1>
            <p style={{ fontSize: '16px', color: '#64748B', fontWeight: 400 }}>Filtre, selecione colunas e exporte os dados dos animais em CSV ou JSON.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '24px', alignItems: 'start' }}>

            {/* COLUNA ESQUERDA */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

              {/* FILTROS */}
              <div style={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '24px', boxShadow: '0px 1px 2px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '16px' }}>🔍</span>
                    <span style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A' }}>Filtros</span>
                  </div>
                  <button onClick={limparFiltros}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', fontFamily: 'Manrope, sans-serif' }}>
                    ⊘ Limpar filtros
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  <div>
                    <span style={labelStyle}>STATUS</span>
                    <select value={filters.status} onChange={e => setFilters({ ...filters, status: e.target.value })}
                      style={{ ...selectStyle, width: '100%', boxSizing: 'border-box' }}>
                      <option value="">Todos</option>
                      <option value="NO_ABRIGO">No Abrigo</option>
                      <option value="ADOTADO">Adotado</option>
                      <option value="FALECIDO">Falecido</option>
                      <option value="DESAPARECIDO">Desaparecido</option>
                      <option value="LT">Lar Temporário</option>
                    </select>
                  </div>
                  <div>
                    <span style={labelStyle}>PORTE</span>
                    <select value={filters.porte} onChange={e => setFilters({ ...filters, porte: e.target.value })}
                      style={{ ...selectStyle, width: '100%', boxSizing: 'border-box' }}>
                      <option value="">Todos</option>
                      <option value="PEQUENO">Pequeno</option>
                      <option value="MEDIO">Médio</option>
                      <option value="GRANDE">Grande</option>
                    </select>
                  </div>
                  <div>
                    <span style={labelStyle}>SEXO</span>
                    <select value={filters.sexo} onChange={e => setFilters({ ...filters, sexo: e.target.value })}
                      style={{ ...selectStyle, width: '100%', boxSizing: 'border-box' }}>
                      <option value="">Todos</option>
                      <option value="M">Macho</option>
                      <option value="F">Fêmea</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                  <div>
                    <span style={labelStyle}>CASTRADO</span>
                    <select value={filters.castrado} onChange={e => setFilters({ ...filters, castrado: e.target.value })}
                      style={{ ...selectStyle, width: '100%', boxSizing: 'border-box' }}>
                      <option value="">Todos</option>
                      <option value="true">Sim</option>
                      <option value="false">Não</option>
                    </select>
                  </div>
                  <div>
                    <span style={labelStyle}>CADASTRADO DE</span>
                    <input type="date" value={filters.dataInicio}
                      onChange={e => setFilters({ ...filters, dataInicio: e.target.value })}
                      style={inputStyle} />
                  </div>
                  <div>
                    <span style={labelStyle}>CADASTRADO ATÉ</span>
                    <input type="date" value={filters.dataFim}
                      onChange={e => setFilters({ ...filters, dataFim: e.target.value })}
                      style={inputStyle} />
                  </div>
                </div>

                <div style={{ marginTop: '16px' }}>
                  <span style={labelStyle}>BUSCAR POR NOME</span>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', fontSize: '14px' }}>⌕</span>
                    <input
                      placeholder="Nome do animal..."
                      value={filters.search}
                      onChange={e => setFilters({ ...filters, search: e.target.value })}
                      style={{ ...inputStyle, paddingLeft: '36px' }}
                    />
                  </div>
                </div>
              </div>

              {/* PREVIEW */}
              <div style={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0px 1px 2px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
                <div style={{ padding: '16px 24px', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '15px' }}>👁</span>
                    <span style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A' }}>Pré-visualização</span>
                    <span style={{ fontSize: '12px', color: '#94A3B8', fontWeight: 500 }}>(primeiros 5 registros)</span>
                  </div>
                  <button onClick={() => setPreview(p => !p)}
                    style={{ background: 'none', border: '1px solid #E2E8F0', borderRadius: '8px', cursor: 'pointer', color: '#475569', fontSize: '13px', fontWeight: 600, padding: '5px 14px', fontFamily: 'Manrope, sans-serif' }}>
                    {preview ? 'Ocultar' : 'Mostrar'}
                  </button>
                </div>

                {preview && (
                  <div style={{ overflowX: 'auto' }}>
                    {colunas.length === 0 ? (
                      <div style={{ padding: '32px', textAlign: 'center', color: '#94A3B8', fontSize: '14px' }}>
                        Selecione pelo menos uma coluna para visualizar.
                      </div>
                    ) : loading ? (
                      <div style={{ padding: '32px', textAlign: 'center', color: '#94A3B8', fontSize: '14px' }}>Carregando...</div>
                    ) : animais.length === 0 ? (
                      <div style={{ padding: '32px', textAlign: 'center', color: '#94A3B8', fontSize: '14px' }}>Nenhum animal encontrado com esses filtros.</div>
                    ) : (
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                        <thead>
                          <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                            {colsOrdenadas.map(c => (
                              <th key={c.key} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, color: '#64748B', letterSpacing: '0.6px', textTransform: 'uppercase', fontSize: '11px', whiteSpace: 'nowrap' }}>
                                {c.label}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {animais.slice(0, 5).map((a, i) => (
                            <tr key={a.id} style={{ borderTop: i > 0 ? '1px solid #F1F5F9' : 'none' }}>
                              {colsOrdenadas.map(c => {
                                const val = getValor(a, c.key)
                                if (c.key === 'status') {
                                  const sc = STATUS_COLORS[a.status] || { bg: '#F1F5F9', color: '#64748B' }
                                  return (
                                    <td key={c.key} style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                                      <span style={{ backgroundColor: sc.bg, color: sc.color, padding: '3px 8px', borderRadius: '9999px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>{val}</span>
                                    </td>
                                  )
                                }
                                return (
                                  <td key={c.key} style={{ padding: '12px 16px', color: '#334155', whiteSpace: 'nowrap', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {val || <span style={{ color: '#CBD5E1' }}>—</span>}
                                  </td>
                                )
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* COLUNA DIREITA */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

              {/* COLUNAS */}
              <div style={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '24px', boxShadow: '0px 1px 2px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '15px' }}>☰</span>
                    <span style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A' }}>Colunas</span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={selecionarTodas}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#40BFC1', fontSize: '12px', fontWeight: 700, fontFamily: 'Manrope, sans-serif' }}>
                      Todas
                    </button>
                    <span style={{ color: '#E2E8F0' }}>|</span>
                    <button onClick={limparColunas}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', fontSize: '12px', fontWeight: 700, fontFamily: 'Manrope, sans-serif' }}>
                      Nenhuma
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {COLUNAS_DISPONIVEIS.map(c => {
                    const ativa = colunas.includes(c.key)
                    return (
                      <div key={c.key} onClick={() => toggleColuna(c.key)}
                        style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '8px', cursor: 'pointer', backgroundColor: ativa ? 'rgba(64,191,193,0.07)' : 'transparent', border: `1px solid ${ativa ? 'rgba(64,191,193,0.25)' : 'transparent'}`, transition: 'all 0.15s' }}>
                        <div style={{ width: '18px', height: '18px', borderRadius: '5px', border: `2px solid ${ativa ? '#40BFC1' : '#CBD5E1'}`, backgroundColor: ativa ? '#40BFC1' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s' }}>
                          {ativa && <span style={{ color: '#fff', fontSize: '11px', fontWeight: 800, lineHeight: 1 }}>✓</span>}
                        </div>
                        <span style={{ fontSize: '13px', fontWeight: ativa ? 600 : 500, color: ativa ? '#0F172A' : '#64748B' }}>{c.label}</span>
                      </div>
                    )
                  })}
                </div>

                <div style={{ marginTop: '12px', padding: '10px 12px', backgroundColor: '#F8FAFC', borderRadius: '8px', fontSize: '12px', color: '#64748B', textAlign: 'center' }}>
                  {colunas.length} de {COLUNAS_DISPONIVEIS.length} colunas selecionadas
                </div>
              </div>

              {/* FORMATO E EXPORTAR */}
              <div style={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '24px', boxShadow: '0px 1px 2px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                  <span style={{ fontSize: '15px' }}>📦</span>
                  <span style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A' }}>Formato</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
                  {(['csv', 'json'] as const).map(f => (
                    <div key={f} onClick={() => setFormato(f)}
                      style={{ padding: '14px', borderRadius: '10px', cursor: 'pointer', border: `2px solid ${formato === f ? '#40BFC1' : '#E2E8F0'}`, backgroundColor: formato === f ? 'rgba(64,191,193,0.07)' : '#F8FAFC', textAlign: 'center', transition: 'all 0.15s' }}>
                      <div style={{ fontSize: '22px', marginBottom: '4px' }}>{f === 'csv' ? '📊' : '{ }'}</div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: formato === f ? '#40BFC1' : '#475569' }}>.{f.toUpperCase()}</div>
                      <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '2px' }}>
                        {f === 'csv' ? 'Excel / Sheets' : 'Developers'}
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  onClick={handleExportar}
                  disabled={exporting || animais.length === 0 || colunas.length === 0}
                  style={{
                    width: '100%', padding: '14px', border: 'none', borderRadius: '10px',
                    background: (exporting || animais.length === 0 || colunas.length === 0) ? '#CBD5E1' : '#40BFC1',
                    color: '#fff', fontSize: '15px', fontWeight: 700, cursor: (exporting || animais.length === 0 || colunas.length === 0) ? 'not-allowed' : 'pointer',
                    fontFamily: 'Manrope, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  }}>
                  {exporting ? 'Exportando...' : `⬇ Exportar ${animais.length} registro${animais.length !== 1 ? 's' : ''}`}
                </button>

                {animais.length === 0 && !loading && (
                  <p style={{ textAlign: 'center', fontSize: '12px', color: '#94A3B8', marginTop: '8px' }}>
                    Nenhum registro encontrado com os filtros atuais.
                  </p>
                )}
                {colunas.length === 0 && (
                  <p style={{ textAlign: 'center', fontSize: '12px', color: '#F59E0B', marginTop: '8px' }}>
                    Selecione pelo menos uma coluna para exportar.
                  </p>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
