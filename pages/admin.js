import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { getAuth } from 'firebase/auth'
import {
  collection,
  getDocs,
  getFirestore,
  query,
  orderBy
} from 'firebase/firestore'
import { app } from '../firebase'
import { format, addDays, subDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { enviarMensagemAutomatica } from '../utils/enviarMensagem'

export default function AdminPage() {
  const auth = getAuth(app)
  const db = getFirestore(app)
  const router = useRouter()

  const [usuarios, setUsuarios] = useState([])
  const [usuariosFiltrados, setUsuariosFiltrados] = useState([])
  const [acessoNegado, setAcessoNegado] = useState(false)
  const [dataAtual, setDataAtual] = useState(new Date())
  const [termoBusca, setTermoBusca] = useState('')
  const [alertas, setAlertas] = useState({
    semDietaDias: [],
    semAguaDias: [],
    semTreinoDias: [],
    notaBaixaSeq: [],
    inativos7Dias: [],
  })

  const UID_DO_ADMIN = 'GGT2USGNN2QbzhaTaXTlhHZVro12'
  const dataTitulo = format(dataAtual, "EEEE, dd 'de' MMMM", { locale: ptBR })

  // Filtra pacientes pelo nome
  useEffect(() => {
    if (termoBusca === '') {
      setUsuariosFiltrados(usuarios)
    } else {
      const filtrados = usuarios.filter(user =>
        user.nome.toLowerCase().includes(termoBusca.toLowerCase())
      )
      setUsuariosFiltrados(filtrados)
    }
  }, [termoBusca, usuarios])

  const abrirRelatorio = (uid) => {
    window.open(`/relatorio-geral/${uid}`, '_blank')
  }

  const enviarMensagensTodosAlertas = async () => {
    const grupos = [
      { lista: alertas.semDietaDias, tipo: 'dieta' },
      { lista: alertas.semAguaDias, tipo: 'agua' },
      { lista: alertas.semTreinoDias, tipo: 'treino' },
      { lista: alertas.notaBaixaSeq, tipo: 'nota' },
      { lista: alertas.inativos7Dias, tipo: 'inativo' }
    ]

    let totalEnviadas = 0

    for (const grupo of grupos) {
      for (const user of grupo.lista) {
        const enviada = await enviarMensagemAutomatica(user.uid, user.nome, grupo.tipo)
        if (enviada) totalEnviadas++
      }
    }

    alert(`✅ ${totalEnviadas} mensagens enviadas com sucesso!`)
  }

  const mudarDia = (direcao) => {
    setDataAtual((prev) =>
      direcao === 'anterior' ? subDays(prev, 1) : addDays(prev, 1)
    )
  }

  const carregarUsuarios = async () => {
    const dataFormatadaAtual = format(dataAtual, 'yyyy-MM-dd')
    const usuariosRef = collection(db, 'usuarios')
    const q = query(usuariosRef, orderBy('nome'))
    const snapshot = await getDocs(q)
    const lista = []

    const novosAlertas = {
      semDietaDias: [],
      semAguaDias: [],
      semTreinoDias: [],
      notaBaixaSeq: [],
      inativos7Dias: []
    }

    for (const docUser of snapshot.docs) {
      const user = { uid: docUser.id, ...docUser.data() }

      const checklistsSnap = await getDocs(query(collection(db, `usuarios/${user.uid}/checklists`), orderBy('data')))
      const relatoriosSnap = await getDocs(query(collection(db, `usuarios/${user.uid}/relatorios`), orderBy('data')))

      const checklists = checklistsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      const relatorios = relatoriosSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }))

      const checklistHoje = checklists.find(d => d.id === dataFormatadaAtual)
      const relatorioHoje = relatorios.find(d => d.id === dataFormatadaAtual)

      user.dietaHoje = checklistHoje?.dieta
      user.treinoHoje = checklistHoje?.treino
      user.aguaHoje = checklistHoje?.agua
      user.comentarioHoje = checklistHoje?.observacao

      user.notaHoje = relatorioHoje?.nota
      user.aguaTotalHoje = relatorioHoje?.agua
      user.extraHoje = relatorioHoje?.treinoExtra

      if (
        user.dietaHoje !== undefined ||
        user.treinoHoje !== undefined ||
        user.aguaHoje !== undefined ||
        user.extraHoje !== undefined ||
        user.notaHoje !== undefined ||
        user.aguaTotalHoje !== undefined ||
        user.comentarioHoje !== undefined
      ) {
        lista.push(user)
      }

      const ultimos7 = checklists.slice(-7)
      const ultimosRel = relatorios.slice(-3)

      if (ultimos7.filter(d => !d.dieta).length >= 3) novosAlertas.semDietaDias.push(user)
      if (ultimos7.filter(d => !d.agua).length >= 3) novosAlertas.semAguaDias.push(user)
      if (ultimos7.filter(d => !d.treino).length >= 5) novosAlertas.semTreinoDias.push(user)

      const notasBaixas = ultimosRel.filter(r => r.nota !== undefined && r.nota < 7)
      if (notasBaixas.length >= 2) novosAlertas.notaBaixaSeq.push(user)

      const ultimoRegistro = checklists[checklists.length - 1]?.id
      if (ultimoRegistro && dataFormatadaAtual > ultimoRegistro) novosAlertas.inativos7Dias.push(user)
    }

    setUsuarios(lista)
    setUsuariosFiltrados(lista)
    setAlertas(novosAlertas)
  }

  useEffect(() => {
    const user = auth.currentUser
    if (!user || user.uid !== UID_DO_ADMIN) {
      setAcessoNegado(true)
    } else {
      setAcessoNegado(false)
      carregarUsuarios()
    }
  }, [dataAtual])

  if (acessoNegado) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-500 text-lg font-semibold">⛔ Acesso negado</p>
      </div>
    )
  }

  return (
    <div className="p-4 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Painel do Administrador</h1>
      <h2 className="text-lg mb-6">{dataTitulo}</h2>

      <div className="flex justify-between mb-4 gap-4 flex-wrap">
        <div className="flex gap-4">
          <button className="bg-gray-300 px-4 py-2 rounded hover:bg-gray-400" onClick={() => mudarDia('anterior')}>Dia Anterior</button>
          <button className="bg-gray-300 px-4 py-2 rounded hover:bg-gray-400" onClick={() => mudarDia('proximo')}>Próximo Dia</button>
        </div>
        <button className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700" onClick={enviarMensagensTodosAlertas}>
          📤 Enviar mensagens automáticas
        </button>
      </div>

      {/* Barra de pesquisa */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="🔍 Pesquisar paciente por nome..."
          className="w-full p-2 border rounded"
          value={termoBusca}
          onChange={(e) => setTermoBusca(e.target.value)}
        />
      </div>

      <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-6 rounded">
        <p className="font-bold mb-2">🚨 Alertas de Atenção:</p>
        <AlertaColapsavel titulo="▶️ Pacientes com 3+ dias sem marcar dieta" lista={alertas.semDietaDias} />
        <AlertaColapsavel titulo="💧 Sem registro de água por 3+ dias" lista={alertas.semAguaDias} />
        <AlertaColapsavel titulo="🏋️‍♂️ Sem treino por 5+ dias" lista={alertas.semTreinoDias} />
        <AlertaColapsavel titulo="🔴 Nota abaixo de 7 por 2 dias seguidos" lista={alertas.notaBaixaSeq} />
        <AlertaColapsavel titulo="⏰ Sem registrar nada há mais de 7 dias" lista={alertas.inativos7Dias} />
      </div>

      <div className="space-y-4">
        {usuariosFiltrados.map((user, idx) => (
          <div key={idx} className="border rounded p-3 bg-white shadow-sm">
            <div className="font-semibold mb-1 flex justify-between items-center">
              {user.nome}
              <button
                onClick={() => abrirRelatorio(user.uid)}
                className="ml-2 text-sm text-blue-600 underline hover:text-blue-800"
              >
                📄 Relatório Geral
              </button>
            </div>
            <div className="flex flex-wrap gap-4 text-sm items-center">
              <div>🥗 Dieta: {user.dietaHoje ? '✅' : '❌'}</div>
              <div>🏋️ Treino: {user.treinoHoje ? '✅' : '❌'}</div>
              <div>💧 Água: {user.aguaHoje ? '✅' : '❌'}</div>
              <div>📋 Nota: {user.notaHoje ?? '-'}</div>
              <div>💦 Água Rel.: {user.aguaTotalHoje ? `${user.aguaTotalHoje} litros` : '-'}</div>
              <div>🏋️ Extra: {user.extraHoje ? '✅' : '❌'}</div>
            </div>
            {user.comentarioHoje && (
              <p className="mt-2 text-gray-700 italic">📝 "{user.comentarioHoje}"</p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function AlertaColapsavel({ titulo, lista }) {
  const [aberto, setAberto] = useState(false)

  return (
    <div className="mb-2 border border-yellow-300 rounded">
      <button
        onClick={() => setAberto(!aberto)}
        className="w-full text-left px-4 py-2 font-semibold bg-yellow-200 rounded-t flex justify-between items-center"
      >
        <span>{titulo}</span>
        <span>{aberto ? '−' : '+'}</span>
      </button>

      {aberto && lista.length > 0 && (
        <ul className="ml-6 mt-2 mb-2 list-disc text-sm">
          {lista.map((p, i) => (
            <li key={i}>{p.nome}</li>
          ))}
        </ul>
      )}
    </div>
  )
}