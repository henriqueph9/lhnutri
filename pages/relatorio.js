import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import {
  getFirestore,
  doc,
  setDoc,
  Timestamp
} from 'firebase/firestore'
import app from '../firebase'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default function Relatorio() {
  const [nota, setNota] = useState('')
  const [agua, setAgua] = useState('')
  const [treinoExtra, setTreinoExtra] = useState(false)
  const [userId, setUserId] = useState('')
  const [dataAtual, setDataAtual] = useState(new Date())
  const [enviado, setEnviado] = useState(false)
  const router = useRouter()
  const auth = getAuth(app)
  const db = getFirestore(app)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserId(user.uid)
      } else {
        router.push('/login')
      }
    })
    return () => unsubscribe()
  }, [])

  const enviar = async () => {
    if (!userId || !nota || !agua) return alert('Preencha todos os campos')

    const dataFormatada = format(dataAtual, 'yyyy-MM-dd')
    const ref = doc(db, `usuarios/${userId}/relatorios/${dataFormatada}`)

    await setDoc(ref, {
      nota,
      agua,
      treinoExtra,
      data: Timestamp.fromDate(dataAtual),
      enviadoEm: Timestamp.fromDate(dataAtual)
    })

    setEnviado(true)
    setTimeout(() => {
      setEnviado(false)
      router.push('/dashboard')
    }, 2000)
  }

  return (
    <div className="min-h-screen bg-[#f9f9f9] p-4">
      <div className="max-w-md mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-gray-800 text-center">
          Relatório da Noite
        </h1>

        <label className="block">
          <span className="text-gray-700">📝 Nota de 0 a 10</span>
          <input
            type="number"
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            min="0"
            max="10"
            className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
          />
        </label>

        <label className="block">
          <span className="text-gray-700">💧 Quantidade de água (ex: 2 litros)</span>
          <input
            type="text"
            value={agua}
            onChange={(e) => setAgua(e.target.value)}
            className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
          />
        </label>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={treinoExtra}
            onChange={(e) => setTreinoExtra(e.target.checked)}
            className="h-5 w-5 text-[#12736C] border-gray-300 rounded"
          />
          <span className="text-gray-700">🏋️ Treino extra hoje?</span>
        </label>

        <button
          onClick={enviar}
          className={`w-full py-3 rounded-xl font-semibold transition ${
            enviado ? 'bg-gray-400 text-white' : 'bg-[#12736C] text-white'
          }`}
        >
          {enviado ? '✔️ Enviado com sucesso' : 'ENVIAR RELATÓRIO'}
        </button>
      </div>
    </div>
  )
}
