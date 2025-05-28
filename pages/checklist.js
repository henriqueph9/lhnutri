import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import {
  getFirestore,
  doc,
  setDoc,
  Timestamp,
  collection,
  getDocs,
  query
} from 'firebase/firestore'
import app from '../firebase'
import { format, addDays, subDays, isToday, getHours } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default function Checklist() {
  const [status, setStatus] = useState({ dieta: null, treino: null, agua: null })
  const [observacao, setObservacao] = useState('')
  const [enviado, setEnviado] = useState(false)
  const [userId, setUserId] = useState('')
  const [dataAtual, setDataAtual] = useState(new Date())
  const [feedback, setFeedback] = useState('')
  const router = useRouter()
  const auth = getAuth(app)
  const db = getFirestore(app)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUserId(user.uid)
        buscarChecklists(user.uid)
      } else {
        router.push('/login')
      }
    })
    return () => unsubscribe()
  }, [])

  const marcar = (campo, valor) => {
    setStatus((prev) => ({ ...prev, [campo]: valor }))
  }

  const gerarFeedback = () => {
    const frases = []
    if (status.dieta) frases.push('👏 Mandou bem na dieta!')
    else frases.push('⚠️ Foco na alimentação amanhã!')

    if (status.treino) frases.push('🏋️ Ótimo treino!')
    else frases.push('🚨 Que tal um treino leve amanhã?')

    if (status.agua) frases.push('💧 Boa hidratação!')
    else frases.push('🧃 Lembre-se de beber mais água!')

    return frases.join(' ')
  }

  const verificarConquistas = (docs) => {
    let contagem = { dieta: 0, treino: 0, agua: 0 }
    docs.forEach((doc) => {
      const d = doc.data()
      if (d.dieta) contagem.dieta++
      if (d.treino) contagem.treino++
      if (d.agua) contagem.agua++
    })

    const conquistas = []
    if (contagem.dieta >= 3) conquistas.push('🥗 Dieta 3 dias!')
    if (contagem.dieta >= 5) conquistas.push('🏅 5 dias de dieta na semana!')
    if (contagem.dieta === 7) conquistas.push('🎯 Dieta completa da semana!')

    if (contagem.treino >= 3) conquistas.push('🏋️ 3 treinos realizados!')
    if (contagem.treino >= 5) conquistas.push('🥇 5 treinos! Você é exemplo!')
    if (contagem.treino === 7) conquistas.push('🔥 Treinou os 7 dias! Monstro!')

    if (contagem.agua >= 5) conquistas.push('💧 Hidratou bem esta semana!')
    if (contagem.agua === 7) conquistas.push('🌊 Água nota 100%!')

    return conquistas
  }

  const buscarChecklists = async (uid) => {
    const hoje = new Date()
    const inicioSemana = new Date(hoje.setDate(hoje.getDate() - hoje.getDay() + 1))
    const fimSemana = new Date(inicioSemana)
    fimSemana.setDate(inicioSemana.getDate() + 6)

    const ref = collection(db, `usuarios/${uid}/checklists`)
    const snap = await getDocs(query(ref))

    const docsDaSemana = snap.docs.filter(doc => {
      const data = doc.data().data?.toDate?.()
      return data >= inicioSemana && data <= fimSemana
    })

    const conquistas = verificarConquistas(docsDaSemana)
    if (conquistas.length > 0) {
      setFeedback(conquistas.join(' '))
    }
  }

  const enviar = async () => {
    if (!userId) return alert('Você precisa estar logado.')

    const dataFormatada = format(dataAtual, 'yyyy-MM-dd')
    const ref = doc(db, `usuarios/${userId}/checklists/${dataFormatada}`)

    await setDoc(ref, {
      ...status,
      observacao,
      data: Timestamp.fromDate(dataAtual),
    })

    setFeedback(gerarFeedback())
    setEnviado(true)

    setTimeout(() => {
      setFeedback('')
      setEnviado(false)
    }, 5000)
  }

  const mudarDia = (direcao) => {
    setDataAtual((prev) =>
      direcao === 'anterior' ? subDays(prev, 1) : addDays(prev, 1)
    )
    setStatus({ dieta: null, treino: null, agua: null })
    setObservacao('')
    setEnviado(false)
    setFeedback('')
  }

  const dataFormatada = format(dataAtual, "EEEE, dd 'de' MMMM", { locale: ptBR })
  const mostrarLembrete21h = isToday(dataAtual) && getHours(new Date()) >= 21 && !enviado

  return (
    <div className="min-h-screen bg-[#f9f9f9] p-4">
      <div className="max-w-md mx-auto space-y-6">
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={() => router.push('/dashboard')}
            className="text-sm text-gray-600 hover:underline"
          >
            ← Voltar
          </button>
          <h1 className="text-lg font-bold text-gray-800 text-center w-full -ml-8">
            {dataFormatada}
          </h1>
        </div>

        {mostrarLembrete21h && (
          <div className="bg-yellow-100 border-l-4 border-yellow-500 p-3 text-sm text-yellow-800 rounded-xl">
            ⚠️ Lembre-se de preencher seu relatório antes de dormir!
          </div>
        )}

        {['dieta', 'treino', 'agua'].map((item) => (
          <div
            key={item}
            className="flex items-center justify-between bg-white p-4 rounded-2xl shadow"
          >
            <span className="capitalize text-gray-800 font-medium">{item}</span>
            <div className="flex gap-2">
              <button
                onClick={() => marcar(item, true)}
                className={`w-10 h-10 rounded-full border text-xl ${
                  status[item] === true ? 'bg-green-600 text-white' : 'border-gray-300'
                }`}
              >
                ✔️
              </button>
              <button
                onClick={() => marcar(item, false)}
                className={`w-10 h-10 rounded-full border text-xl ${
                  status[item] === false ? 'bg-red-500 text-white' : 'border-gray-300'
                }`}
              >
                ❌
              </button>
            </div>
          </div>
        ))}

        <textarea
          placeholder="Observação do dia"
          className="w-full p-3 border border-gray-300 rounded-xl"
          rows={3}
          value={observacao}
          onChange={(e) => setObservacao(e.target.value)}
        />

        <button
          onClick={enviar}
          className={`w-full py-3 rounded-xl font-semibold transition ${
            enviado ? 'bg-gray-400 text-white' : 'bg-[#12736C] text-white'
          }`}
        >
          {enviado ? '✔️ Enviado com sucesso' : 'ENVIAR'}
        </button>

        {feedback && (
          <div className="bg-green-100 border-l-4 border-green-500 p-3 text-sm text-green-800 rounded-xl mt-2">
            {feedback}
          </div>
        )}

        <div className="flex justify-between mt-4">
          <button
            onClick={() => mudarDia('anterior')}
            className="px-4 py-2 bg-gray-200 rounded-xl font-medium text-gray-800 hover:bg-gray-300"
          >
            ← Anterior
          </button>
          <button
            onClick={() => mudarDia('proximo')}
            className="px-4 py-2 bg-gray-200 rounded-xl font-medium text-gray-800 hover:bg-gray-300"
          >
            Próximo →
          </button>
        </div>
      </div>
    </div>
  )
}
