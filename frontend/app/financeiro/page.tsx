'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import { logout } from '@/lib/auth'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import ToastContainer, { toast } from '@/components/toast'
import { useRipple } from '@/hooks/useRipple'

type Conta = {
    id: number; descricao: string; fornecedor: string; categoria: string
    categoria_display: string; valor: string; vencimento: string
    status: string; status_display: string; dias_vencimento: number
    observacoes: string; pagamento?: any
}

type Resumo = {
    total_pago: number; total_pendente: number; total_vencido: number
    qtd_vencidas: number; por_mes: { mes: string; pago: number; pendente: number; vencido: number }[]
}

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
    PENDENTE: { bg: '#FEF3C7', color: '#B45309' },
    PAGO: { bg: '#D1FAE5', color: '#059669' },
    VENCIDO: { bg: '#FEE2E2', color: '#DC2626' },
}

export default function FinanceiroPage() {
    const router = useRouter()
    const [contas, setContas] = useState<Conta[]>([])
    const [resumo, setResumo] = useState<Resumo | null>(null)
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [showPagModal, setShowPagModal] = useState(false)
    const [editConta, setEditConta] = useState<Conta | null>(null)
    const [contaPagar, setContaPagar] = useState<Conta | null>(null)
    const [viewConta, setViewConta] = useState<Conta | null>(null)
    const [filters, setFilters] = useState({ status: '', categoria: '', search: '', data_inicio: '', data_fim: '' })
    const [page, setPage] = useState(1)
    
    const PER_PAGE = 8

    const [form, setForm] = useState({
        descricao: '', fornecedor: '', categoria: 'OUTROS',
        valor: '', vencimento: '', status: 'PENDENTE', observacoes: ''
    })
    const [formPag, setFormPag] = useState({ data_pagamento: '', valor_pago: '', observacoes: '' })
    const [formErrors, setFormErrors] = useState<Record<string, string>>({})

    async function fetchTudo() {
        setLoading(true)
        try {
            const params = new URLSearchParams()
            if (filters.status) params.append('status', filters.status)
            if (filters.categoria) params.append('categoria', filters.categoria)
            if (filters.search) params.append('search', filters.search)
            if (filters.data_inicio) params.append('data_inicio', filters.data_inicio)
            if (filters.data_fim) params.append('data_fim', filters.data_fim)

            const [contasRes, resumoRes] = await Promise.all([
                api.get(`/financeiro/contas/?${params}`),
                api.get('/financeiro/resumo/'),
            ])
            const contasData = Array.isArray(contasRes.data) ? contasRes.data : contasRes.data.results || []
            setContas(contasData)
            setResumo(resumoRes.data)
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { fetchTudo() }, [filters])

    function openNew() {
        setEditConta(null)
        setForm({ descricao: '', fornecedor: '', categoria: 'OUTROS', valor: '', vencimento: '', status: 'PENDENTE', observacoes: '' })
        setFormErrors({})
        setShowModal(true)
    }

    function openEdit(c: Conta) {
        setEditConta(c)
        setForm({ descricao: c.descricao, fornecedor: c.fornecedor, categoria: c.categoria, valor: c.valor, vencimento: c.vencimento, status: c.status, observacoes: c.observacoes })
        setFormErrors({})
        setShowModal(true)
    }

    function openPagar(c: Conta) {
        setContaPagar(c)
        setFormPag({ data_pagamento: new Date().toISOString().split('T')[0], valor_pago: c.valor, observacoes: '' })
        setShowPagModal(true)
    }

    async function handleSave() {
        const e: Record<string, string> = {}
        if (!form.descricao) e.descricao = 'Descrição obrigatória'
        if (!form.valor) e.valor = 'Valor obrigatório'
        if (!form.vencimento) e.vencimento = 'Vencimento obrigatório'
        setFormErrors(e)
        if (Object.keys(e).length > 0) return

        try {
            if (editConta) await api.put(`/financeiro/contas/${editConta.id}/`, form)
            else await api.post('/financeiro/contas/', form)
            setShowModal(false)
            fetchTudo()
        } catch { toast('Erro ao salvar a conta.', 'error') }
    }

    async function handlePagar() {
        if (!contaPagar || !formPag.data_pagamento || !formPag.valor_pago) return
        try {
            await api.post('/financeiro/pagamentos/', { conta: contaPagar.id, ...formPag })
            setShowModal(false)
            toast(editConta ? 'Conta atualizada com sucesso!' : 'Conta lançada com sucesso!')
            fetchTudo()
        } catch { toast('Erro ao registrar pagamento.', 'error') }
        setShowPagModal(false)
        toast('Pagamento registrado com sucesso!')
        fetchTudo()
    }

    async function handleDelete(id: number) {
        if (!confirm('Deseja excluir esta conta?')) return
        try {
            await api.delete(`/financeiro/contas/${id}/`)
            toast('Conta excluída.', 'warning')
            fetchTudo()
        } catch {
            toast('Erro ao excluir a conta.', 'error')
        }
    }

    async function exportar(tipo: 'contas' | 'animais') {
        try {
            const response = await api.get(`/financeiro/export/${tipo}/`, {
                responseType: 'blob',
            })

            // Detecta o tipo real pelo Content-Type da resposta
            const contentType = response.headers['content-type'] || ''
            const extensao = contentType.includes('spreadsheetml') ? 'xlsx'
                : contentType.includes('csv') ? 'csv'
                    : 'xlsx'

            const url = window.URL.createObjectURL(new Blob([response.data]))
            const link = document.createElement('a')
            link.href = url
            link.setAttribute('download', `${tipo}.${extensao}`)
            document.body.appendChild(link)
            link.click()
            link.remove()
            window.URL.revokeObjectURL(url)
        } catch {
            alert('Erro ao exportar.')
        }
    }

    const paginated = contas.slice((page - 1) * PER_PAGE, page * PER_PAGE)
    const totalPages = Math.max(1, Math.ceil(contas.length / PER_PAGE))

    const selectStyle: React.CSSProperties = {
        padding: '8px 32px 8px 12px', border: '1px solid #E2E8F0', borderRadius: '8px',
        fontSize: '13px', color: '#475569', backgroundColor: '#fff', appearance: 'none',
        cursor: 'pointer', outline: 'none', fontFamily: 'Manrope, sans-serif',
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 12 12'%3E%3Cpath fill='%236B7280' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center',
    }

    const inputStyle = (hasError = false): React.CSSProperties => ({
        width: '100%', padding: '10px 12px', border: `1px solid ${hasError ? '#EF4444' : '#E2E8F0'}`,
        borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box',
        backgroundColor: '#F8FAFC', color: '#0F172A', fontFamily: 'Manrope, sans-serif',
    })

    const labelStyle: React.CSSProperties = {
        fontSize: '12px', fontWeight: 700, color: '#0F172A',
        display: 'block', marginBottom: '6px',
    }

    return (
        <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#F6F8F8', fontFamily: 'Manrope, sans-serif' }}>

            {/* SIDEBAR */}
            <aside style={{ width: '288px', minWidth: '288px', backgroundColor: '#fff', borderRight: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '9999px', backgroundColor: '#40BFC1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem', flexShrink: 0 }}>🐾</div>
                    <div>
                        <div style={{ fontWeight: 700, fontSize: '18px', color: '#0F172A' }}>Vira Lata</div>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', letterSpacing: '0.6px', textTransform: 'uppercase' }}>VIRA LUXO</div>
                    </div>
                </div>
                <nav style={{ padding: '24px 16px', flex: 1, display: 'flex', flexDirection: 'column', gap: '32px' }}>
                    <div>
                        <p style={{ fontSize: '12px', fontWeight: 700, color: '#94A3B8', letterSpacing: '1.2px', textTransform: 'uppercase', padding: '0 12px', marginBottom: '16px' }}>PELUDOS</p>
                        {[
                            { icon: '🐾', label: 'Cadastro de Animais', href: '/animais', active: false },
                            { icon: '💊', label: 'Saúde dos animais', href: '/saude', active: false },
                            { icon: '📄', label: 'Exportação de dados', href: '/exportacao', active: false },
                        ].map(item => (
                            <div key={item.label} onClick={() => router.push(item.href)}
                                style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', borderRadius: '8px', cursor: 'pointer', backgroundColor: item.active ? 'rgba(64,191,193,0.1)' : 'transparent', color: item.active ? '#40BFC1' : '#334155', fontWeight: item.active ? 600 : 500, fontSize: '14px', borderRight: item.active ? '4px solid #40BFC1' : '4px solid transparent' }}>
                                <span>{item.icon}</span> {item.label}
                            </div>
                        ))}
                    </div>
                    <div>
                        <p style={{ fontSize: '12px', fontWeight: 700, color: '#94A3B8', letterSpacing: '1.2px', textTransform: 'uppercase', padding: '0 12px', marginBottom: '16px' }}>CONTROLE FINANCEIRO</p>
                        {[
                            { icon: '📋', label: 'Lançamento de contas', href: '/financeiro', active: true },
                        ].map(item => (
                            <div key={item.label} onClick={() => router.push(item.href)}
                                style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', borderRadius: '8px', cursor: 'pointer', backgroundColor: item.active ? 'rgba(64,191,193,0.1)' : 'transparent', color: item.active ? '#40BFC1' : '#334155', fontWeight: item.active ? 600 : 500, fontSize: '14px', borderRight: item.active ? '4px solid #40BFC1' : '4px solid transparent' }}>
                                <span>{item.icon}</span> {item.label}
                            </div>
                        ))}
                    </div>
                </nav>
                <div style={{ padding: '24px', borderTop: '1px solid #E2E8F0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px', backgroundColor: '#F8FAFC', borderRadius: '12px' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '9999px', backgroundColor: '#CBD5E1', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '14px', flexShrink: 0 }}>A</div>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>Admin Vira Lata</div>
                            <div style={{ fontSize: '12px', color: '#64748B' }}>Sair do sistema</div>
                        </div>
                        <button onClick={logout} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', fontSize: '18px' }}>↪</button>
                    </div>
                </div>
            </aside>

            {/* MAIN */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

                {/* HEADER */}
                <header style={{ backgroundColor: '#fff', borderBottom: '1px solid #E2E8F0', padding: '0 32px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                        <span style={{ color: '#94A3B8' }}>Financeiro</span>
                        <span style={{ color: '#CBD5E1' }}>›</span>
                        <span style={{ color: '#0F172A', fontWeight: 600 }}>Controle Financeiro</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <button onClick={() => exportar('animais')}
                            style={{ padding: '8px 16px', border: '1px solid #E2E8F0', borderRadius: '8px', background: '#fff', cursor: 'pointer', fontSize: '13px', fontWeight: 600, color: '#475569', fontFamily: 'Manrope, sans-serif', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            ↓ Exportar Animais
                        </button>
                        <button onClick={() => exportar('contas')}
                            style={{ padding: '8px 16px', border: '1px solid #E2E8F0', borderRadius: '8px', background: '#fff', cursor: 'pointer', fontSize: '13px', fontWeight: 600, color: '#475569', fontFamily: 'Manrope, sans-serif', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            ↓ Exportar Contas
                        </button>
                        <div style={{ width: '1px', height: '32px', backgroundColor: '#E2E8F0' }} />
                        <button onClick={openNew}
                            style={{ backgroundColor: '#40BFC1', color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 20px', fontSize: '14px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Manrope, sans-serif', boxShadow: '0px 1px 2px rgba(64,191,193,0.2)' }}>
                            + Lançar conta
                        </button>
                    </div>
                </header>

                <main style={{ padding: '32px', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>

                    {/* TÍTULO */}
                    <div>
                        <h1 style={{ fontSize: '30px', fontWeight: 800, color: '#0F172A', lineHeight: '36px', marginBottom: '4px' }}>Controle Financeiro</h1>
                        <p style={{ fontSize: '16px', color: '#64748B' }}>Gerencie contas, pagamentos e acompanhe o fluxo financeiro da ONG.</p>
                    </div>

                    {/* CARDS DE RESUMO */}
                    {resumo && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                            {[
                                { label: 'Total Pago', value: resumo.total_pago, icon: '✓', bg: '#D1FAE5', color: '#059669' },
                                { label: 'Total Pendente', value: resumo.total_pendente, icon: '⏳', bg: '#FEF3C7', color: '#B45309' },
                                { label: 'Total Vencido', value: resumo.total_vencido, icon: '⚠', bg: '#FEE2E2', color: '#DC2626' },
                                { label: 'Contas Vencidas', value: resumo.qtd_vencidas, icon: '📋', bg: '#F3E8FF', color: '#7C3AED', isCount: true },
                            ].map(card => (
                                <div key={card.label} style={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: '0px 1px 2px rgba(0,0,0,0.05)' }}>
                                    <div style={{ width: '48px', height: '48px', borderRadius: '9999px', backgroundColor: card.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0 }}>{card.icon}</div>
                                    <div>
                                        <div style={{ fontSize: '22px', fontWeight: 800, color: '#0F172A', lineHeight: 1 }}>
                                            {(card as any).isCount
                                                ? card.value
                                                : `R$ ${Number(card.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                                        </div>
                                        <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>{card.label}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* GRÁFICO */}
                    {resumo && resumo.por_mes.length > 0 && (
                        <div style={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '24px', boxShadow: '0px 1px 2px rgba(0,0,0,0.05)' }}>
                            <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', marginBottom: '24px' }}>Contas por Mês</h3>
                            <ResponsiveContainer width="100%" height={260}>
                                <BarChart data={resumo.por_mes} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                                    <XAxis dataKey="mes" tick={{ fontSize: 12, fill: '#64748B', fontFamily: 'Manrope' }} />
                                    <YAxis tick={{ fontSize: 12, fill: '#64748B', fontFamily: 'Manrope' }} tickFormatter={v => `R$${v}`} />
                                    <Tooltip
                                        formatter={(value) => [`R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, '']}
                                        contentStyle={{ fontFamily: 'Manrope', fontSize: '12px', borderRadius: '8px', border: '1px solid #E2E8F0' }}
                                    />
                                    <Legend wrapperStyle={{ fontFamily: 'Manrope', fontSize: '12px' }} />
                                    <Bar dataKey="pago" name="Pago" fill="#40BFC1" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="pendente" name="Pendente" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="vencido" name="Vencido" fill="#EF4444" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}

                    {/* FILTROS + TABELA */}
                    <div style={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0px 1px 2px rgba(0,0,0,0.05)', overflow: 'hidden' }}>

                        {/* Filtros */}
                        <div style={{ padding: '16px 24px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'flex-end', gap: '12px', flexWrap: 'wrap' as const }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <span style={{ fontSize: '11px', fontWeight: 700, color: '#94A3B8', letterSpacing: '0.6px', textTransform: 'uppercase' as const }}>STATUS</span>
                                <select value={filters.status} onChange={e => setFilters({ ...filters, status: e.target.value })} style={selectStyle}>
                                    <option value="">Todos</option>
                                    <option value="PENDENTE">Pendente</option>
                                    <option value="PAGO">Pago</option>
                                    <option value="VENCIDO">Vencido</option>
                                </select>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <span style={{ fontSize: '11px', fontWeight: 700, color: '#94A3B8', letterSpacing: '0.6px', textTransform: 'uppercase' as const }}>CATEGORIA</span>
                                <select value={filters.categoria} onChange={e => setFilters({ ...filters, categoria: e.target.value })} style={selectStyle}>
                                    <option value="">Todas</option>
                                    <option value="ALIMENTACAO">Alimentação</option>
                                    <option value="VETERINARIO">Veterinário</option>
                                    <option value="MEDICAMENTO">Medicamento</option>
                                    <option value="HIGIENE">Higiene</option>
                                    <option value="INFRAESTRUTURA">Infraestrutura</option>
                                    <option value="TRANSPORTE">Transporte</option>
                                    <option value="OUTROS">Outros</option>
                                </select>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <span style={{ fontSize: '11px', fontWeight: 700, color: '#94A3B8', letterSpacing: '0.6px', textTransform: 'uppercase' as const }}>DE</span>
                                <input type="date" value={filters.data_inicio} onChange={e => setFilters({ ...filters, data_inicio: e.target.value })}
                                    style={{ ...selectStyle, backgroundImage: 'none', padding: '8px 12px' }} />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <span style={{ fontSize: '11px', fontWeight: 700, color: '#94A3B8', letterSpacing: '0.6px', textTransform: 'uppercase' as const }}>ATÉ</span>
                                <input type="date" value={filters.data_fim} onChange={e => setFilters({ ...filters, data_fim: e.target.value })}
                                    style={{ ...selectStyle, backgroundImage: 'none', padding: '8px 12px' }} />
                            </div>
                            <div style={{ position: 'relative' }}>
                                <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', fontSize: '13px' }}>⌕</span>
                                <input placeholder="Buscar..." value={filters.search} onChange={e => setFilters({ ...filters, search: e.target.value })}
                                    style={{ padding: '8px 12px 8px 28px', border: '1px solid #E2E8F0', borderRadius: '8px', fontSize: '13px', outline: 'none', backgroundColor: '#fff', fontFamily: 'Manrope, sans-serif', width: '180px' }} />
                            </div>
                            {(filters.status || filters.categoria || filters.data_inicio || filters.data_fim || filters.search) && (
                                <button onClick={() => setFilters({ status: '', categoria: '', search: '', data_inicio: '', data_fim: '' })}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', fontSize: '13px', fontFamily: 'Manrope, sans-serif' }}>
                                    ⊘ Limpar
                                </button>
                            )}
                            <span style={{ marginLeft: 'auto', fontSize: '12px', color: '#94A3B8' }}>{contas.length} conta{contas.length !== 1 ? 's' : ''}</span>
                        </div>

                        {/* Tabela */}
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                                    {['DESCRIÇÃO', 'CATEGORIA', 'FORNECEDOR', 'VENCIMENTO', 'VALOR', 'STATUS', 'AÇÕES'].map((h, i) => (
                                        <th key={h} style={{ padding: '14px 20px', textAlign: i === 6 ? 'right' : 'left', fontSize: '12px', fontWeight: 700, color: '#64748B', letterSpacing: '0.6px', textTransform: 'uppercase' as const }}>
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: '#94A3B8' }}>Carregando...</td></tr>
                                ) : paginated.length === 0 ? (
                                    <tr><td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: '#94A3B8' }}>Nenhuma conta encontrada.</td></tr>
                                ) : paginated.map((conta, i) => {
                                    const sc = STATUS_COLORS[conta.status] || { bg: '#F1F5F9', color: '#64748B' }
                                    const vencendo = conta.status === 'PENDENTE' && conta.dias_vencimento <= 7 && conta.dias_vencimento >= 0
                                    return (
                                        <tr key={conta.id} style={{ borderTop: i > 0 ? '1px solid #F1F5F9' : 'none', backgroundColor: vencendo ? 'rgba(254,243,199,0.3)' : 'transparent' }}
                                            onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                                            onMouseLeave={e => (e.currentTarget.style.backgroundColor = vencendo ? 'rgba(254,243,199,0.3)' : 'transparent')}>
                                            <td style={{ padding: '14px 20px' }}>
                                                <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>{conta.descricao}</div>
                                                {conta.observacoes && <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '2px' }}>{conta.observacoes.slice(0, 40)}{conta.observacoes.length > 40 ? '...' : ''}</div>}
                                            </td>
                                            <td style={{ padding: '14px 20px', fontSize: '13px', color: '#475569' }}>{conta.categoria_display}</td>
                                            <td style={{ padding: '14px 20px', fontSize: '13px', color: '#475569' }}>{conta.fornecedor || '—'}</td>
                                            <td style={{ padding: '14px 20px' }}>
                                                <div style={{ fontSize: '13px', color: conta.status === 'VENCIDO' ? '#DC2626' : '#475569', fontWeight: conta.status === 'VENCIDO' ? 700 : 400 }}>
                                                    {new Date(conta.vencimento + 'T00:00:00').toLocaleDateString('pt-BR')}
                                                </div>
                                                {conta.status === 'PENDENTE' && (
                                                    <div style={{ fontSize: '11px', color: conta.dias_vencimento <= 7 ? '#B45309' : '#94A3B8' }}>
                                                        {conta.dias_vencimento > 0 ? `em ${conta.dias_vencimento}d` : conta.dias_vencimento === 0 ? 'hoje' : `${Math.abs(conta.dias_vencimento)}d atrás`}
                                                    </div>
                                                )}
                                            </td>
                                            <td style={{ padding: '14px 20px', fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>
                                                R$ {Number(conta.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                            </td>
                                            <td style={{ padding: '14px 20px' }}>
                                                <span style={{ backgroundColor: sc.bg, color: sc.color, padding: '4px 10px', borderRadius: '9999px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' as const }}>
                                                    {conta.status_display}
                                                </span>
                                            </td>
                                            <td style={{ padding: '14px 20px' }}>
                                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '4px', alignItems: 'center' }}>
                                                    {conta.status !== 'PAGO' && (
                                                        <button title="Registrar pagamento" onClick={() => openPagar(conta)}
                                                            style={{ backgroundColor: '#D1FAE5', color: '#059669', border: 'none', borderRadius: '6px', padding: '5px 10px', fontSize: '11px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Manrope, sans-serif' }}>
                                                            ✓ Pagar
                                                        </button>
                                                    )}
                                                    <button title="Visualizar" onClick={() => setViewConta(conta)}
                                                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', fontSize: '1rem', padding: '6px', borderRadius: '6px' }}
                                                        onMouseEnter={e => (e.currentTarget.style.color = '#40BFC1')}
                                                        onMouseLeave={e => (e.currentTarget.style.color = '#94A3B8')}>○</button>
                                                    <button title="Editar" onClick={() => openEdit(conta)}
                                                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', fontSize: '1rem', padding: '6px', borderRadius: '6px' }}
                                                        onMouseEnter={e => (e.currentTarget.style.color = '#40BFC1')}
                                                        onMouseLeave={e => (e.currentTarget.style.color = '#94A3B8')}>✎</button>
                                                    <button title="Excluir" onClick={() => handleDelete(conta.id)}
                                                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', fontSize: '1rem', padding: '6px', borderRadius: '6px' }}
                                                        onMouseEnter={e => (e.currentTarget.style.color = '#EF4444')}
                                                        onMouseLeave={e => (e.currentTarget.style.color = '#94A3B8')}>✕</button>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>

                        {/* PAGINAÇÃO */}
                        <div style={{ padding: '14px 24px', borderTop: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '12px', color: '#64748B' }}>
                                Mostrando {contas.length === 0 ? 0 : (page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, contas.length)} de {contas.length} contas
                            </span>
                            <div style={{ display: 'flex', gap: '6px' }}>
                                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                                    style={{ width: '28px', height: '28px', border: '1px solid #E2E8F0', borderRadius: '6px', background: '#fff', cursor: page === 1 ? 'not-allowed' : 'pointer', color: '#94A3B8', fontSize: '12px' }}>‹</button>
                                {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                                    <button key={n} onClick={() => setPage(n)}
                                        style={{ width: '28px', height: '28px', border: 'none', borderRadius: '6px', background: n === page ? '#40BFC1' : 'transparent', color: n === page ? '#fff' : '#475569', cursor: 'pointer', fontWeight: 700, fontSize: '12px', fontFamily: 'Manrope, sans-serif' }}>
                                        {n}
                                    </button>
                                ))}
                                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                                    style={{ width: '28px', height: '28px', border: '1px solid #E2E8F0', borderRadius: '6px', background: '#fff', cursor: page === totalPages ? 'not-allowed' : 'pointer', color: '#94A3B8', fontSize: '12px' }}>›</button>
                            </div>
                        </div>
                    </div>
                </main>
            </div>

            {/* MODAL LANÇAR/EDITAR CONTA */}
            {showModal && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}
                    onClick={e => { if (e.target === e.currentTarget) setShowModal(false) }}>
                    <div style={{ background: '#fff', borderRadius: '16px', padding: '32px', width: '100%', maxWidth: '500px', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A' }}>{editConta ? 'Editar Conta' : 'Lançar Conta'}</h2>
                            <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.3rem', color: '#94A3B8' }}>✕</button>
                        </div>
                        {formErrors.general && (
                            <div style={{ background: '#FFF5F5', border: '1px solid #FCA5A5', borderRadius: '8px', padding: '10px 14px', color: '#DC2626', fontSize: '14px', marginBottom: '16px' }}>{formErrors.general}</div>
                        )}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '60vh', overflowY: 'auto', paddingRight: '4px' }}>
                            <div>
                                <label style={labelStyle}>Descrição *</label>
                                <input value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })} style={inputStyle(!!formErrors.descricao)} placeholder="Ex: Ração mensal" />
                                {formErrors.descricao && <p style={{ color: '#EF4444', fontSize: '12px', marginTop: '3px' }}>{formErrors.descricao}</p>}
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div>
                                    <label style={labelStyle}>Categoria</label>
                                    <select value={form.categoria} onChange={e => setForm({ ...form, categoria: e.target.value })} style={{ ...selectStyle, width: '100%', boxSizing: 'border-box' as const }}>
                                        <option value="ALIMENTACAO">Alimentação</option>
                                        <option value="VETERINARIO">Veterinário</option>
                                        <option value="MEDICAMENTO">Medicamento</option>
                                        <option value="HIGIENE">Higiene</option>
                                        <option value="INFRAESTRUTURA">Infraestrutura</option>
                                        <option value="TRANSPORTE">Transporte</option>
                                        <option value="OUTROS">Outros</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={labelStyle}>Status</label>
                                    <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} style={{ ...selectStyle, width: '100%', boxSizing: 'border-box' as const }}>
                                        <option value="PENDENTE">Pendente</option>
                                        <option value="PAGO">Pago</option>
                                        <option value="VENCIDO">Vencido</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label style={labelStyle}>Fornecedor <span style={{ color: '#94A3B8', fontWeight: 400 }}>(opcional)</span></label>
                                <input value={form.fornecedor} onChange={e => setForm({ ...form, fornecedor: e.target.value })} style={inputStyle()} placeholder="Ex: Pet Shop Central" />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div>
                                    <label style={labelStyle}>Valor *</label>
                                    <input type="number" step="0.01" value={form.valor} onChange={e => setForm({ ...form, valor: e.target.value })} style={inputStyle(!!formErrors.valor)} placeholder="0,00" />
                                    {formErrors.valor && <p style={{ color: '#EF4444', fontSize: '12px', marginTop: '3px' }}>{formErrors.valor}</p>}
                                </div>
                                <div>
                                    <label style={labelStyle}>Vencimento *</label>
                                    <input type="date" value={form.vencimento} onChange={e => setForm({ ...form, vencimento: e.target.value })} style={inputStyle(!!formErrors.vencimento)} />
                                    {formErrors.vencimento && <p style={{ color: '#EF4444', fontSize: '12px', marginTop: '3px' }}>{formErrors.vencimento}</p>}
                                </div>
                            </div>
                            <div>
                                <label style={labelStyle}>Observações <span style={{ color: '#94A3B8', fontWeight: 400 }}>(opcional)</span></label>
                                <textarea value={form.observacoes} onChange={e => setForm({ ...form, observacoes: e.target.value })} rows={2}
                                    style={{ ...inputStyle(), resize: 'vertical' as const }} placeholder="Alguma observação..." />
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                            <button onClick={() => setShowModal(false)} style={{ flex: 1, padding: '12px', border: '1px solid #E2E8F0', borderRadius: '8px', background: '#fff', cursor: 'pointer', fontSize: '14px', fontWeight: 600, color: '#475569', fontFamily: 'Manrope, sans-serif' }}>Cancelar</button>
                            <button onClick={handleSave} style={{ flex: 1, padding: '12px', border: 'none', borderRadius: '8px', background: '#40BFC1', cursor: 'pointer', fontSize: '14px', fontWeight: 700, color: '#fff', fontFamily: 'Manrope, sans-serif' }}>
                                {editConta ? 'Salvar alterações' : 'Lançar conta'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL REGISTRAR PAGAMENTO */}
            {showPagModal && contaPagar && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}
                    onClick={e => { if (e.target === e.currentTarget) setShowPagModal(false) }}>
                    <div style={{ background: '#fff', borderRadius: '16px', padding: '32px', width: '100%', maxWidth: '440px', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A' }}>Registrar Pagamento</h2>
                            <button onClick={() => setShowPagModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.3rem', color: '#94A3B8' }}>✕</button>
                        </div>
                        <div style={{ backgroundColor: '#F8FAFC', borderRadius: '12px', padding: '16px', marginBottom: '24px' }}>
                            <div style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', marginBottom: '4px' }}>{contaPagar.descricao}</div>
                            <div style={{ fontSize: '13px', color: '#64748B' }}>
                                {contaPagar.categoria_display} • Vencimento: {new Date(contaPagar.vencimento + 'T00:00:00').toLocaleDateString('pt-BR')}
                            </div>
                            <div style={{ fontSize: '20px', fontWeight: 800, color: '#40BFC1', marginTop: '8px' }}>
                                R$ {Number(contaPagar.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div>
                                <label style={labelStyle}>Data do pagamento *</label>
                                <input type="date" value={formPag.data_pagamento} onChange={e => setFormPag({ ...formPag, data_pagamento: e.target.value })} style={inputStyle()} />
                            </div>
                            <div>
                                <label style={labelStyle}>Valor pago *</label>
                                <input type="number" step="0.01" value={formPag.valor_pago} onChange={e => setFormPag({ ...formPag, valor_pago: e.target.value })} style={inputStyle()} />
                            </div>
                            <div>
                                <label style={labelStyle}>Observações <span style={{ color: '#94A3B8', fontWeight: 400 }}>(opcional)</span></label>
                                <textarea value={formPag.observacoes} onChange={e => setFormPag({ ...formPag, observacoes: e.target.value })} rows={2}
                                    style={{ ...inputStyle(), resize: 'vertical' as const }} />
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                            <button onClick={() => setShowPagModal(false)} style={{ flex: 1, padding: '12px', border: '1px solid #E2E8F0', borderRadius: '8px', background: '#fff', cursor: 'pointer', fontSize: '14px', fontWeight: 600, color: '#475569', fontFamily: 'Manrope, sans-serif' }}>Cancelar</button>
                            <button onClick={handlePagar} disabled={!formPag.data_pagamento || !formPag.valor_pago}
                                style={{ flex: 1, padding: '12px', border: 'none', borderRadius: '8px', background: formPag.data_pagamento && formPag.valor_pago ? '#40BFC1' : '#CBD5E1', cursor: formPag.data_pagamento && formPag.valor_pago ? 'pointer' : 'not-allowed', fontSize: '14px', fontWeight: 700, color: '#fff', fontFamily: 'Manrope, sans-serif' }}>
                                Confirmar pagamento
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL DETALHES DA CONTA */}
            {viewConta && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}
                    onClick={e => { if (e.target === e.currentTarget) setViewConta(null) }}>
                    <div style={{ background: '#fff', borderRadius: '16px', padding: '32px', width: '100%', maxWidth: '480px', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A' }}>Detalhes da Conta</h2>
                            <button onClick={() => setViewConta(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.3rem', color: '#94A3B8' }}>✕</button>
                        </div>

                        {/* Cabeçalho da conta */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px', padding: '16px', backgroundColor: '#F8FAFC', borderRadius: '12px' }}>
                            <div style={{ width: '56px', height: '56px', borderRadius: '12px', backgroundColor: (STATUS_COLORS[viewConta.status] || { bg: '#F1F5F9' }).bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', flexShrink: 0 }}>
                                📋
                            </div>
                            <div>
                                <div style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', marginBottom: '2px' }}>{viewConta.descricao}</div>
                                <div style={{ fontSize: '12px', color: '#64748B', marginBottom: '6px' }}>{viewConta.categoria_display}</div>
                                <span style={{
                                    backgroundColor: (STATUS_COLORS[viewConta.status] || { bg: '#F1F5F9' }).bg,
                                    color: (STATUS_COLORS[viewConta.status] || { color: '#64748B' }).color,
                                    padding: '2px 8px', borderRadius: '9999px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase'
                                }}>
                                    {viewConta.status_display}
                                </span>
                            </div>
                        </div>

                        {/* Grid de detalhes */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                            {[
                                { label: 'VALOR', value: `R$ ${Number(viewConta.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` },
                                { label: 'VENCIMENTO', value: new Date(viewConta.vencimento + 'T00:00:00').toLocaleDateString('pt-BR') },
                                { label: 'CATEGORIA', value: viewConta.categoria_display },
                                { label: 'FORNECEDOR', value: viewConta.fornecedor || '—' },
                            ].map(item => (
                                <div key={item.label} style={{ backgroundColor: '#F8FAFC', borderRadius: '8px', padding: '12px' }}>
                                    <div style={{ fontSize: '10px', fontWeight: 700, color: '#94A3B8', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '4px' }}>{item.label}</div>
                                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#334155' }}>{item.value}</div>
                                </div>
                            ))}
                        </div>

                        {/* Observações */}
                        {viewConta.observacoes && (
                            <div style={{ backgroundColor: '#F8FAFC', borderRadius: '8px', padding: '12px', marginBottom: '16px' }}>
                                <div style={{ fontSize: '10px', fontWeight: 700, color: '#94A3B8', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '4px' }}>OBSERVAÇÕES</div>
                                <div style={{ fontSize: '14px', color: '#475569', lineHeight: '1.6' }}>{viewConta.observacoes}</div>
                            </div>
                        )}

                        {/* Dados do pagamento, se houver */}
                        {viewConta.pagamento && (
                            <div style={{ backgroundColor: '#D1FAE5', borderRadius: '8px', padding: '12px', marginBottom: '16px' }}>
                                <div style={{ fontSize: '10px', fontWeight: 700, color: '#059669', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '8px' }}>✓ PAGAMENTO REGISTRADO</div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                    <div>
                                        <div style={{ fontSize: '10px', color: '#059669', fontWeight: 600, marginBottom: '2px' }}>DATA</div>
                                        <div style={{ fontSize: '13px', fontWeight: 700, color: '#065F46' }}>{new Date(viewConta.pagamento.data_pagamento).toLocaleDateString('pt-BR')}</div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '10px', color: '#059669', fontWeight: 600, marginBottom: '2px' }}>VALOR PAGO</div>
                                        <div style={{ fontSize: '13px', fontWeight: 700, color: '#065F46' }}>R$ {Number(viewConta.pagamento.valor_pago).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                            <button onClick={() => setViewConta(null)}
                                style={{ flex: 1, padding: '12px', border: '1px solid #E2E8F0', borderRadius: '8px', background: '#fff', cursor: 'pointer', fontSize: '14px', fontWeight: 600, color: '#475569', fontFamily: 'Manrope, sans-serif' }}>
                                Fechar
                            </button>
                            <button onClick={() => { setViewConta(null); openEdit(viewConta) }}
                                style={{ flex: 1, padding: '12px', border: 'none', borderRadius: '8px', background: '#40BFC1', cursor: 'pointer', fontSize: '14px', fontWeight: 700, color: '#fff', fontFamily: 'Manrope, sans-serif' }}>
                                ✎ Editar
                            </button>
                        </div>
                    </div>
                </div>
            )}
            <ToastContainer />
        </div>
    )
}
