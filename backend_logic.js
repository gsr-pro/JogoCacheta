/**
 * Lógica de Backend (Node.js / Express) para validar resgates diários e anúncios.
 * Esta lógica seria executada em um servidor seguro (ex: Firebase Cloud Functions ou Express).
 */

const express = require('express');
const router = express.Router();
// Supondo uso do Firebase Admin SDK
const admin = require('firebase-admin');
const db = admin.firestore();

// Constantes
const MAX_AD_CLAIMS_PER_DAY = 3;
const DAILY_FREE_COINS = 1;
const AD_REWARD_COINS = 1;

/**
 * Rota para resgatar a ficha diária gratuita.
 * Deve ser chamada uma vez por dia quando o usuário faz login.
 */
router.post('/claim-daily', async (req, res) => {
  const userId = req.user.uid; // Assumindo middleware de autenticação
  const today = new Date().toISOString().split('T')[0];
  
  const userRef = db.collection('users').doc(userId);
  
  try {
    await db.runTransaction(async (transaction) => {
      const userDoc = await transaction.get(userRef);
      if (!userDoc.exists) throw new Error('Usuário não encontrado');
      
      const userData = userDoc.data();
      
      // Verifica se já resgatou hoje
      if (userData.lastDailyClaim === today) {
        throw new Error('Ficha diária já resgatada hoje');
      }
      
      // Atualiza o saldo e a data do último resgate
      transaction.update(userRef, {
        coins: (userData.coins || 0) + DAILY_FREE_COINS,
        lastDailyClaim: today,
        // Reseta os contadores de anúncios para o novo dia
        adClaimsToday: 0,
        lastAdClaimDate: today
      });
      
      // Opcional: Registrar na tabela de histórico (SQL ou Firestore)
      const historyRef = db.collection('transaction_history').doc();
      transaction.set(historyRef, {
        userId,
        type: 'daily_reward',
        amount: DAILY_FREE_COINS,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });
    });
    
    res.json({ success: true, message: 'Ficha diária resgatada com sucesso!' });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * Rota para resgatar ficha após assistir a um anúncio (Rewarded Ad).
 * Deve ser chamada pelo cliente após a conclusão do anúncio.
 */
router.post('/claim-ad-reward', async (req, res) => {
  const userId = req.user.uid;
  const today = new Date().toISOString().split('T')[0];
  
  const userRef = db.collection('users').doc(userId);
  
  try {
    await db.runTransaction(async (transaction) => {
      const userDoc = await transaction.get(userRef);
      if (!userDoc.exists) throw new Error('Usuário não encontrado');
      
      const userData = userDoc.data();
      
      // Verifica se o último resgate de anúncio foi hoje
      let claimsToday = 0;
      if (userData.lastAdClaimDate === today) {
        claimsToday = userData.adClaimsToday || 0;
      }
      
      // Verifica o limite diário
      if (claimsToday >= MAX_AD_CLAIMS_PER_DAY) {
        throw new Error('Limite diário de anúncios atingido');
      }
      
      // Atualiza o saldo e os contadores
      transaction.update(userRef, {
        coins: (userData.coins || 0) + AD_REWARD_COINS,
        adClaimsToday: claimsToday + 1,
        lastAdClaimDate: today
      });
      
      // Opcional: Registrar na tabela de histórico
      const historyRef = db.collection('transaction_history').doc();
      transaction.set(historyRef, {
        userId,
        type: 'ad_reward',
        amount: AD_REWARD_COINS,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });
    });
    
    res.json({ success: true, message: 'Recompensa de anúncio resgatada!' });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

module.exports = router;
