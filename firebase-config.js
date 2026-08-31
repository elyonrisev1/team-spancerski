// ============================================
// CONFIGURAÇÃO FIREBASE — Team Spancerski
// ============================================

const firebaseConfig = {
  apiKey: "AIzaSyBa7_VBRQRVHaKM6jBRZGvTSJnwzQGnd8Q",
  authDomain: "teamspancerski-8c1dc.firebaseapp.com",
  databaseURL: "https://teamspancerski-8c1dc-default-rtdb.firebaseio.com",
  projectId: "teamspancerski-8c1dc",
  storageBucket: "teamspancerski-8c1dc.firebasestorage.app",
  messagingSenderId: "885801398300",
  appId: "1:885801398300:web:891c761c4ec3ab12c82fd9"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);

// Referência do banco de dados
const database = firebase.database();

console.log('✅ Firebase inicializado com sucesso!');
console.log('📊 Banco de dados:', firebaseConfig.projectId);
