// adminPage.jsx
import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { getAuth } from 'firebase/auth'
import {
  collection,
  getDocs,
  getFirestore,
  query,
  orderBy,
  addDoc,
  serverTimestamp,
  doc
} from 'firebase/firestore'
import { app } from '../firebase'
import { format, addDays, subDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default function AdminPage() {
  const auth = getAuth(app)
  const db = getFirestore(app)
  const router = useRouter()

  const [usuarios, setUsuarios] = useState([])
  const [acessoNegado, setAcessoNegado] = useState(false)
  const [dataAtual, setDataAtual] = useState(new Date())
  const [alertas, setAlertas] = useState({
    semDietaDias: [],
    semAguaDias: [],
    semTreinoDias: [],
    notaBaixaSeq: [],
    inativos7Dias: [],
  })
  const [usuariosMensagensEnviadas, setUsuariosMensagensEnviadas] = useState({})
  const [cacheDiario, setCacheDiario] = useState({})

  const UID_DO_ADMIN = 'GGT2USGNN2QbzhaTaXTlhHZVro12'
  const dataTitulo = format(dataAtual, "EEEE, dd 'de' MMMM", { locale: ptBR })

  const getPrimeiroNome = (nomeCompleto) => nomeCompleto?.split(' ')[0] || ''

  const mensagensAutomatizadas = (primeiroNome, tipo) => {
    const mensagens = {
      dieta: [
        `Oi ${primeiroNome}! Vi que você não tem registrado a dieta nos últimos dias. Está precisando de ajuda ou está tudo corrido por aí?`,
        `👀 Sumido(a) nos registros da dieta, hein ${primeiroNome}? Bora retomar!`,
        `Tá tudo bem com a alimentação, ${primeiroNome}? Me chama se precisar!`,
        `Você sabe o quanto a constância faz diferença, ${primeiroNome}. Vamos com tudo hoje?`,
        `Ei ${primeiroNome}, não registrar a dieta pode ser sinal de que algo te atrapalhou. Vamos conversar?`
      ],
      agua: [
        `💧 ${primeiroNome}, lembra de beber água! Estou aqui pra te lembrar disso!`,
        `Alerta de deserto detectado! 😅 Não esquece de beber água, ${primeiroNome}.`,
        `Vi que você está há alguns dias sem registrar água. Que tal fazer o desafio dos 2 litros hoje, ${primeiroNome}?`,
        `Seu corpo agradece cada gole, ${primeiroNome}. Vamos melhorar isso hoje? 🚰`,
        `Oi ${primeiroNome}! Só passando pra lembrar que sua hidratação importa — e muito!`
      ],
      treino: [
        `Tudo certo por aí, ${primeiroNome}? Vi que você não treinou nos últimos dias. Posso ajudar com algo?`,
        `🏋️‍♀️ Treino faz parte do plano! Mesmo que rápido, tenta colocar um movimento no dia de hoje, ${primeiroNome}!`,
        `Às vezes a falta de treino vem do desânimo. Fala comigo se estiver precisando de uma forcinha, ${primeiroNome}!`,
        `Treino parado = resultado travado. Volta com tudo hoje, ${primeiroNome}? 💪`,
        `Ei ${primeiroNome}, bora colocar o corpo em movimento! Um pouco já é melhor que nada.`
      ],
      nota: [
        `Percebi que suas notas estão baixas nos últimos dias, ${primeiroNome}... está tudo bem mesmo?`,
        `Oi ${primeiroNome}, você anda desanimado(a)? Me chama pra conversar se quiser, estou aqui.`,
        `As notas baixas podem mostrar que algo está te atrapalhando. Vamos tentar entender juntos, ${primeiroNome}?`,
        `Quando precisar, me chama. Às vezes desabafar já ajuda a destravar, ${primeiroNome}!`,
        `Você não está sozinho(a), ${primeiroNome}. Estou aqui pra te apoiar em qualquer fase.`
      ],
      inativo: [
        `Sumido(a) do app, hein ${primeiroNome}? 😅 Está tudo certo por aí? Bora retomar!`,
        `A constância é o que gera resultado. Ainda dá tempo de voltar com tudo, ${primeiroNome}!`,
        `Oi ${primeiroNome}, senti sua falta por aqui! Me fala se algo aconteceu, posso ajudar.`,
        `7 dias sem registros é bastante, ${primeiroNome}... vamos dar um restart juntos?`,
        `Você não precisa fazer perfeito, ${primeiroNome}, só precisa continuar. Hoje é um bom dia pra recomeçar.`
      ]
    }
    const grupo = mensagens[tipo] || []
    const index = Math.floor(Math.random() * grupo.length)
    return grupo[index]
  }

  const enviarMensagemAutomatica = async (uid, nome, tipo) => {
    const primeiroNome = getPrimeiroNome(nome)
    const texto = mensagensAutomatizadas(primeiroNome, tipo)

    try {
      await addDoc(collection(db, `mensagens/${UID_DO_ADMIN}_${uid}/mensagens`), {
        de: UID_DO_ADMIN,
        texto,
        timestamp: serverTimestamp()
      })
      setUsuariosMensagensEnviadas(prev => ({ ...prev, [uid]: true }))
      return true
    } catch (error) {
      console.error("Erro ao enviar mensagem automática:", error)
      return false
    }
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

    if (totalEnviadas > 0) {
      alert(`✅ ${totalEnviadas} mensagens enviadas com sucesso!`)
    } else {
      alert('⚠️ Nenhum paciente estava em alerta hoje.')
    }
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

      // Lógica dos alertas
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

      <div className="flex justify-between mb-4 gap-4">
        <button className="bg-gray-300 px-4 py-2 rounded hover:bg-gray-400" onClick={() => mudarDia('anterior')}>Dia Anterior</button>
        <button className="bg-gray-300 px-4 py-2 rounded hover:bg-gray-400" onClick={() => mudarDia('proximo')}>Próximo Dia</button>
        <button className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 ml-auto" onClick={enviarMensagensTodosAlertas}>📤 Enviar mensagens automáticas</button>
      </div>

      <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-6 rounded">
        <p className="font-semibold mb-2">🚨 Alertas de Atenção:</p>
        {[
          { titulo: '👤 Pacientes com 3+ dias sem marcar dieta', lista: alertas.semDietaDias, tipo: 'dieta' },
          { titulo: '💧 Sem registro de água por 3+ dias', lista: alertas.semAguaDias, tipo: 'agua' },
          { titulo: '🏋️ Sem treino por 5+ dias', lista: alertas.semTreinoDias, tipo: 'treino' },
          { titulo: '🛑 Nota abaixo de 7 por 2 dias seguidos', lista: alertas.notaBaixaSeq, tipo: 'nota' },
          { titulo: '🔕 Sem registrar nada há mais de 7 dias', lista: alertas.inativos7Dias, tipo: 'inativo' },
        ].map((item, idx) => (
          <details key={idx} className="mb-2">
            <summary className="cursor-pointer font-medium">
              {item.titulo}: {item.lista.length}
            </summary>
            <ul className="ml-5 list-disc text-sm mt-1">
              {item.lista.map((user, i) => (
                <li key={i} className="flex justify-between items-center">
                  <span>{user.nome}</span>
                  {usuariosMensagensEnviadas[user.uid] ? (
                    <span className="text-green-600 text-xs ml-2">✅ Enviada</span>
                  ) : (
                    <button
                      onClick={() => enviarMensagemAutomatica(user.uid, user.nome, item.tipo)}
                      className="text-blue-600 text-xs ml-2 underline"
                    >
                      📤 Enviar mensagem
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </details>
        ))}
      </div>

      <div className="space-y-4">
        {usuarios.map((user, idx) => (
          <div key={idx} className="border rounded p-3 bg-white shadow-sm">
            <div className="font-semibold mb-1 flex justify-between items-center">
              {user.nome}
              <button
                className="ml-2 text-sm text-blue-600 underline hover:text-blue-800"
                onClick={() => router.push(`/relatorio-geral/${usuario.uid}`)}
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
