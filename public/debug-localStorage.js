// Script de debug pour vérifier le localStorage côté client
console.log('🔍 Debug localStorage - Clés liées aux conversations:');

// Lister toutes les clés localStorage
const allKeys = Object.keys(localStorage);
console.log(`📋 Total clés localStorage: ${allKeys.length}`);

// Filtrer les clés liées aux conversations et sessions
const conversationKeys = allKeys.filter(key => 
  key.includes('conversation') || 
  key.includes('session') || 
  key.includes('lr_tchatagent')
);

console.log('\n📊 Clés pertinentes trouvées:');
conversationKeys.forEach(key => {
  try {
    const data = localStorage.getItem(key);
    if (data) {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) {
        console.log(`- ${key}: ${parsed.length} items`);
        if (parsed.length > 0 && parsed[0]) {
          console.log(`  Premier item: ${JSON.stringify(parsed[0], null, 2).substring(0, 200)}...`);
        }
      } else if (typeof parsed === 'object') {
        console.log(`- ${key}: objet avec ${Object.keys(parsed).length} propriétés`);
      } else {
        console.log(`- ${key}: ${typeof parsed} (${data.length} chars)`);
      }
    } else {
      console.log(`- ${key}: null`);
    }
  } catch (error) {
    console.log(`- ${key}: erreur parsing - ${error.message}`);
  }
});

// Test spécifique de la clé utilisée par l'API
console.log('\n🧪 Test spécifique de lr_tchatagent_conversations:');
const conversationsData = localStorage.getItem('lr_tchatagent_conversations');
if (conversationsData) {
  try {
    const conversations = JSON.parse(conversationsData);
    console.log(`✅ ${conversations.length} conversations trouvées`);
    if (conversations.length > 0) {
      console.log('Première conversation:', JSON.stringify(conversations[0], null, 2));
    }
  } catch (error) {
    console.log('❌ Erreur parsing conversations:', error.message);
  }
} else {
  console.log('❌ Aucune donnée dans lr_tchatagent_conversations');
}

// Test des sessions
console.log('\n🧪 Test des sessions:');
const sessionKeys = allKeys.filter(key => key.startsWith('lr_tchatagent_sessions_'));
console.log(`📂 ${sessionKeys.length} clés de sessions trouvées:`);
sessionKeys.forEach(key => {
  const user = key.replace('lr_tchatagent_sessions_', '');
  const data = localStorage.getItem(key);
  if (data) {
    try {
      const sessions = JSON.parse(data);
      console.log(`- ${user}: ${sessions.length} sessions`);
    } catch (error) {
      console.log(`- ${user}: erreur parsing`);
    }
  }
});

// Export des données pour debug
console.log('\n💾 Export des données pour debug...');
const debugData = {};
conversationKeys.forEach(key => {
  debugData[key] = localStorage.getItem(key);
});

// Créer un blob et le télécharger
const blob = new Blob([JSON.stringify(debugData, null, 2)], { type: 'application/json' });
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = 'localStorage-debug.json';
document.body.appendChild(a);
a.click();
document.body.removeChild(a);
URL.revokeObjectURL(url);

console.log('✅ Fichier localStorage-debug.json téléchargé');