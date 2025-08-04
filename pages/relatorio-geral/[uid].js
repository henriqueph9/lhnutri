import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { collection, getDocs, getFirestore, orderBy, query, doc, setDoc } from 'firebase/firestore'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import { app } from '../../firebase'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Pie } from 'react-chartjs-2'
import Chart from 'chart.js/auto'

export default function RelatorioGeral() {
  const router = useRouter()
  const { uid } = router.query
  const db = getFirestore(app)
  const auth = getAuth(app)
  
  // Estados do componente
  const [registros, setRegistros] = useState([])
  const [registrosFiltrados, setRegistrosFiltrados] = useState([])
  const [nome, setNome] = useState('')
  const [anotacao, setAnotacao] = useState('')
  const [anotacaoSalva, setAnotacaoSalva] = useState('')
  const [periodoInicial, setPeriodoInicial] = useState(null)
  const [periodoFinal, setPeriodoFinal] = useState(null)
  const [filtroInicio, setFiltroInicio] = useState('')
  const [filtroFim, setFiltroFim] = useState('')
  const [acessoNegado, setAcessoNegado] = useState(false)
  
  const UID_ADMIN = 'GGT2USGNN2QbzhaTaXTlhHZVro12'

  // Carrega os dados do Firebase
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user || user.uid !== UID_ADMIN) {
        setAcessoNegado(true)
      } else {
        setAcessoNegado(false)
        carregarDados()
      }
    })
    return () => unsubscribe()
  }, [uid])

  const carregarDados = async () => {
    if (!uid) return

    try {
      // Carrega dados do usuário
      const userDoc = await getDocs(collection(db, 'usuarios'))
      const userData = userDoc.docs.find(doc => doc.id === uid)?.data()
      
      if (userData) {
        setNome(userData.nome)
        setAnotacaoSalva(userData.relatorioGeralObs || '')
        setAnotacao(userData.relatorioGeralObs || '')
      }

      // Carrega checklists e relatórios
      const checklistsSnap = await getDocs(query(
        collection(db, `usuarios/${uid}/checklists`), 
        orderBy('data')
      ))
      const relatoriosSnap = await getDocs(query(
        collection(db, `usuarios/${uid}/relatorios`), 
        orderBy('data')
      ))

      const checklists = checklistsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      const relatorios = relatoriosSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }))

      // Define os períodos iniciais
      if (checklists.length > 0) {
        setPeriodoInicial(checklists[0].id)
        setPeriodoFinal(checklists[checklists.length - 1].id)
      }

      // Combina os dados
      const combinados = checklists.map(c => {
        const rel = relatorios.find(r => r.id === c.id) || {}
        return {
          data: c.id,
          dieta: c.dieta,
          treino: c.treino,
          agua: c.agua,
          observacao: c.observacao || '',
          nota: rel.nota ?? '-',
          aguaTotal: rel.agua ?? '-',
          extra: rel.treinoExtra ?? false
        }
      })

      setRegistros(combinados)
      setRegistrosFiltrados(combinados)
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    }
  }

  // Aplica filtros de data
  useEffect(() => {
    if (!periodoInicial || !periodoFinal) return

    let filtrados = [...registros]
    
    if (filtroInicio) {
      const dataInicioFormatada = format(new Date(filtroInicio), 'yyyy-MM-dd')
      filtrados = filtrados.filter(r => r.data >= dataInicioFormatada)
    }
    
    if (filtroFim) {
      const dataFimFormatada = format(new Date(filtroFim), 'yyyy-MM-dd')
      filtrados = filtrados.filter(r => r.data <= dataFimFormatada)
    }
    
    setRegistrosFiltrados(filtrados)
  }, [filtroInicio, filtroFim, registros, periodoInicial, periodoFinal])

  // Função para formatar datas com segurança
  const formatarData = (dataString) => {
    if (!dataString) return '--/--/----'
    try {
      return format(new Date(dataString), 'dd/MM/yyyy', { locale: ptBR })
    } catch {
      return '--/--/----'
    }
  }

  const salvarAnotacao = async () => {
    if (!uid) return
    try {
      await setDoc(doc(db, 'usuarios', uid), {
        relatorioGeralObs: anotacao
      }, { merge: true })
      setAnotacaoSalva(anotacao)
      alert('Anotação salva com sucesso ✅')
    } catch (e) {
      alert('Erro ao salvar anotação ❌')
    }
  }

  const totalDias = registrosFiltrados.length
  const totalDieta = registrosFiltrados.filter(r => r.dieta).length
  const totalTreino = registrosFiltrados.filter(r => r.treino).length
  const totalAgua = registrosFiltrados.filter(r => r.agua).length
  const totalNotas = registrosFiltrados.filter(r => r.nota !== '-' && !isNaN(r.nota)).map(r => Number(r.nota))
  const mediaNota = totalNotas.length > 0 ? (totalNotas.reduce((a, b) => a + b, 0) / totalNotas.length).toFixed(1) : '-'
  const dias100 = registrosFiltrados.filter(r => r.dieta && r.treino && r.agua).length

  const pieData = (valor, label, color) => {
    const faltaLabel = label === 'Dieta' ? 'Furou' : label === 'Água' ? 'Não bebeu' : 'Faltou'
    return {
      labels: [label, faltaLabel],
      datasets: [
        {
          data: [valor, totalDias - valor],
          backgroundColor: [color, '#e5e7eb'],
          borderWidth: 1,
          borderColor: '#fff'
        }
      ]
    }
  }

  const imprimir = () => {
    // Força o redesenho dos gráficos antes de imprimir
    setTimeout(() => {
      window.print()
    }, 200)
  }

  const limparFiltros = () => {
    setFiltroInicio('')
    setFiltroFim('')
  }

  if (acessoNegado) {
    return (
      <div className="text-center text-red-600 font-bold text-xl mt-10">
        ❌ Acesso negado. Você não tem permissão para visualizar este relatório.
      </div>
    )
  }

  return (
    <div className="p-4 max-w-5xl mx-auto print:p-0 print:max-w-full">
      {/* Cabeçalho */}
      <div className="flex justify-between items-center mb-6 print:block print:mb-4">
        <h1 className="text-2xl font-bold print:text-xl">Relatório Geral de {nome}</h1>
        
        {/* Período na impressão */}
        <div className="hidden print:block print:mt-2">
          <p className="text-sm text-gray-600">
            {formatarData(filtroInicio || periodoInicial)} até {formatarData(filtroFim || periodoFinal)}
          </p>
        </div>

        {/* Botões (não aparecem na impressão) */}
        <div className="flex gap-2 print:hidden">
          <button
            onClick={() => router.push('/admin')}
            className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
          >
            🔙 Voltar
          </button>
          <button
            onClick={imprimir}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            🖨️ Imprimir PDF
          </button>
        </div>
      </div>

      {/* Filtros (não aparecem na impressão) */}
      <div className="bg-gray-100 p-4 rounded-lg mb-6 print:hidden">
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-sm font-medium mb-1">Data Início</label>
            <input
              type="date"
              className="p-2 border rounded"
              value={filtroInicio}
              onChange={(e) => setFiltroInicio(e.target.value)}
              max={filtroFim || periodoFinal || ''}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Data Fim</label>
            <input
              type="date"
              className="p-2 border rounded"
              value={filtroFim}
              onChange={(e) => setFiltroFim(e.target.value)}
              min={filtroInicio || periodoInicial || ''}
              max={periodoFinal || ''}
            />
          </div>
          <button
            onClick={limparFiltros}
            className="bg-gray-300 px-4 py-2 rounded hover:bg-gray-400"
          >
            Limpar Filtros
          </button>
        </div>
      </div>

      {/* Período (só aparece na tela) */}
      <p className="text-sm text-gray-600 mb-4 print:hidden">
        📅 Período: {formatarData(filtroInicio || periodoInicial)} até {formatarData(filtroFim || periodoFinal)}
      </p>

      {/* Tabela de registros */}
      <div className="overflow-x-auto print:overflow-visible">
        <table className="w-full text-sm border border-gray-300 print:text-xs">
          <thead>
            <tr className="bg-gray-100">
              <th className="border p-2">Data</th>
              <th className="border p-2">Dieta</th>
              <th className="border p-2">Treino</th>
              <th className="border p-2">Água</th>
              <th className="border p-2">Nota</th>
              <th className="border p-2">Água Total</th>
              <th className="border p-2">Extra</th>
              <th className="border p-2">Observação</th>
            </tr>
          </thead>
          <tbody>
            {registrosFiltrados.map((r, i) => (
              <tr key={i} className="hover:bg-gray-50">
                <td className="border p-2">{formatarData(r.data)}</td>
                <td className="border p-2 text-center">{r.dieta ? '✅' : '❌'}</td>
                <td className="border p-2 text-center">{r.treino ? '✅' : '❌'}</td>
                <td className="border p-2 text-center">{r.agua ? '✅' : '❌'}</td>
                <td className="border p-2 text-center">{r.nota}</td>
                <td className="border p-2 text-center">{r.aguaTotal}</td>
                <td className="border p-2 text-center">{r.extra ? '✅' : '❌'}</td>
                <td className="border p-2 text-left">{r.observacao}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Gráficos - VERSÃO CORRIGIDA PARA IMPRESSÃO */}
      <div className="graficos-container mt-8 grid grid-cols-1 md:grid-cols-3 gap-6 print:grid-cols-3 print:gap-4 print:mt-6">
        {[{
          titulo: 'Dieta', valor: totalDieta, cor: '#34d399', falta: 'Furou'
        }, {
          titulo: 'Treino', valor: totalTreino, cor: '#f97316', falta: 'Faltou'
        }, {
          titulo: 'Água', valor: totalAgua, cor: '#60a5fa', falta: 'Não bebeu'
        }].map(({ titulo, valor, cor, falta }) => (
          <div key={titulo} className="grafico-item flex flex-col items-center p-4 print:p-2 bg-white rounded-lg shadow-sm print:shadow-none print:border print:border-gray-200">
            <h3 className="font-semibold text-sm mb-3 print:text-xs print:mb-2">{titulo}</h3>
            <div className="w-full h-[150px] print:h-[120px] flex justify-center">
              <Pie 
                data={pieData(valor, titulo, cor)} 
                options={{
                  responsive: true,
                  maintainAspectRatio: true,
                  animation: {
                    animateScale: true,
                    animateRotate: true
                  },
                  plugins: {
                    legend: { display: false },
                    tooltip: { enabled: false }
                  }
                }}
              />
            </div>
            <div className="mt-4 print:mt-2 text-sm print:text-xs text-center">
              <div className="flex items-center justify-center gap-2 mb-1 print:gap-1">
                <span className="w-3 h-3 inline-block rounded-sm" style={{ backgroundColor: cor }}></span>
                <span>{titulo} {valor}</span>
              </div>
              <div className="flex items-center justify-center gap-2 print:gap-1">
                <span className="w-3 h-3 inline-block rounded-sm" style={{ backgroundColor: '#e5e7eb' }}></span>
                <span>{falta} {totalDias - valor}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Estatísticas */}
      <div className="mt-8 text-center text-sm text-gray-700 print:mt-6 print:text-xs">
        <p className="mb-2">✅ Dias 100% (Dieta + Treino + Água): <strong>{dias100}</strong></p>
        <p>📊 Nota média: <strong>{mediaNota}</strong></p>
      </div>

      {/* Área de anotações */}
      <div className="mt-12 border-t pt-6 print:mt-8 print:pt-4">
        <h2 className="text-lg font-semibold mb-2 print:text-base">🖊️ Assinatura / Observações</h2>
        <textarea
          value={anotacao}
          onChange={(e) => setAnotacao(e.target.value)}
          className="w-full h-32 border rounded p-2 mb-2 print:h-24"
          placeholder="Espaço reservado para anotações finais, conclusões ou assinatura..."
        />
        <button
          onClick={salvarAnotacao}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 print:hidden"
        >
          💾 Salvar Anotação
        </button>

        {anotacaoSalva && (
          <div className="mt-4 text-left text-sm text-gray-600 whitespace-pre-line print:text-xs">
            <h4 className="font-semibold mb-1">📝 Anotação salva:</h4>
            <p>{anotacaoSalva}</p>
          </div>
        )}
      </div>
    </div>
  )
}