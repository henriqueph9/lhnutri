const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { format, subDays } = require("date-fns");

admin.initializeApp();
const db = admin.firestore();

exports.enviarMensagensAutomaticas = functions.pubsub.schedule('0 7 * * *') // 07h todos os dias
  .timeZone('America/Sao_Paulo')
  .onRun(async (context) => {
    const hoje = format(new Date(), 'yyyy-MM-dd');
    const UID_ADMIN = 'GGT2USGNN2QbzhaTaXTlhHZVro12';

    const usuariosSnapshot = await db.collection('usuarios').get();

    for (const doc of usuariosSnapshot.docs) {
      const user = doc.data();
      const uid = user.uid;
      const nome = user.nome || '';
      const primeiroNome = nome.split(' ')[0] || 'Olá';

      const statusDoc = await db.doc(`mensagensStatus/${uid}_${hoje}`).get();
      if (statusDoc.exists) continue; // já enviou hoje

      const checklistSnap = await db.collection(`usuarios/${uid}/checklists`).orderBy('data').get();
      const relatorioSnap = await db.collection(`usuarios/${uid}/relatorios`).orderBy('data').get();

      const checklists = checklistSnap.docs.map(d => d.data());
      const relatorios = relatorioSnap.docs.map(d => d.data());

      const ultimos7 = checklists.slice(-7);
      const ultimosRel = relatorios.slice(-7);

      const dietaFaltas = ultimos7.filter(c => !c.dieta).length;
      const aguaFaltas = ultimos7.filter(c => !c.agua).length;
      const treinoFaltas = ultimos7.filter(c => !c.treino).length;
      const notasBaixas = ultimosRel.filter(r => Number(r.nota) < 7).length;
      const inativo = checklists.length === 0 || (checklists.length > 0 && new Date(checklistSnap.docs.at(-1)?.id) < subDays(new Date(), 7));

      const mensagens = [];

      if (dietaFaltas >= 3) mensagens.push(
        `Oi ${primeiroNome}! Vi que você não tem registrado a dieta nos últimos dias. Está precisando de ajuda ou está tudo corrido por aí?`
      );
      if (aguaFaltas >= 3) mensagens.push(
        `💧 ${primeiroNome}, lembra de beber água! Estou aqui pra te lembrar disso!`
      );
      if (treinoFaltas >= 5) mensagens.push(
        `🏋️‍♂️ Ei ${primeiroNome}, bora colocar o corpo em movimento! Um pouco já é melhor que nada.`
      );
      if (notasBaixas >= 2) mensagens.push(
        `Oi ${primeiroNome}, notei que suas notas têm vindo mais baixas. Quer conversar sobre o que está acontecendo? Posso te ajudar!`
      );
      if (inativo) mensagens.push(
        `⚠️ Sentimos sua falta, ${primeiroNome}! Você está há alguns dias sem registrar no app. Se algo aconteceu, estou aqui pra ajudar.`
      );

      for (const texto of mensagens) {
        await db.collection(`mensagens/${UID_ADMIN}_${uid}/mensagens`).add({
          de: UID_ADMIN,
          texto,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });
      }

      if (mensagens.length > 0) {
        await db.doc(`mensagensStatus/${uid}_${hoje}`).set({ enviado: true });
      }
    }

    console.log("✅ Mensagens automáticas enviadas com sucesso.");
    return null;
  });
