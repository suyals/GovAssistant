/* ============================================================
   GovAssist AI — translations.js
   Multi-language support for Hindi and English
   ============================================================ */

const TRANSLATIONS = {
  en: {
    // Header
    header: {
      title: "GovAssist AI",
      subtitle: "Your Indian Government Schemes Guide",
      profile: "Profile",
      newChat: "New Chat",
    },
    
    // History Sidebar
    history: {
      title: "Chat History",
      empty: "No chat history yet",
      deleteAll: "Delete All History",
    },
    
    // Profile Panel
    profile: {
      title: "Your Profile",
      description: "Providing your details helps GovAssist AI find schemes you're eligible for more accurately.",
      name: "Full Name",
      namePlaceholder: "e.g. Ramesh Kumar",
      age: "Age",
      agePlaceholder: "e.g. 35",
      income: "Annual Income (₹)",
      incomePlaceholder: "e.g. 150000",
      occupation: "Occupation",
      occupationPlaceholder: "Select occupation",
      farmer: "Farmer / Agriculture",
      laborer: "Laborer / Daily Wage",
      student: "Student",
      salaried: "Salaried Employee",
      business: "Self-Employed / Business",
      unemployed: "Unemployed",
      other: "Other",
      saveBtn: "Save & Continue",
    },
    
    // Chat Area
    chat: {
      placeholder: "Ask about schemes, eligibility, or benefits...",
      disclaimer: "GovAssist AI can make mistakes. Always verify information on official government websites.",
      emptyTitle: "Welcome to GovAssist AI",
      emptySubtitle: "Your smart guide to Indian government schemes",
      tryAsking: "Try asking:",
      farmerSchemes: "🌾 Schemes for farmers",
      healthSchemes: "💊 Health schemes",
      housingAssistance: "🏠 Housing assistance",
      educationSupport: "📚 Education support",
      typing: "Bot is typing...",
      connectionError: "I'm having trouble connecting right now. Please try again.",
    },
    
    // Scheme Cards
    schemes: {
      label: "Suggested Schemes",
      benefits: "Key Benefits",
      maxIncome: "Max Income: ₹",
      copy: "Copy",
      schemeDetailsCopied: "✓ Scheme details copied!",
      applyNow: "Apply Now",
    },
    
    // Toast/Notifications
    notifications: {
      copied: "Copied!",
      copiedFailed: "Failed to copy",
      newChatStarted: "New chat session started",
    },
    
    // Profile Button (dynamic)
    profilePlaceholder: "Profile",
    
    // History Toast
    languageChanged: "Language changed to English",
  },
  
  hi: {
    // Header
    header: {
      title: "गवAssist AI",
      subtitle: "आपका भारतीय सरकारी योजनाओं का गाइड",
      profile: "प्रोफाइल",
      newChat: "नई चैट",
    },
    
    // History Sidebar
    history: {
      title: "चैट इतिहास",
      empty: "अभी कोई चैट इतिहास नहीं",
      deleteAll: "सभी इतिहास हटाएं",
    },
    
    // Profile Panel
    profile: {
      title: "आपकी प्रोफाइल",
      description: "अपने विवरण प्रदान करने से GovAssist AI आपके लिए योग्य योजनाएं खोजने में अधिक सहायता कर सकता है।",
      name: "पूरा नाम",
      namePlaceholder: "उदा. राजेश कुमार",
      age: "आयु",
      agePlaceholder: "उदा. 35",
      income: "वार्षिक आय (₹)",
      incomePlaceholder: "उदा. 150000",
      occupation: "व्यवसाय",
      occupationPlaceholder: "व्यवसाय चुनें",
      farmer: "किसान / कृषि",
      laborer: "मजदूर / दैनिक मजदूरी",
      student: "छात्र",
      salaried: "वेतनभोगी कर्मचारी",
      business: "स्व-नियोजित / व्यावसाय",
      unemployed: "बेरोजगार",
      other: "अन्य",
      saveBtn: "सहेजें और जारी रखें",
    },
    
    // Chat Area
    chat: {
      placeholder: "योजनाओं, पात्रता, या लाभों के बारे में पूछें...",
      disclaimer: "GovAssist AI गलतियां कर सकता है। हमेशा आधिकारिक सरकारी वेबसाइटों पर जानकारी सत्यापित करें।",
      emptyTitle: "GovAssist AI में आपका स्वागत है",
      emptySubtitle: "भारतीय सरकारी योजनाओं के लिए आपका स्मार्ट गाइड",
      tryAsking: "पूछने का प्रयास करें:",
      farmerSchemes: "🌾 किसानों के लिए योजनाएं",
      healthSchemes: "💊 स्वास्थ्य योजनाएं",
      housingAssistance: "🏠 आवास सहायता",
      educationSupport: "📚 शिक्षा समर्थन",
      typing: "बॉट टाइप कर रहा है...",
      connectionError: "अभी कनेक्शन में समस्या हो रही है। कृपया फिर से प्रयास करें।",
    },
    
    // Scheme Cards
    schemes: {
      label: "सुझाई गई योजनाएं",
      benefits: "मुख्य लाभ",
      maxIncome: "अधिकतम आय: ₹",
      copy: "कॉपी करें",
      schemeDetailsCopied: "✓ योजना विवरण कॉपी किया गया!",
      applyNow: "अभी आवेदन करें",
    },
    
    // Toast/Notifications
    notifications: {
      copied: "कॉपी किया गया!",
      copiedFailed: "कॉपी करने में विफल",
      newChatStarted: "नई चैट सत्र शुरू की गई",
    },
    
    // Profile Button (dynamic)
    profilePlaceholder: "प्रोफाइल",
    
    // History Toast
    languageChanged: "भाषा हिंदी में बदल गई",
    
    // Language
    language: "भाषा",
    english: "English",
    hindi: "हिंदी",
  },
};

// Get translation by key path
function t(key, lang = getCurrentLanguage()) {
  const keys = key.split('.');
  let value = TRANSLATIONS[lang];
  for (const k of keys) {
    value = value?.[k];
  }
  return value || key;
}

// Get current language from localStorage or default to English
function getCurrentLanguage() {
  return localStorage.getItem('appLanguage') || 'en';
}

// Set language and persist to localStorage
function setLanguage(lang) {
  if (TRANSLATIONS[lang]) {
    localStorage.setItem('appLanguage', lang);
    return true;
  }
  return false;
}

// Get all available languages
function getAvailableLanguages() {
  return Object.keys(TRANSLATIONS);
}
