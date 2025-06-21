import { collection, addDoc, serverTimestamp, getFirestore } from 'firebase/firestore';
import { app } from '../firebase';

const UID_DO_ADMIN = 'GGT2USGNN2QbzhaTaXTlhHZVro12';

export async function enviarMensagemAutomatica(uid, nome, tipo) {
  const db = getFirestore(app);

  const getPrimeiroNome = (nomeCompleto) => nomeCompleto?.split(' ')[0] || '';

  const mensagens = {
    dieta: ['Bora retomar a dieta?', 'Seu progresso depende da constância! 🍽️'],
    agua: ['Vamos beber mais água hoje? 💧', 'Seu corpo agradece a hidratação!'],
    treino: ['Mexer o corpo é essencial! 🏋️‍♀️', 'Hoje é dia de treino, não se esqueça!'],
    nota: ['O que aconteceu nos últimos dias?', 'Vamos melhorar essa nota juntos!'],
    inativo: ['Saudade dos seus registros! Volta com tudo! 🔁', 'Vamos retomar a rotina! 💪']
  };

  const grupo = mensagens[tipo] || [];
  const index = Math.floor(Math.random() * grupo.length);
  const texto = grupo[index];
  const primeiroNome = getPrimeiroNome(nome);

  try {
    await addDoc(collection(db, `mensagens/${UID_DO_ADMIN}_${uid}/mensagens`), {
      de: UID_DO_ADMIN,
      texto: `${primeiroNome}, ${texto}`,
      timestamp: serverTimestamp()
    });
    return true;
  } catch (error) {
    console.error("Erro ao enviar mensagem automática:", error);
    return false;
  }
}
