// register.js com correção definitiva do displayName no Firebase Auth

import { useState } from 'react'
import { useRouter } from 'next/router'
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth'
import { setDoc, doc } from 'firebase/firestore'
import { auth, db } from '../firebase'

export default function Register() {
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const router = useRouter()

  const handleCadastro = async (e) => {
    e.preventDefault()
    setErro('')

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, senha)
      const user = userCredential.user

      // Forçar uso de auth.currentUser para garantir que o nome seja salvo corretamente
      await updateProfile(auth.currentUser, {
        displayName: nome
      })

      await setDoc(doc(db, 'usuarios', user.uid), {
        nome,
        email,
        uid: user.uid
      })

      router.push('/dashboard')
    } catch (error) {
      setErro('Erro ao criar conta. Verifique os dados.')
      console.error(error)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <h1 className="text-2xl font-bold mb-4">Criar Conta</h1>
      <form onSubmit={handleCadastro} className="w-full max-w-sm space-y-4">
        <input
          type="text"
          placeholder="Nome completo"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          required
          className="w-full p-2 border border-gray-300 rounded"
        />
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full p-2 border border-gray-300 rounded"
        />
        <input
          type="password"
          placeholder="Senha"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          required
          className="w-full p-2 border border-gray-300 rounded"
        />
        {erro && <p className="text-red-500 text-sm">{erro}</p>}
        <button
          type="submit"
          className="w-full bg-[#12736C] text-white p-2 rounded hover:bg-[#0f5c57]"
        >
          Cadastrar
        </button>
      </form>
    </div>
  )
}
