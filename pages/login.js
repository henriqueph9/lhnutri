import { useState } from 'react';
import { useRouter } from 'next/router';
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setErro('');

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, senha);
      const user = userCredential.user;

      if (user.uid === 'GGT2USGNN2QbzhaTaXTlhHZVro12') {
        router.push('/admin');
      } else {
        router.push('/dashboard');
      }
    } catch (error) {
      console.error(error);
      setErro('E-mail ou senha inválidos.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <form onSubmit={handleLogin} className="bg-white p-8 rounded-lg shadow-md w-full max-w-sm">
        <div className="text-center mb-6">
          <img src="/icons/icon-192.png" alt="Logo LH Nutri" className="mx-auto w-12" />
          <h1 className="text-2xl font-bold text-green-700 mt-2">LH Nutri</h1>
          <p className="text-sm text-gray-500">Comece seu acompanhamento com o Nutri Luiz Henrique</p>
        </div>

        {erro && <p className="text-red-500 text-sm mb-3 text-center">{erro}</p>}

        <input
          type="email"
          placeholder="E-mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full mb-4 p-3 border rounded-lg"
          required
        />

        <input
          type="password"
          placeholder="Senha"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          className="w-full mb-4 p-3 border rounded-lg"
          required
        />

        <button
          type="submit"
          className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition"
        >
          Entrar
        </button>

        <p className="mt-4 text-sm text-center text-gray-600">
          Ainda não tem conta?{' '}
          <a href="/register" className="text-green-700 underline">Cadastrar</a>
        </p>
      </form>
    </div>
  );
}
