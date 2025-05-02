export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-sm">
        <h1 className="text-2xl font-bold mb-6 text-center">Acesso LH Nutri</h1>
        <input type="email" placeholder="Email" className="w-full p-2 mb-4 border rounded"/>
        <input type="password" placeholder="Senha" className="w-full p-2 mb-4 border rounded"/>
        <button className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700">Entrar</button>
      </div>
    </div>
  )
}
