import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { getAuth, onAuthStateChanged, signOut } from 'firebase/auth'
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  getDoc,
  query,
  where,
  Timestamp,
  setDoc
} from 'firebase/firestore'
import { getToken, onMessage } from 'firebase/messaging'
import app from '../firebase'
import {
  ClipboardList,
  FileText,
  LineChart,
  Utensils,
  Dumbbell,
  Droplet
} from 'lucide-react'
import { format, startOfWeek, endOfWeek } from 'date-fns'

export default function Dashboard() {
  const [nome, setNome] = useState('')
  const [motivacao, setMotivacao] = useState('')
  const [progresso, setProgresso] = useState({ dieta: 0, treino: 0, agua: 0 })
  const [relatorios, setRelatorios] = useState([])
  const [userId, setUserId] = useState('')
  const [checklistHoje, setChecklistHoje] = useState(null)
  const router = useRouter()
  const auth = getAuth(app)
  const db = getFirestore(app)

  const frases = [
    'Cada dia é uma nova chance de vencer! 💪',
    'Consistência supera motivação!',
    'Vamos com tudo hoje? Estou com você! 🚀',
    'Seu esforço está valendo a pena!',
    'Disciplina é fazer mesmo sem vontade.',
    'Corpo saudável, mente blindada! 🧠'
  ]

  function capitalizarNome(str) {
    return str.replace(/\b\w/g, (c) => c.toUpperCase())
  }

  useEffect(() => {
    console.log("DASHBOARD MONTADO");

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        console.log("Usuário autenticado:", user.uid);
        setUserId(user.uid);

        const docRef = doc(db, 'usuarios', user.uid);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data();
          setNome(data.nome ? capitalizarNome(data.nome) : 'Paciente');
        } else {
          setNome('Paciente');
        }

        setMotivacao(frases[Math.floor(Math.random() * frases.length)]);
        buscarChecklists(user.uid);
        buscarChecklistHoje(user.uid);
        buscarRelatorioHoje(user.uid);

        try {
          console.log("Solicitando permissão de notificação...");
          const permission = await Notification.requestPermission();

          if (permission === 'granted') {
            console.log("Permissão concedida. Buscando token...");

            const messaging = (await import('firebase/messaging')).getMessaging(app);
            const token = await getToken(messaging, {
  vapidKey: "BPIekm6BIpTodXBSD2t0a-vXJYnS4LKCvz6QHDqOC-yEk_ifbpTaYTmALJqpQpB9DoaivxLaNenKhXGI7d0W9F0",
  serviceWorkerRegistration: await navigator.serviceWorker.ready
});
            if (token) {
              console.log("Token salvo:", token);
              await setDoc(doc(db, 'tokens', user.uid), {
                token,
                uid: user.uid,
                email: user.email || null,
                nome: snap.data()?.nome || '',
                createdAt: new Date()
              });
            } else {
              console.warn("Token não foi gerado.");
            }

            onMessage(messaging, (payload) => {
              const { title, body } = payload.notification;
              alert(`${title}\n${body}`);
            });
          } else {
            console.warn("Permissão de notificação negada.");
          }
        } catch (err) {
          console.error("Erro ao configurar notificações:", err);
        }
      } else {
        router.push('/login');
      }
    });

    return () => unsubscribe();
  }, []);

  const buscarChecklistHoje = async (uid) => {
    const hoje = new Date();
    const dataFormatada = format(hoje, 'yyyy-MM-dd');
    const ref = doc(db, `usuarios/${uid}/checklists/${dataFormatada}`);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      setChecklistHoje(snap.data());
    }
  };

  const buscarChecklists = async (uid) => {
    const hoje = new Date();
    const inicioSemana = startOfWeek(hoje, { weekStartsOn: 1 });
    const fimSemana = endOfWeek(hoje, { weekStartsOn: 1 });

    const checkRef = collection(db, `usuarios/${uid}/checklists`);
    const snap = await getDocs(
      query(
        checkRef,
        where('data', '>=', Timestamp.fromDate(inicioSemana)),
        where('data', '<=', Timestamp.fromDate(fimSemana))
      )
    );

    let dieta = 0,
      treino = 0,
      agua = 0;
    snap.forEach((doc) => {
      const d = doc.data();
      if (d.dieta) dieta++;
      if (d.treino) treino++;
      if (d.agua) agua++;
    });

    setProgresso({ dieta, treino, agua });
  };

  const buscarRelatorioHoje = async (uid) => {
    const hoje = new Date();
    const inicioSemana = startOfWeek(hoje, { weekStartsOn: 1 });
    const fimSemana = endOfWeek(hoje, { weekStartsOn: 1 });

    const ref = collection(db, `usuarios/${uid}/relatorios`);
    const snap = await getDocs(
      query(
        ref,
        where('enviadoEm', '>=', Timestamp.fromDate(inicioSemana)),
        where('enviadoEm', '<=', Timestamp.fromDate(fimSemana))
      )
    );

    const hojeFormatado = format(hoje, 'dd/MM');
    const lista = [];

    snap.forEach((doc) => {
      const dados = doc.data();
      const data = format(dados.enviadoEm.toDate(), 'dd/MM');
      if (data === hojeFormatado) {
        lista.push({
          data,
          nota: dados.nota,
          agua: dados.agua,
          treinoExtra: dados.treinoExtra
        });
      }
    });
    setRelatorios(lista);
  };

  const sair = async () => {
    await signOut(auth);
    router.push('/login');
  };

  const Card = ({ icon: Icon, title, description, onClick }) => (
    <div
      onClick={onClick}
      className="flex items-center gap-4 bg-white p-4 rounded-2xl shadow hover:shadow-md transition cursor-pointer"
    >
      <div className="bg-[#E6F5F2] p-2 rounded-xl">
        <Icon size={20} className="text-[#12736C]" />
      </div>
      <div className="flex flex-col text-left">
        <p className="font-medium text-gray-800">{title}</p>
        {description && <p className="text-sm text-gray-500">{description}</p>}
      </div>
    </div>
  );

  return (
    <main className="p-6">
      <div className="w-full max-w-md mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-bold">Olá, {nome} 👋</h1>
          <button onClick={sair} className="text-red-500 hover:underline text-sm">Sair</button>
        </div>

        <p className="text-sm text-gray-500">{motivacao}</p>

        <div className="space-y-2">
          <Progress title="Dieta" value={progresso.dieta} />
          <Progress title="Treino" value={progresso.treino} />
          <Progress title="Água" value={progresso.agua} />
        </div>

        <div className="space-y-4">
          <Card icon={ClipboardList} title="Checklist Diário" description="Dieta · Treino · Água" onClick={() => router.push('/checklist')} />
          <Card icon={FileText} title="Relatório da Noite" description="Preencher às 21:00" onClick={() => router.push('/relatorio')} />
          <Card icon={LineChart} title="Evolução" onClick={() => router.push('/evolucao')} />
        </div>

        {checklistHoje && (
          <div className="bg-white rounded-xl shadow p-4 space-y-2 border border-gray-100">
            <div className="flex justify-between items-center text-sm text-gray-600 font-medium">
              <span>🗓️ {format(new Date(), 'dd/MM')}</span>
              <span className="text-gray-400">Registro do Dia</span>
            </div>
            <div className="flex flex-wrap gap-4 text-sm font-medium text-gray-800">
              <div>Dieta: <span className={checklistHoje.dieta ? 'text-green-600' : 'text-red-500'}>{checklistHoje.dieta ? '✔' : '✘'}</span></div>
              <div>Treino: <span className={checklistHoje.treino ? 'text-green-600' : 'text-red-500'}>{checklistHoje.treino ? '✔' : '✘'}</span></div>
              <div>Água: <span className={checklistHoje.agua ? 'text-green-600' : 'text-red-500'}>{checklistHoje.agua ? '✔' : '✘'}</span></div>
            </div>
            {checklistHoje.observacao && (
              <div className="pt-2 border-t border-dashed text-sm text-gray-500">
                <span className="font-semibold text-gray-600">Observação:</span> {checklistHoje.observacao}
              </div>
            )}
          </div>
        )}

        {relatorios.map((rel, index) => (
          <div key={index} className="bg-white rounded-xl shadow p-4 space-y-2 border border-gray-100 mb-4">
            <div className="flex justify-between items-center text-sm text-gray-600 font-medium">
              <span>🗓️ {rel.data}</span>
              <span className="text-gray-400">Relatório da Noite</span>
            </div>
            <div className="flex flex-wrap gap-4 text-sm font-medium text-gray-800">
              <div>Nota: {rel.nota}</div>
              <div>Água: {rel.agua} litros</div>
              <div>Treino extra: {rel.treinoExtra ? '✔' : '✘'}</div>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}

function Progress({ title, value }) {
  const cor =
    title === 'Dieta'
      ? 'bg-green-600'
      : title === 'Treino'
      ? 'bg-orange-400'
      : title === 'Água'
      ? 'bg-blue-500'
      : 'bg-gray-400';

  const Icon =
    title === 'Dieta'
      ? Utensils
      : title === 'Treino'
      ? Dumbbell
      : title === 'Água'
      ? Droplet
      : null;

  const corFundo =
    title === 'Dieta'
      ? 'bg-green-100 text-green-600'
      : title === 'Treino'
      ? 'bg-orange-100 text-orange-500'
      : title === 'Água'
      ? 'bg-blue-100 text-blue-600'
      : 'bg-gray-100 text-gray-600';

  return (
    <div className="bg-white p-3 rounded-xl shadow-sm">
      <div className="flex justify-between items-center mb-1">
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-full ${corFundo}`}>
            {Icon && <Icon size={16} />}
          </div>
          <span className="text-sm font-semibold text-gray-700">
            {title} ({value}/7)
          </span>
        </div>
        <span className="text-sm text-gray-500 font-medium">
          {String(value).padStart(2, '0')}
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
        <div
          className={`h-2 ${cor} rounded-full transition-all duration-500 ease-in-out`}
          style={{ width: `${(value / 7) * 100}%` }}
        />
      </div>
    </div>
  );
}
