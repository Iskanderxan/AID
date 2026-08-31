import React, { useState, useEffect, useRef } from "react";

const DoctorAssistantApp = () => {
  // === PART 1: API CONFIGURATION ===
  const API_CONFIG = {
  CLAUDE_API_KEY: "",
  // IMPORTANT: Will be updated after backend deployment
  CLAUDE_API_URL: process.env.REACT_APP_BACKEND_URL || "http://localhost:5000/api/claude",
  MODEL: "claude-sonnet-4-20250514",
  MAX_TOKENS: 4000,
  TEMPERATURE: 0.7,
  PUBMED_API_URL: "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi"
};
  const makeAPIRequest = async (url, options) => {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(options.body)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`API request failed: ${response.status} - ${errorData.error?.message || response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('API Request Error:', error);
    throw error;
  }
};

    // State variables
  const [page, setPage] = useState("home");
  const [aiResponse, setAiResponse] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [followUpQuestion, setFollowUpQuestion] = useState("");
  const [showChat, setShowChat] = useState(false);
  const [newsResponse, setNewsResponse] = useState("");
  const [isLoadingNews, setIsLoadingNews] = useState(false);
  const [savedPatients, setSavedPatients] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [urgencyLevel, setUrgencyLevel] = useState("routine");
  const [patientNotes, setPatientNotes] = useState("");
  const [showTemplates, setShowTemplates] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState("");


// Add these new state variables with your existing useState declarations
  const [isLeftPanelCollapsed, setIsLeftPanelCollapsed] = useState(false);
  const [isNewsPanelCollapsed, setIsNewsPanelCollapsed] = useState(false);

  // Add this with your other useState declarations
const chatMessagesRef = useRef(null);

// Add this function anywhere before your render functions
const scrollToBottom = () => {
  if (chatMessagesRef.current) {
    chatMessagesRef.current.scrollTo({
      top: chatMessagesRef.current.scrollHeight,
      behavior: 'smooth'
    });
  }
};

// Add this useEffect to auto-scroll when messages change
useEffect(() => {
  scrollToBottom();
}, [chatMessages]);

  // Add this with your other useState declarations
const [correspondences, setCorrespondences] = useState([]);
const [newCorrespondence, setNewCorrespondence] = useState({
  patientName: "",
  patientID: "",
  recipientName: "",
  recipientType: "doctor", // doctor, patient, hospital, insurance
  subject: "",
  content: "",
  correspondenceType: "referral", // referral, report, consultation, discharge
  urgency: "routine" // routine, urgent, emergency
});

// Add these state variables with your other useState declarations
const [drugList, setDrugList] = useState([]);
const [newDrug, setNewDrug] = useState({
  name: "",
  dosage: "",
  frequency: "",
  route: "oral" // oral, iv, im, topical, etc.
});
const [drugInteractionResult, setDrugInteractionResult] = useState("");
const [isDrugAnalysisLoading, setIsDrugAnalysisLoading] = useState(false);

// Add these with your existing useState declarations
const [uploadedImages, setUploadedImages] = useState([]);
const [chatImages, setChatImages] = useState([]);
const [isProcessingImage, setIsProcessingImage] = useState(false);

// Add these functions before your render functions
const convertImageToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]); // Remove data:image/jpeg;base64, prefix
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

const formatImageForClaude = (image) => {
  return {
    type: "image",
    source: {
      type: "base64",
      media_type: image.type,
      data: image.base64
    }
  };
};

const handleImageUpload = async (event, isChat = false) => {
  const files = Array.from(event.target.files);
  if (files.length === 0) return;

  setIsProcessingImage(true);
  
  try {
    const imagePromises = files.map(async (file) => {
      if (!file.type.startsWith('image/')) {
        alert('გთხოვთ აირჩიოთ მხოლოდ სურათის ფაილები');
        return null;
      }
      
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        alert('სურათის ზომა არ უნდა აღემატებოდეს 10MB-ს');
        return null;
      }

      const base64 = await convertImageToBase64(file);
      return {
        id: Date.now() + Math.random(),
        name: file.name,
        type: file.type,
        base64: base64,
        size: file.size,
        uploadTime: new Date().toLocaleTimeString()
      };
    });

    const processedImages = (await Promise.all(imagePromises)).filter(img => img !== null);
    
    if (isChat) {
      setChatImages(prev => [...prev, ...processedImages]);
    } else {
      setUploadedImages(prev => [...prev, ...processedImages]);
    }
  } catch (error) {
    console.error('სურათის ატვირთვის შეცდომა:', error);
    alert('სურათის ატვირთვაში შეცდომა მოხდა');
  }
  
  setIsProcessingImage(false);
  event.target.value = ''; // Reset input
};

const removeImage = (imageId, isChat = false) => {
  if (isChat) {
    setChatImages(prev => prev.filter(img => img.id !== imageId));
  } else {
    setUploadedImages(prev => prev.filter(img => img.id !== imageId));
  }
};


  const [profile, setProfile] = useState({
    name: "",
    surname: "",
    age: "",
    field: "",
    email: "",
    summary: ""
  });

  const [newHistory, setNewHistory] = useState({
    patientGender: "",
    patientAge: "",
    patientID: "",
    symptoms: ""
  });

  // Clinical templates in Georgian
  const clinicalTemplates = {
    "საგანგებო მედიცინა": `თქვენ ხართ საგანგებო მედიცინის სპეციალისტი. პაციენტის სქესი: {patientGender}, ასაკი: {patientAge}
    
სიმპტომები: {symptoms}

სასწრაფო შეფასება:
1. ტრიაჟის დონე (ESI 1-5)
2. სიცოცხლისთვის საშიში მდგომარეობები რომლებიც დაუყოვნებლივ უნდა გამოირიცხოს
3. საგანგებო დიაგნოსტიკური ტესტები რომლებიც ᲐᲮᲚᲐᲕᲔ არის საჭირო
4. დაუყოვნებელი ჩარევები რომლებიც საჭიროა
5. განლაგება (გაწერა, ჰოსპიტალიზაცია, დაკვირვება)

ფოკუსი დროისა დამოკიდებულ მდგომარეობებსა და საგანგებო პროტოკოლებზე.`,
    
    "შინაგანი მედიცინა": `თქვენ ხართ შინაგანი მედიცინის ექიმი. პაციენტი: {patientName}, ასაკი: {patientAge}
    
კლინიკური პრეზენტაცია: {symptoms}

ყოვლისმომცველი შეფასება:
1. პირველადი დიფერენციალური დიაგნოზები (5 ყველაზე ალბათური)
2. სისტემური განხილვის მიდგომა
3. მტკიცებულებებზე დაფუძნებული დიაგნოსტიკური გამოკვლევა
4. რისკების სტრატიფიკაცია
5. მკურნალობის რეკომენდაციები რეკომენდაციებით
6. შემდგომი მკურნალობის გეგმა`,
    
    "პედიატრია": `თქვენ ხართ პედიატრიის სპეციალისტი. პაციენტის სქესი: {patientGender}, ასაკი: {patientAge}
    
კლინიკური მოძიებები: {symptoms}

პედიატრიული შეფასება:
1. ასაკის შესაბამისი დიფერენციალური დიაგნოზები
2. განვითარების ასპექტები
3. პედიატრიულ-სპეციფიკური წითელი ალმები
4. წონაზე დაფუძნებული მედიკამენტების დოზირება
5. ოჯახის/მომვლელის კონსულტაციის ქულები
6. ზრდასა და განვითარებაზე ზეგავლენა`,
    
    "ფსიქიატრია": `თქვენ ხართ ფსიქიატრიული კონსულტანტი. პაციენტის სქესი: {patientGender}, ასაკი: {patientAge}
    
კლინიკური პრეზენტაცია: {symptoms}

ფსიქიატრიული შეფასება:
1. ფსიქური მდგომარეობის გამოკვლევის მოძიებები
2. დიფერენციალური ფსიქიატრიული დიაგნოზები
3. რისკის შეფასება (თვითმკვლელობა, თვითდაზიანება, ძალადობა)
4. ნივთიერებების მოხმარების მხედველობაში მიღება
5. ფსიქოსოციალური ფაქტორები
6. მკურნალობის რეკომენდაციები (თერაპია vs მედიკამენტები)`
  };
  
  // Default prompt in Georgian
  const defaultPrompt = `თქვენ ხართ სამედიცინო AI ასისტენტი რომელიც უზრუნველყოფს მეორე აზრის შეთავაზებებს ჯანდაცვის პროფესიონალებისთვის. 

პაციენტის ინფორმაცია:
- სქესი: {patientGender}
- ასაკი: {patientAge}
- ID: {patientID}

სიმპტომები და ანამნეზი:
{symptoms}

გთხოვთ მიაწოდოთ:
1. ეცადე იქონიო ადამიანის მსგავსი კომუნიკაცია: გამოიყენე მოკლე კომუნიკაციის ფორმა. გამოიყენე მხოლოდ ქართული ენა.
გაითვალისწინე რომ შენ კომუნიკაციაში ხარ პროფესიონალ სერტიფიცირებულ ექიმთან და არა პაციენტთან.
ინფორმაცია გამოიტანე ქრონოლოგიაში მითითებული რიგითობით. არ გამოიტანო ყველაფერი ერთდროულად. 
ჯერ მიიღე პასუხი ქრონოლოგიაში მითითებულ პირველ საკითხზე და შემდეგ გამოიტანე ჩათში ქრონოლოგიის მეორე, მესამე და ასე შემდეგ საკითხები.
ეცადე იყო ლაკონური და არ გადატვირთო ექიმი ზედმეტი კითხვებით.
2. დაიცავი შემდეგი ქრონოლოგია: 
1) დააზუსტე ანამნეზი და მიიღე სრული სიმტომების შესახებ ინფორმაცია; 
2) დასვი პირველადი სავარაუდო დიაგნოზი; 
3) მოითხოვე სადიაგნოსტიკო ღონისძიებები; 
4) მიღებული ინფორმაციის საფუძველზე დასვი საბოლოო დიაგნოზი; 
5) დანიშნე მკურნალობა ან სამედიცინო მანიპულაცია 
6) მოითხოვე შესაბამისი პერიოდის შემდგომი დამდგარი შედეგების შესახებ ინფორმაცია.
3. პირველადი დიაგნოზის დასმისას ჩამოთვალეთ მხოლოდ ერთიდან სამამდე შესაძლო ყველაზე მაღალი ალბათობის მქონე დიაგნოზი.
4. მას შემდეგ რაც დასვამ პირველად დიაგნოზს ჩამოთვალე რეკომენდებული სადიაგნოსტიკო ღონისძიებები ან გამოკვლევები
4. მიუთითე განსაკუთრებულად საყურადღებო ან საშიში გარემოებები
5. მას შემდეგ რაც მიიღებ სადიაგნოსტიკო ღონისძიებების ან გამოკვლევების შედეგებს დასვი საბოლოო დიაგნოზი, მიუთითე მკურნალობის სტრატეგია და ტაქტიკა და დანიშნე მკურნალობა ან სამედიცინო მანიპულაცია 
6. მიუთითე დრო რა დროშიც უნდა მოგცენ დამდგარი შედეგების შესახებ ინფორმაცია, რათა შეაფასო მკურნალობის სტრატეგია, პროცესი და ტაქტიკა

მნიშვნელოვანი განაცხადი: ეს მხოლოდ მითითებისთვისაა და არ უნდა ჩაანაცვლოს პროფესიონალური სამედიცინო განსჯა. ყოველთვის გადაამოწმეთ კლინიკური მითითებებით და კონსულტაცია გაუწიეთ კოლეგებს საჭიროების შემთხვევაში.`;


  const [customPrompt, setCustomPrompt] = useState(defaultPrompt);

  // Helper functions with Georgian text
  const handlePromptChange = (newPrompt) => {
    setCustomPrompt(newPrompt);
  };

//   useEffect(() => {
//   const checkAPISetup = async () => {
//     if (!API_CONFIG.CLAUDE_API_KEY) {
//       console.warn(`
// 🔧 Claude API Setup Required!
// 1. Get API key from: https://console.anthropic.com/
// 2. Replace sk-ant-your-api-key-here with your actual key
// 3. Use model: claude-sonnet-4-20250514
//       `);
//       return false;
//     }
//     return true;
//   };
  
//   checkAPISetup();
// }, []);

  // Save patient record
  const savePatientRecord = () => {
    if (!newHistory.patientGender || !newHistory.symptoms) {
      alert("გთხოვთ შეიყვანოთ პაციენტის სქესი და კლინიკური დოკუმენტაცია შენახვამდე.");
      return;
    }

    const patientRecord = {
      id: Date.now().toString(),
      patientGender: newHistory.patientGender,
      patientAge: newHistory.patientAge,
      patientID: newHistory.patientID,
      symptoms: newHistory.symptoms,
      urgencyLevel,
      notes: patientNotes,
      aiResponse: aiResponse,
      chatHistory: chatMessages,
      timestamp: new Date().toISOString(),
      lastModified: new Date().toLocaleString()
    };

    const updatedPatients = [patientRecord, ...savedPatients];
    setSavedPatients(updatedPatients);
    alert("✅ პაციენტის ჩანაწერი წარმატებით შეინახა!");
  };

  // Load patient record
  const loadPatientRecord = (record) => {
    setNewHistory({
      patientGender: record.patientGender,
      patientAge: record.patientAge,
      patientID: record.patientID,
      symptoms: record.symptoms
    });
    setUrgencyLevel(record.urgencyLevel || "routine");
    setPatientNotes(record.notes || "");
    setAiResponse(record.aiResponse || "");
    setChatMessages(record.chatHistory || []);
    setShowChat(record.chatHistory && record.chatHistory.length > 0);
    setPage("createHistory");
  };

  // Delete patient record
  const deletePatientRecord = (recordId) => {
    if (window.confirm("დარწმუნებული ხართ რომ გსურთ ამ პაციენტის ჩანაწერის წაშლა?")) {
      const updatedPatients = savedPatients.filter(p => p.id !== recordId);
      setSavedPatients(updatedPatients);
    }
  };

  // Apply clinical template
  const applyTemplate = (templateName) => {
    setCustomPrompt(clinicalTemplates[templateName]);
    setShowTemplates(false);
    alert(`✅ ${templateName} შაბლონი გამოყენებულია!`);
  };

  // Reset prompt to default
  const resetPromptToDefault = () => {
    setCustomPrompt(defaultPrompt);
  };

  // Export consultation to PDF/text
  const exportConsultation = () => {
    const genderText = newHistory.patientGender === 'male' ? 'მამრობითი' : 
                     newHistory.patientGender === 'female' ? 'მდედრობითი' :  
                     newHistory.patientGender || 'არ არის მითითებული';
    const exportData = `
კლინიკური კონსულტაციის ანგარიში
შექმნილია: ${new Date().toLocaleString()}

პაციენტის ინფორმაცია:
სქესი: ${genderText}
ასაკი: ${newHistory.patientAge}
MRN: ${newHistory.patientID}
სისწრაფე: ${urgencyLevel.toUpperCase()}

კლინიკური დოკუმენტაცია:
${newHistory.symptoms}

AI კონსულტაციის შედეგები:
${aiResponse}

ექიმის შენიშვნები:
${patientNotes}

კონსულტაციის ისტორია:
${chatMessages.map(msg => `[${msg.timestamp}] ${msg.type === 'user' ? 'ექიმი' : 'AI'}: ${msg.text}`).join('\n\n')}

---
ეს ანგარიში შექმნილია კლინიკური გადაწყვეტილების მხარდაჭერის სისტემის მიერ
⚠️ მხოლოდ კლინიკური გადაწყვეტილების მხარდაჭერისთვის. გამოიყენეთ პროფესიონალური სამედიცინო განსჯა.
    `.trim();

    const blob = new Blob([exportData], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `konsultacia_${genderText}_${newHistory.patientAge || 'pacienti'}_${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Add these functions inside your DoctorAssistantApp component (before render functions)

// Add drug to list
const addDrugToList = () => {
  if (!newDrug.name.trim()) {
    alert("გთხოვთ შეიყვანოთ წამლის სახელი");
    return;
  }

  const drug = {
    id: Date.now().toString(),
    name: newDrug.name,
    dosage: newDrug.dosage,
    frequency: newDrug.frequency,
    route: newDrug.route,
    addedTime: new Date().toLocaleTimeString('ka-GE')
  };

  setDrugList([...drugList, drug]);
  setNewDrug({
    name: "",
    dosage: "",
    frequency: "",
    route: "oral"
  });
};

// Remove drug from list
const removeDrugFromList = (drugId) => {
  setDrugList(drugList.filter(drug => drug.id !== drugId));
};

// Clear all drugs
const clearDrugList = () => {
  setDrugList([]);
  setDrugInteractionResult("");
};

// AI Drug Interaction Analysis
const analyzeDrugInteractions = async () => {
  if (drugList.length < 2) {
    alert("გთხოვთ დაამატოთ მინიმუმ 2 წამალი ურთიერთქმედების შესამოწმებლად");
    return;
  }

  setIsDrugAnalysisLoading(true);
  setDrugInteractionResult("");

  try {

  const drugListText = drugList.map(drug => 
    `• ${drug.name}${drug.dosage ? ` (${drug.dosage})` : ''}${drug.frequency ? ` - ${drug.frequency}` : ''} - ${drug.route === 'oral' ? 'ორალურად' : drug.route === 'iv' ? 'ვენაში' : drug.route === 'im' ? 'კუნთში' : drug.route}`
  ).join('\n');

  const interactionPrompt = `თქვენ ხართ კლინიკური ფარმაცევტი და წამლების ურთიერთქმედების ექსპერტი. გთხოვთ გააანალიზოთ ქვემოთ მოცემული წამლების სია შესაძლო ურთიერთქმედებების დასადგენად:

${drugListText}

გთხოვთ მიაწოდოთ:

**1. ურთიერთქმედების ანალიზი:**
- მნიშვნელოვანი ურთიერთქმედებები (Major interactions)
- ზომიერი ურთიერთქმედებები (Moderate interactions)  
- მცირე ურთიერთქმედებები (Minor interactions)

**2. კლინიკური მნიშვნელობა:**
- თითოეული ურთიერთქმედების მექანიზმი
- მოსალოდნელი ეფექტები პაციენტზე
- რისკის დონე (მაღალი/საშუალო/დაბალი)

**3. რეკომენდაციები:**
- უსაფრთხოების ზომები
- მონიტორინგის საჭიროება
- დოზის კორექცია
- ალტერნატიული წამლები (თუ საჭიროა)

**4. ფარმაკოკინეტიკური ასპექტები:**
- CYP450 ფერმენტების ზეგავლენა
- შეწოვის, გავრცელების, მეტაბოლიზმის, გამოყოფის ცვლილებები

**5. კონკრეტული ინსტრუქციები:**
- მიღების დროის ინტერვალები
- კვების თან მიღების რეკომენდაციები
- თუ რა უნდა ავიცილოთ

გთხოვთ პასუხი იყოს პრაქტიკული, კონკრეტული და ქართულ ენაზე. თუ ურთიერთქმედება არ არსებობს, ეს მკაფიოდ აღნიშნეთ.

⚠️ გაფრთხილება: ეს ანალიზი მხოლოდ საინფორმაციო მიზნებისთვისაა და არ ანაცვლებს პროფესიონალურ ფარმაცევტულ კონსულტაციას.`;

  const requestBody = {
    model: API_CONFIG.MODEL,
    max_tokens: 1500,
    temperature: 0.3,
    messages: [
      {
        role: "user",
        content: interactionPrompt
      }
    ]
  };

  const apiResponse = await makeAPIRequest(
    API_CONFIG.CLAUDE_API_URL,
    { body: requestBody }
  );

  if (apiResponse.content && apiResponse.content.length > 0) {
    const analysisResult = apiResponse.content[0].text;
    setDrugInteractionResult(analysisResult);
  } else {
    throw new Error("AI-სგან ვალიდური პასუხი არ მოვიდა");
  }

  setIsDrugAnalysisLoading(false);
} catch (error) {
  console.error("წამლების ანალიზის შეცდომა:", error);
  setDrugInteractionResult(`შეცდომა: ${error.message}`);
  setIsDrugAnalysisLoading(false);
}
};

// Update the checkDrugInteractions function
const checkDrugInteractions = () => {
  setPage("drugInteractions");
};

  // // Drug interaction checker
  // const checkDrugInteractions = () => {
  //   alert("🔍 წამლების ურთიერთქმედების შემოწმება\n\nეს ფუნქცია ინტეგრირდება:\n• FDA წამლების მონაცემთა ბაზასთან\n• კლინიკური წამლების ურთიერთქმედების APIs\n• აფთიაქის სისტემებთან\n\n(ფუნქცია განვითარების პროცესშია)");
  // };

  // Quick differential diagnosis
  const getQuickDifferential = async () => {
    if (!newHistory.symptoms.trim()) {
      alert("გთხოვთ ჯერ შეიყვანოთ სიმპტომები.");
      return;
    }

    setIsLoading(true);

  try {
      const differentialPrompt = `სწრაფი დიფერენციალური დიაგნოზი ამ სიმპტომებისთვის: ${newHistory.symptoms}
      
      მიაწოდეთ:
      1. ყველაზე ალბათური დიაგნოზი
      2. მეორე ალბათური
      3. გამოსარიცხი სერიოზული მდგომარეობა
      4. საგანგებო მდგომარეობა
      5. იშვიათი შესაძლებლობა
      
      პასუხი ქართულ ენაზე, მოკლედ და კონკრეტულად.`;

      try {
          const requestBody = {
            model: API_CONFIG.MODEL,
            max_tokens: 500,
            temperature: 0.4,
            messages: [
              {
                role: "user",
                content: differentialPrompt
              }
            ]
          };

          const apiResponse = await makeAPIRequest(
            API_CONFIG.CLAUDE_API_URL,
            { body: requestBody }
          );

          if (apiResponse.content && apiResponse.content.length > 0) {
            const differentialResult = apiResponse.content[0].text;
            alert(`🎯 სწრაფი დიფერენციალური დიაგნოზი\n\n${differentialResult}\n\n⚠️ AI შეთავაზება - გამოიყენეთ კლინიკური განსჯა.`);
          } else {
            throw new Error("AI-სგან პასუხი არ მოვიდა");
          }
          
          setIsLoading(false);
        } catch (error) {
      console.error('სწრაფი დიფერენციალის შეცდომა:', error);
      alert(`❌ ${error.message}`);
      setIsLoading(false);
    }
  }catch (error) {
    console.error('სწრაფი დიფერენციალის შეცდომა:', error);
    alert(`❌ ${error.message}`);
    setIsLoading(false);
  }
};

// Update the filteredPatients function to search by gender instead of name:
  const filteredPatients = savedPatients.filter(patient => {
  const genderText = patient.patientGender === 'male' ? 'მამრობითი' : 
                     patient.patientGender === 'female' ? 'მდედრობითი' : 
                     patient.patientGender || '';
  
  return genderText.toLowerCase().includes(searchTerm.toLowerCase()) ||
         (patient.patientID || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
         (patient.symptoms || '').toLowerCase().includes(searchTerm.toLowerCase());
});

  const handleProfileChange = (field, value) => {
    setProfile(prev => ({ ...prev, [field]: value }));
  };

  const handleHistoryChange = (field, value) => {
    setNewHistory(prev => ({ ...prev, [field]: value }));
  };

  // AI consultation functions with Georgian responses
  const consultWithAI = async () => {
    if (!newHistory.symptoms.trim()) {
      alert("გთხოვთ შეიყვანოთ სიმპტომები AI კონსულტაციამდე");
      return;
    }

    setIsLoading(true);
    setIsLoadingNews(true);
    setAiResponse("");
    setNewsResponse("");

    setAiResponse("🔄 AI აანალიზებს კლინიკურ ინფორმაციას...");
    setNewsResponse("🔍 ვეძებ რელევანტურ სამედიცინო კვლევებს...");

    try {
      await Promise.allSettled([getAIConsultation(), getLatestMedicalNews()]);
    } catch (error) {
      console.error('კონსულტაციაში შეცდომა:', error);
      setAiResponse("კონსულტაციაში შეცდომა მოხდა. გთხოვთ კიდევ სცადოთ.");
      setNewsResponse("კვლევების ძებნაში შეცდომა მოხდა.");
    }
  };

  const getAIConsultation = async () => {
  try {
     const processedPrompt = customPrompt
      .replace('{patientGender}', newHistory.patientGender || "არ არის მითითებული")
      .replace('{patientAge}', newHistory.patientAge || "არ არის მითითებული")
      .replace('{patientID}', newHistory.patientID || "არ არის მითითებული")
      .replace('{symptoms}', newHistory.symptoms);

    // Build content array for Claude
    const content = [{ type: "text", text: processedPrompt }];
    
    // Add uploaded images to the content
    uploadedImages.forEach(image => {
      content.push(formatImageForClaude(image));
    });

    const requestBody = {
      model: API_CONFIG.MODEL,
      max_tokens: API_CONFIG.MAX_TOKENS,
      temperature: API_CONFIG.TEMPERATURE,
      messages: [
        {
          role: "user",
          content: content
        }
      ]
    };

    const apiResponse = await makeAPIRequest(
      API_CONFIG.CLAUDE_API_URL,
      { body: requestBody }
    );

    let consultationText = "";
    if (apiResponse.content && apiResponse.content.length > 0) {
      consultationText = apiResponse.content[0].text;
    } else {
      throw new Error("AI-სგან ვალიდური პასუხი არ მოვიდა");
    }

    setAiResponse(consultationText);
    
    const newMessages = [
      {
        type: 'user',
        text: `პაციენტი: ${newHistory.patientName || 'უცნობი'}\nსიმპტომები: ${newHistory.symptoms}${uploadedImages.length > 0 ? `\n📷 ატვირთული სურათები: ${uploadedImages.length}` : ''}`,
        timestamp: new Date().toLocaleTimeString(),
        images: [...uploadedImages]
      },
      {
        type: 'ai',
        text: consultationText,
        timestamp: new Date().toLocaleTimeString()
      }
    ];
    
    setChatMessages(newMessages);
    setShowChat(true);
    setIsLoading(false);

    setTimeout(scrollToBottom, 100);

  } catch (error) {
    console.error('AI კონსულტაციის შეცდომა:', error);
    let errorMessage = "AI სერვისთან კავშირის დამყარებაში შეცდომა მოხდა.";
    
    if (error.message.includes("API key")) {
      errorMessage = "API key არ არის კონფიგურირებული. გთხოვთ დააყენოთ Claude API key.";
    }
    
    setAiResponse(`შეცდომა: ${errorMessage}`);
    setChatMessages([{
      type: 'ai',
      text: `შეცდომა: ${errorMessage}`,
      timestamp: new Date().toLocaleTimeString()
    }]);
    setShowChat(true);
    setIsLoading(false);
  }
};
  // Add this function inside your DoctorAssistantApp component (before the render functions)
const formatResearchText = (text) => {
  if (!text) return null;

  // Split text into lines for processing
  const lines = text.split('\n');
  
  return lines.map((line, lineIndex) => {
    if (!line.trim()) return <br key={lineIndex} />;
    
    // Process each line for different highlighting patterns
    let processedLine = line;
    let elements = [];
    let lastIndex = 0;

    // Define patterns to highlight and their styles
    const patterns = [
      // URLs - make clickable
      {
        regex: /(https?:\/\/[^\s]+)/g,
        render: (match, index) => (
          <a
            key={`url-${lineIndex}-${index}`}
            href={match}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: "#2563eb",
              textDecoration: "underline",
              fontWeight: "500",
              cursor: "pointer"
            }}
            onMouseEnter={(e) => e.target.style.color = "#1d4ed8"}
            onMouseLeave={(e) => e.target.style.color = "#2563eb"}
          >
            {match}
          </a>
        )
      },
      // DOI links
      {
        regex: /(DOI:\s*[^\s]+|doi\.org\/[^\s]+)/gi,
        render: (match, index) => {
          const cleanDoi = match.replace(/^DOI:\s*/i, '');
          const fullUrl = cleanDoi.startsWith('http') ? cleanDoi : `https://doi.org/${cleanDoi}`;
          return (
            <a
              key={`doi-${lineIndex}-${index}`}
              href={fullUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: "#059669",
                textDecoration: "underline",
                fontWeight: "500",
                backgroundColor: "#ecfdf5",
                padding: "2px 4px",
                borderRadius: "3px"
              }}
            >
              {match}
            </a>
          );
        }
      },
      // PubMed IDs
      {
        regex: /(PMID:\s*\d+)/gi,
        render: (match, index) => {
          const pmid = match.replace(/PMID:\s*/i, '');
          return (
            <a
              key={`pmid-${lineIndex}-${index}`}
              href={`https://pubmed.ncbi.nlm.nih.gov/${pmid}/`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: "#7c2d12",
                textDecoration: "underline",
                fontWeight: "500",
                backgroundColor: "#fef7ed",
                padding: "2px 4px",
                borderRadius: "3px"
              }}
            >
              {match}
            </a>
          );
        }
      },
      // Journal names (highlight in bold)
      {
        regex: /\b(NEJM|New England Journal of Medicine|Lancet|JAMA|PubMed|Nature|Science|BMJ|Annals of Internal Medicine)\b/gi,
        render: (match, index) => (
          <span
            key={`journal-${lineIndex}-${index}`}
            style={{
              fontWeight: "700",
              color: "#1e40af",
              backgroundColor: "#dbeafe",
              padding: "1px 3px",
              borderRadius: "2px"
            }}
          >
            {match}
          </span>
        )
      },
      // Important medical terms
      {
        regex: /\b(randomized controlled trial|meta-analysis|systematic review|clinical trial|cohort study|case-control study|RCT)\b/gi,
        render: (match, index) => (
          <span
            key={`term-${lineIndex}-${index}`}
            style={{
              fontWeight: "600",
              color: "#7c2d12",
              backgroundColor: "#fef7ed",
              padding: "1px 3px",
              borderRadius: "2px"
            }}
          >
            {match}
          </span>
        )
      },
      // Research titles (text between quotes or after numbers)
      {
        regex: /("[^"]+"|^\d+\.\s*\*\*[^*]+\*\*)/g,
        render: (match, index) => (
          <span
            key={`title-${lineIndex}-${index}`}
            style={{
              fontWeight: "600",
              color: "#1f2937",
              fontStyle: match.startsWith('"') ? "italic" : "normal"
            }}
          >
            {match}
          </span>
        )
      },
      // Highlight recommendations/conclusions
      {
        regex: /\b(რეკომენდირებულია|ნაჩვენებია|საინტერესო იქნება|მნიშვნელოვანია|უნდა იცოდეთ|ყურადღება)\b/gi,
        render: (match, index) => (
          <span
            key={`rec-${lineIndex}-${index}`}
            style={{
              fontWeight: "600",
              color: "#dc2626",
              backgroundColor: "#fef2f2",
              padding: "1px 3px",
              borderRadius: "2px"
            }}
          >
            {match}
          </span>
        )
      }
    ];

    // Apply all patterns to the line
    patterns.forEach(pattern => {
      const matches = [...processedLine.matchAll(pattern.regex)];
      
      matches.reverse().forEach(match => {
        const beforeMatch = processedLine.slice(0, match.index);
        const afterMatch = processedLine.slice(match.index + match[0].length);
        
        // Create the processed parts
        const beforeElement = beforeMatch;
        const matchElement = pattern.render(match[0], elements.length);
        const afterElement = afterMatch;
        
        // Store for final assembly
        elements.unshift({
          before: beforeElement,
          element: matchElement,
          after: afterElement,
          index: match.index
        });
        
        // Update the line for next pattern
        processedLine = beforeMatch + '___PLACEHOLDER___' + afterMatch;
      });
    });

    // If no special formatting needed, return plain text
    if (elements.length === 0) {
      // Check if line is a header (starts with ** or #)
      if (line.match(/^\*\*.*\*\*$|^#+\s/)) {
        return (
          <div key={lineIndex} style={{ 
            fontWeight: "700", 
            color: "#1e40af", 
            marginTop: "12px", 
            marginBottom: "6px",
            fontSize: "16px"
          }}>
            {line.replace(/\*\*/g, '').replace(/^#+\s/, '')}
          </div>
        );
      }
      return <div key={lineIndex} style={{ marginBottom: "4px" }}>{line}</div>;
    }

    // Assemble the formatted line
    let assembledLine = processedLine;
    elements.forEach(el => {
      assembledLine = assembledLine.replace('___PLACEHOLDER___', '');
    });

    // For complex lines with multiple matches, create a more sophisticated assembly
    return (
      <div key={lineIndex} style={{ marginBottom: "4px", lineHeight: "1.6" }}>
        {renderComplexLine(line, patterns)}
      </div>
    );
  });
};

// Helper function for complex line rendering
const renderComplexLine = (line, patterns) => {
  let parts = [{ text: line, isMatch: false }];
  
  patterns.forEach(pattern => {
    const newParts = [];
    
    parts.forEach(part => {
      if (part.isMatch) {
        newParts.push(part);
        return;
      }
      
      const matches = [...part.text.matchAll(pattern.regex)];
      if (matches.length === 0) {
        newParts.push(part);
        return;
      }
      
      let lastIndex = 0;
      matches.forEach((match, idx) => {
        // Add text before match
        if (match.index > lastIndex) {
          newParts.push({
            text: part.text.slice(lastIndex, match.index),
            isMatch: false
          });
        }
        
        // Add the match as formatted element
        newParts.push({
          element: pattern.render(match[0], idx),
          isMatch: true
        });
        
        lastIndex = match.index + match[0].length;
      });
      
      // Add remaining text
      if (lastIndex < part.text.length) {
        newParts.push({
          text: part.text.slice(lastIndex),
          isMatch: false
        });
      }
    });
    
    parts = newParts;
  });
  
  return parts.map((part, idx) => 
    part.isMatch ? part.element : <span key={idx}>{part.text}</span>
  );
};
  const getLatestMedicalNews = async () => {
  try {
    const searchTerms = newHistory.symptoms
      .toLowerCase()
      .split(/[\s,.\-()]+/)
      .filter(word => word.length > 3)
      .slice(0, 5);

    let newsText = "📰 **უახლესი სამედიცინო კვლევები:**\n\n";

    const researchPrompt = `თქვენ ხართ სამედიცინო კვლევების სპეციალისტი. ამ სიმპტომების და კლინიკური მდგომარეობის გათვალისწინებით: "${searchTerms.join(", ")}"

გთხოვთ მოძებნოთ და შესთავაზოთ:

1. **უახლესი კლინიკური კვლევები** (ბოლო 2 წლის განმავლობაში):
  - PubMed, NEJM, Lancet, JAMA-ს სტატიები
  - რელევანტური კლინიკური trials და studies
  - Meta-analyses და systematic reviews

2. **კონკრეტული რეკომენდაციები**:
  - "რეკომენდირებულია წაიკითხოთ..."
  - "ნაჩვენებია ახალი მიგნებები..."
  - "საინტერესო იქნება გაეცნოთ..."

3. **ღირებული ლინკები**:
  - PubMed PMID ნომრები
  - DOI რეფერენსები
  - ღია წვდომის (Open Access) სტატიების ლინკები
  - გაიდლაინებისა და კლინიკური რეკომენდაციების ლინკები

4. **პრაქტიკული მნიშვნელობა**:
  - როგორ უკავშირდება ეს კვლევები მიმდინარე შემთხვევას
  - ახალი დიაგნოსტიკური ან მკურნალობის მიდგომები
  - კლინიკურ პრაქტიკაში განხორციელების შესაძლებლობები

ფორმატი:
"📚 **რეკომენდებული კვლევითი მასალა:**

**1. [კვლევის სათაური]**
- ავტორები: [...]
- ჟურნალი: [...]
- ლინკი: [PubMed/DOI ლინკი](ეცადე რომ ლინკი აუცილებლად იყოს თუ სტატია სადმე მოიძებნება)
- გთხოვ არ დააგენერირო ლინკები რომლებიც არ არსებობს და არ მუშაობს, წინასწარ შეამოწმე რომ ლინკები სწორია(ეს არის ძალიან მნიშვნელოვანი)
- მნიშვნელობა: [რატომ არის რელევანტური ამ შემთხვევისთვის]

**2. [შემდეგი კვლევა]**
[იგივე ფორმატი]"

პასუხი ქართულ ენაზე, ფოკუსი იყოს პრაქტიკულ და აქტუალურ კვლევებზე.`;

    const requestBody = {
      model: API_CONFIG.MODEL,
      max_tokens: 800,
      temperature: 0.3,
      messages: [
        {
          role: "user",
          content: researchPrompt
        }
      ]
    };

    const apiResponse = await makeAPIRequest(
      API_CONFIG.CLAUDE_API_URL,
      { body: requestBody }
    );

    if (apiResponse.content && apiResponse.content.length > 0) {
      newsText += apiResponse.content[0].text;
    } else {
      newsText += "AI-სგან პასუხი არ მოვიდა.";
    }

    setNewsResponse(newsText);
    setIsLoadingNews(false);
    
  } catch (error) {
    console.error('კვლევების ძებნის შეცდომა:', error);
    setNewsResponse("კვლევების ძებნაში შეცდომა მოხდა: " + error.message);
    setIsLoadingNews(false);
  }
};

  const sendFollowUpQuestion = async () => {
  if (!followUpQuestion.trim() && chatImages.length === 0) return;

  const userMessage = {
    type: 'user',
    text: followUpQuestion || "📷 ახალი სურათების ანალიზი",
    timestamp: new Date().toLocaleTimeString(),
    images: [...chatImages]
  };
  
  setChatMessages(prev => [...prev, userMessage]);
  setIsLoading(true);
  const currentQuestion = followUpQuestion;
  const currentImages = [...chatImages];
  setFollowUpQuestion("");
  setChatImages([]);

    try {
   // Build conversation history for Claude
  const conversationHistory = chatMessages.map(msg => ({
    role: msg.type === 'user' ? 'user' : 'assistant',
    content: msg.text
  }));

  // Build content array for new message
  const newMessageContent = [{ type: "text", text: currentQuestion }];
  
  // Add chat images to the content
  currentImages.forEach(image => {
    newMessageContent.push(formatImageForClaude(image));
  });

  const requestBody = {
    model: API_CONFIG.MODEL,
    max_tokens: 800,
    temperature: 0.5,
    messages: [
      ...conversationHistory,
      {
        role: "user",
        content: newMessageContent
      }
    ]
  };

  const apiResponse = await makeAPIRequest(
    API_CONFIG.CLAUDE_API_URL,
    { body: requestBody }
  );

  let followUpResponse = "";
  if (apiResponse.content && apiResponse.content.length > 0) {
    followUpResponse = apiResponse.content[0].text;
  } else {
    throw new Error("AI-სგან პასუხი არ მოვიდა");
  }

  setChatMessages(prev => [...prev, {
    type: 'ai',
    text: followUpResponse,
    timestamp: new Date().toLocaleTimeString()
  }]);
  setIsLoading(false);

  setTimeout(scrollToBottom, 100);
} catch (error) {
    console.error('შემდგომი შეკითხვის შეცდომა:', error);
    setChatMessages(prev => [...prev, {
      type: 'ai',
      text: `შეცდომა: ${error.message}`,
      timestamp: new Date().toLocaleTimeString()
    }]);
    setIsLoading(false);
  }
};

  const clearChat = () => {
    setChatMessages([]);
    setShowChat(false);
    setAiResponse("");
    setNewsResponse("");
    setFollowUpQuestion("");
  };

  // === SOFT MEDICAL COLOR PALETTE ===
  const SM = {
    primary:       '#5B9E7B',
    primaryDark:   '#4A8A69',
    primaryLight:  '#7DBF9A',
    primaryXLight: '#EAF5EE',
    bg:            '#F4F9F6',
    card:          '#FFFFFF',
    textDark:      '#2C3E35',
    textMid:       '#5A7066',
    textLight:     '#8FA898',
    border:        '#D0E8DA',
    borderLight:   '#E8F4ED',
    warning:       '#F59E0B',
    warningBg:     '#FEF3C7',
    danger:        '#EF4444',
    dangerBg:      '#FEE2E2',
    shadow:        'rgba(91, 158, 123, 0.12)',
  };

  // Soft Medical button styles
  const buttonStyle = {
    padding: '14px 24px',
    background: `linear-gradient(135deg, ${SM.primary} 0%, ${SM.primaryLight} 100%)`,
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
    margin: '8px 0',
    fontSize: '15px',
    fontWeight: '500',
    width: '100%',
    boxShadow: `0 4px 14px ${SM.shadow}`,
    transition: 'all 0.2s ease',
    letterSpacing: '0.015em'
  };

  // Input styles
  const inputStyle = {
    padding: '11px 14px',
    border: `1.5px solid ${SM.border}`,
    borderRadius: '10px',
    margin: '5px 0',
    fontSize: '15px',
    width: '100%',
    boxSizing: 'border-box',
    backgroundColor: '#FAFCFB',
    color: SM.textDark,
    outline: 'none',
    transition: 'border-color 0.2s ease'
  };

  // Container styles
  const containerStyle = {
    minHeight: "100vh",
    padding: "0",
    fontFamily: '"Inter", "Segoe UI", system-ui, -apple-system, sans-serif',
    position: "relative",
    width: "100%",
    overflow: "auto",
    backgroundColor: SM.bg,
  };

  // Soft background overlay
  const backgroundOverlay = {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    background: `
      radial-gradient(circle at 80% 10%, rgba(125, 191, 154, 0.08) 0%, transparent 45%),
      radial-gradient(circle at 10% 90%, rgba(91, 158, 123, 0.07) 0%, transparent 45%)
    `,
    zIndex: 0,
    pointerEvents: 'none'
  };

  const pageStyle = {
    padding: '36px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    maxWidth: '1400px',
    margin: '0 auto',
    backgroundColor: SM.card,
    borderRadius: '16px',
    boxShadow: `0 4px 24px ${SM.shadow}`,
    border: `1px solid ${SM.borderLight}`,
    position: 'relative',
    zIndex: 1,
    minHeight: '90vh',
    marginTop: '24px',
    marginBottom: '24px'
  };

  const unifiedPageStyle = {
    padding: '20px 40px 40px 40px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    maxWidth: '1400px',
    margin: '0 auto',
    backgroundColor: "transparent",
    borderRadius: '0px',
    boxShadow: 'none',
    backdropFilter: 'none',
    border: "none",
    position: 'relative',
    zIndex: 1,
    minHeight: 'calc(100vh - 40px)',
    marginTop: '0px',
    marginBottom: '20px',
    width: "100%"
  };

  // Dual panel styles
  const dualPanelContainerStyle = {
    display: 'flex',
    gap: '15px',
    marginTop: '15px',
    backgroundColor: "transparent",
  };

  const leftPanelStyle = {
    flex: 1,
    border: '2px solid #4caf50',
    borderRadius: '8px',
    backgroundColor: '#ffffff'
  };

  const rightPanelStyle = {
    flex: 1,
    border: '2px solid #2196f3',
    borderRadius: '8px',
    backgroundColor: '#ffffff'
  };

  const panelHeaderStyle = {
    padding: '10px 15px',
    fontWeight: 'bold',
    fontSize: '16px',
    borderBottom: "1px solid #e2e8f0", // Neutral border
    backgroundColor: "#f8fafc", // Light gray header
    color: "#374151", // Dark gray text
  };

  const panelContentStyle = {
    padding: '15px',
    maxHeight: '400px',
    overflowY: 'auto',
    whiteSpace: 'pre-wrap',
    fontSize: '14px',
    lineHeight: '1.5',
    backgroundColor: "#ffffff", // Pure white content area
    color: "#1f2937", // Dark gray text
  };

  const loadingStyle = {
    textAlign: 'center',
    color: '#666',
    fontStyle: 'italic'
  };

  const messageStyle = {
    margin: '10px 0',
    padding: '8px 12px',
    borderRadius: '8px',
    fontSize: '14px',
    lineHeight: '1.4'
  };

  // Add this function inside your DoctorAssistantApp component (before render functions)
const exportPatientConsultation = (patient) => {
  const genderText = patient.patientGender === 'male' ? 'მამრობითი' : 
                     patient.patientGender === 'female' ? 'მდედრობითი' : 
                     patient.patientGender || 'არ არის მითითებული';
  const exportData = `
კლინიკური კონსულტაციის ანგარიში
შექმნილია: ${patient.timestamp ? new Date(patient.timestamp).toLocaleString('ka-GE') : 'არ არის მითითებული'}
ბოლო შესწორება: ${patient.lastModified}

პაციენტის ინფორმაცია:
სქესი: ${genderText}
ასაკი: ${patient.patientAge}
MRN: ${patient.patientID}
სისწრაფე: ${patient.urgencyLevel === 'emergency' ? 'საგანგებო' : patient.urgencyLevel === 'urgent' ? 'სასწრაფო' : 'რუტინული'}

კლინიკური დოკუმენტაცია:
${patient.symptoms}

AI კონსულტაციის შედეგები:
${patient.aiResponse || 'AI კონსულტაცია ჯერ არ ჩატარებულა'}

ექიმის შენიშვნები:
${patient.notes || 'შენიშვნები არ არის'}

კონსულტაციის ისტორია:
${patient.chatHistory && patient.chatHistory.length > 0 
  ? patient.chatHistory.map(msg => 
      `[${msg.timestamp}] ${msg.type === "user" ? "ექიმი" : "AI"}: ${msg.text}`
    ).join("\n\n")
  : 'კონსულტაციის ისტორია არ არის'
}

---
ეს ანგარიში შექმნილია კლინიკური გადაწყვეტილების მხარდაჭერის სისტემის მიერ
⚠️ მხოლოდ კლინიკური გადაწყვეტილების მხარდაჭერისთვის. გამოიყენეთ პროფესიონალური სამედიცინო განსჯა.
  `.trim();

  const blob = new Blob([exportData], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `konsultacia_${genderText}_${patient.patientAge || 'pacienti'}_${
    new Date().toISOString().split("T")[0]
  }.txt`;
  a.click();
  URL.revokeObjectURL(url);
  
  // Show success message
  alert(`✅ პაციენტის კონსულტაცია წარმატებით ექსპორტირებულია!`);
};

  // Add this render function with your other render functions
const renderDrugInteractions = () => (
  <div style={pageStyle}>
    {/* Header */}
    <div style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: "24px",
      paddingBottom: "16px",
      borderBottom: "1px solid #e2e8f0",
    }}>
      <div>
        <h2 style={{
          color: "#1e293b",
          fontSize: "24px",
          margin: "0 0 4px 0",
          fontWeight: "600",
        }}>
          წამლების ურთიერთქმედების შემოწმება
        </h2>
        <p style={{
          color: "#64748b",
          fontSize: "14px",
          margin: 0,
        }}>
          AI-ზე დაფუძნებული ფარმაცევტული ურთიერთქმედების ანალიზი
        </p>
      </div>
      <button
        style={{
          padding: "8px 16px",
          backgroundColor: SM.primaryXLight,
          color: SM.primary,
          border: `1.5px solid ${SM.border}`,
          borderRadius: "6px",
          cursor: "pointer",
          fontSize: "14px",
          fontWeight: "500",
          display: "flex",
          alignItems: "center",
          gap: "6px",
          transition: "all 0.2s ease",
        }}
        onClick={() => setPage("home")}
        onMouseEnter={(e) => {
          e.target.style.backgroundColor = "#e2e8f0";
          e.target.style.borderColor = "#cbd5e1";
        }}
        onMouseLeave={(e) => {
          e.target.style.backgroundColor = "#f1f5f9";
          e.target.style.borderColor = "#e2e8f0";
        }}
      >
        ← მთავარი გვერდი
      </button>
    </div>

    {/* Main Layout */}
    <div style={{ display: "flex", gap: "24px" }}>
      
      {/* Left Panel - Add Drugs */}
      <div style={{ flex: "0 0 400px" }}>
        <div style={{
          backgroundColor: "#ffffff",
          border: `1.5px solid ${SM.border}`,
          borderRadius: "8px",
          padding: "24px",
          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
          marginBottom: "20px"
        }}>
          <h3 style={{ color: "#374151", margin: "0 0 20px 0", fontSize: "18px", fontWeight: "600" }}>
            წამლების დამატება
          </h3>

          <div style={{ marginBottom: "16px" }}>
            <label style={{ fontSize: "14px", fontWeight: "500", color: "#374151", display: "block", marginBottom: "4px" }}>
              წამლის სახელი *
            </label>
            <input
              style={inputStyle}
              placeholder="მაგ: ასპირინი, პარაცეტამოლი"
              value={newDrug.name}
              onChange={(e) => setNewDrug({...newDrug, name: e.target.value})}
            />
          </div>

          <div style={{ marginBottom: "16px" }}>
            <label style={{ fontSize: "14px", fontWeight: "500", color: "#374151", display: "block", marginBottom: "4px" }}>
              დოზა
            </label>
            <input
              style={inputStyle}
              placeholder="მაგ: 500mg, 10ml"
              value={newDrug.dosage}
              onChange={(e) => setNewDrug({...newDrug, dosage: e.target.value})}
            />
          </div>

          <div style={{ display: "flex", gap: "12px", marginBottom: "16px" }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: "14px", fontWeight: "500", color: "#374151", display: "block", marginBottom: "4px" }}>
                სიხშირე
              </label>
              <input
                style={inputStyle}
                placeholder="მაგ: დღეში 3-ჯერ"
                value={newDrug.frequency}
                onChange={(e) => setNewDrug({...newDrug, frequency: e.target.value})}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: "14px", fontWeight: "500", color: "#374151", display: "block", marginBottom: "4px" }}>
                მიღების გზა
              </label>
              <select
                style={inputStyle}
                value={newDrug.route}
                onChange={(e) => setNewDrug({...newDrug, route: e.target.value})}
              >
                <option value="oral">ორალურად</option>
                <option value="iv">ვენაში</option>
                <option value="im">კუნთში</option>
                <option value="topical">ზედაპირულად</option>
                <option value="sublingual">ენქვეშ</option>
                <option value="inhalation">ინჰალაცია</option>
              </select>
            </div>
          </div>

          <button
            style={{
              width: "100%",
              padding: "12px 20px",
              backgroundColor: "#6b7280",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "500",
              marginBottom: "16px",
              transition: "background-color 0.2s ease"
            }}
            onClick={addDrugToList}
            onMouseEnter={(e) => e.target.style.backgroundColor = "#9ca3af"}
            onMouseLeave={(e) => e.target.style.backgroundColor = "#6b7280"}
          >
            + დამატება სიაში
          </button>
        </div>

        {/* Current Drug List */}
        <div style={{
          backgroundColor: "#ffffff",
          border: `1.5px solid ${SM.border}`,
          borderRadius: "8px",
          overflow: "hidden",
          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)"
        }}>
          <div style={{
            padding: "16px 20px",
            borderBottom: "1px solid #e2e8f0",
            backgroundColor: "#f8fafc",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}>
            <h4 style={{ color: "#374151", margin: "0", fontSize: "16px", fontWeight: "600" }}>
              არჩეული წამლები ({drugList.length})
            </h4>
            {drugList.length > 0 && (
              <button
                style={{
                  padding: "4px 8px",
                  backgroundColor: "#ef4444",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  fontSize: "12px",
                  cursor: "pointer",
                }}
                onClick={clearDrugList}
              >
                ყველას წაშლა
              </button>
            )}
          </div>

          <div style={{ maxHeight: "300px", overflowY: "auto" }}>
            {drugList.length === 0 ? (
              <div style={{
                padding: "40px 20px",
                textAlign: "center",
                color: "#6b7280"
              }}>
                <div style={{ fontSize: "48px", marginBottom: "16px" }}>💊</div>
                <p style={{ margin: "0", fontSize: "14px" }}>
                  დაამატეთ წამლები ურთიერთქმედების შესამოწმებლად
                </p>
              </div>
            ) : (
              drugList.map((drug, index) => (
                <div
                  key={drug.id}
                  style={{
                    padding: "16px 20px",
                    borderBottom: index < drugList.length - 1 ? "1px solid #f1f5f9" : "none",
                    transition: "background-color 0.2s ease"
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#f8fafc"}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ flex: 1 }}>
                      <h5 style={{ margin: "0 0 4px 0", fontSize: "15px", fontWeight: "600", color: "#1e293b" }}>
                        {drug.name}
                      </h5>
                      <div style={{ fontSize: "13px", color: "#64748b", lineHeight: "1.4" }}>
                        {drug.dosage && <div>დოზა: {drug.dosage}</div>}
                        {drug.frequency && <div>სიხშირე: {drug.frequency}</div>}
                        <div>გზა: {drug.route === 'oral' ? 'ორალურად' : drug.route === 'iv' ? 'ვენაში' : drug.route === 'im' ? 'კუნთში' : drug.route}</div>
                        <div style={{ color: "#9ca3af", fontSize: "11px", marginTop: "4px" }}>
                          დამატებულია: {drug.addedTime}
                        </div>
                      </div>
                    </div>
                    <button
                      style={{
                        padding: "4px 8px",
                        backgroundColor: "#ef4444",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        fontSize: "11px",
                        cursor: "pointer",
                        marginLeft: "12px"
                      }}
                      onClick={() => removeDrugFromList(drug.id)}
                    >
                      წაშლა
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {drugList.length >= 2 && (
            <div style={{ padding: "16px 20px", borderTop: "1px solid #e2e8f0", backgroundColor: "#f8fafc" }}>
              <button
                style={{
                  width: "100%",
                  padding: "12px 20px",
                  backgroundColor: isDrugAnalysisLoading ? "#d1d5db" : "#1e293b",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  cursor: isDrugAnalysisLoading ? "not-allowed" : "pointer",
                  fontSize: "14px",
                  fontWeight: "600",
                  transition: "background-color 0.2s ease"
                }}
                onClick={analyzeDrugInteractions}
                disabled={isDrugAnalysisLoading}
                onMouseEnter={(e) => !isDrugAnalysisLoading && (e.target.style.backgroundColor = "#334155")}
                onMouseLeave={(e) => !isDrugAnalysisLoading && (e.target.style.backgroundColor = "#1e293b")}
              >
                {isDrugAnalysisLoading ? "🔄 ანალიზი მიმდინარეობს..." : "🔍 ურთიერთქმედების ანალიზი"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Right Panel - Analysis Results */}
      <div style={{ flex: 1 }}>
        <div style={{
          backgroundColor: "#ffffff",
          border: `1.5px solid ${SM.border}`,
          borderRadius: "8px",
          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
          height: "700px",
          display: "flex",
          flexDirection: "column"
        }}>
          <div style={{
            padding: "20px 24px",
            borderBottom: "1px solid #e2e8f0",
            backgroundColor: "#f8fafc"
          }}>
            <h3 style={{ color: "#374151", margin: "0", fontSize: "18px", fontWeight: "600" }}>
              AI ანალიზის შედეგები
            </h3>
          </div>

          <div style={{
            flex: 1,
            overflowY: "auto",
            padding: "24px"
          }}>
            {isDrugAnalysisLoading ? (
              <div style={{ textAlign: "center", color: "#6b7280", marginTop: "50px" }}>
                <div style={{ fontSize: "48px", marginBottom: "16px" }}>⚗️</div>
                <h4 style={{ margin: "0 0 8px 0", fontSize: "16px", fontWeight: "500" }}>
                  ურთიერთქმედების ანალიზი მიმდინარეობს...
                </h4>
                <p style={{ margin: "0", fontSize: "14px" }}>
                  AI შეისწავლის წამლების ფარმაკოლოგიურ თვისებებს
                </p>
              </div>
            ) : drugInteractionResult ? (
              <div style={{ 
                lineHeight: "1.6", 
                color: "#1f2937",
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif'
              }}>
                {formatResearchText(drugInteractionResult)}
              </div>
            ) : drugList.length === 0 ? (
              <div style={{ textAlign: "center", color: "#6b7280", marginTop: "50px" }}>
                <div style={{ fontSize: "48px", marginBottom: "16px" }}>🏥</div>
                <h4 style={{ margin: "0 0 8px 0", fontSize: "16px", fontWeight: "500" }}>
                  წამლების ურთიერთქმედების შემოწმება
                </h4>
                <p style={{ margin: "0", fontSize: "14px", maxWidth: "300px", margin: "0 auto" }}>
                  დაამატეთ მინიმუმ 2 წამალი AI-ზე დაფუძნებული ურთიერთქმედების ანალიზისთვის
                </p>
              </div>
            ) : drugList.length === 1 ? (
              <div style={{ textAlign: "center", color: "#6b7280", marginTop: "50px" }}>
                <div style={{ fontSize: "48px", marginBottom: "16px" }}>💊</div>
                <h4 style={{ margin: "0 0 8px 0", fontSize: "16px", fontWeight: "500" }}>
                  დაამატეთ კიდევ ერთი წამალი
                </h4>
                <p style={{ margin: "0", fontSize: "14px" }}>
                  ურთიერთქმედების შესამოწმებლად საჭიროა მინიმუმ 2 წამალი
                </p>
              </div>
            ) : (
              <div style={{ textAlign: "center", color: "#6b7280", marginTop: "50px" }}>
                <div style={{ fontSize: "48px", marginBottom: "16px" }}>🔬</div>
                <h4 style={{ margin: "0 0 8px 0", fontSize: "16px", fontWeight: "500" }}>
                  მზად ანალიზისთვის
                </h4>
                <p style={{ margin: "0", fontSize: "14px" }}>
                  დააწკაპუნეთ "ურთიერთქმედების ანალიზი" ღილაკზე
                </p>
              </div>
            )}
          </div>

          {/* Analysis Footer */}
          {drugInteractionResult && (
            <div style={{
              padding: "16px 24px",
              borderTop: "1px solid #e2e8f0",
              backgroundColor: "#fef7ed"
            }}>
              <div style={{ fontSize: "12px", color: "#92400e", lineHeight: "1.4" }}>
                ⚠️ <strong>მნიშვნელოვანი:</strong> ეს ანალიზი მხოლოდ საინფორმაციო მიზნებისთვისაა და არ ანაცვლებს 
                პროფესიონალურ ფარმაცევტულ კონსულტაციას. ყოველთვის გაითვალისწინეთ პაციენტის ინდივიდუალური მდგომარეობა.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  </div>
);
  // Render functions will continue from here...
  const renderHome = () => (
  <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>

    {/* Header */}
    <div style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "18px 48px",
      backgroundColor: "#FFFFFF",
      borderBottom: `1px solid ${SM.border}`,
      boxShadow: `0 2px 12px ${SM.shadow}`,
      position: "relative",
      zIndex: 10,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <div style={{
          width: "36px", height: "36px",
          backgroundColor: SM.primaryXLight,
          borderRadius: "10px",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "18px"
        }}>🌿</div>
        <div>
          <div style={{ fontSize: "17px", fontWeight: "700", color: SM.textDark, letterSpacing: "-0.02em" }}>
            MediAssist AI
          </div>
          <div style={{ fontSize: "11px", color: SM.textLight, marginTop: "1px" }}>
            კლინიკური გადაწყვეტილების მხარდაჭერა
          </div>
        </div>
      </div>
      <button style={{
        padding: "9px 18px",
        backgroundColor: SM.primaryXLight,
        color: SM.primary,
        border: `1.5px solid ${SM.border}`,
        borderRadius: "10px",
        fontSize: "13px",
        fontWeight: "600",
        cursor: "pointer",
        transition: "all 0.2s ease",
      }}
        onMouseEnter={(e) => { e.target.style.backgroundColor = SM.border; }}
        onMouseLeave={(e) => { e.target.style.backgroundColor = SM.primaryXLight; }}
      >
        დაკავშირება ადმინისტრაციასთან
      </button>
    </div>

    {/* Hero */}
    <div style={{
      flex: 1,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      padding: "72px 48px 48px",
      textAlign: "center",
      maxWidth: "1100px",
      margin: "0 auto",
      width: "100%",
    }}>

      {/* Badge */}
      <div style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "8px",
        backgroundColor: SM.primaryXLight,
        border: `1px solid ${SM.border}`,
        borderRadius: "20px",
        padding: "6px 16px",
        fontSize: "13px",
        fontWeight: "600",
        color: SM.primary,
        marginBottom: "28px",
      }}>
        <span>🩺</span> ჯანდაცვის პროფესიონალებისთვის
      </div>

      <h1 style={{
        fontSize: "46px",
        fontWeight: "800",
        color: SM.textDark,
        marginBottom: "20px",
        letterSpacing: "-0.04em",
        lineHeight: "1.15",
        maxWidth: "720px",
      }}>
        AI-ზე დაფუძნებული<br />
        <span style={{ color: SM.primary }}>სამედიცინო ასისტენტი</span>
      </h1>

      <p style={{
        fontSize: "18px",
        color: SM.textMid,
        marginBottom: "48px",
        lineHeight: "1.65",
        maxWidth: "580px",
      }}>
        თანამედროვე კლინიკური კონსულტაციის პლატფორმა — სწრაფი დიაგნოსტიკა,
        AI ანალიზი და მტკიცებულებებზე დაფუძნებული რეკომენდაციები.
      </p>

      {/* Primary CTA */}
      <button style={{
        padding: "16px 40px",
        background: `linear-gradient(135deg, ${SM.primary} 0%, ${SM.primaryLight} 100%)`,
        color: "white",
        border: "none",
        borderRadius: "12px",
        fontSize: "16px",
        fontWeight: "700",
        cursor: "pointer",
        boxShadow: `0 6px 20px ${SM.shadow}`,
        transition: "all 0.2s ease",
        marginBottom: "48px",
        letterSpacing: "0.01em",
      }}
        onClick={() => setPage("createHistory")}
        onMouseEnter={(e) => { e.target.style.transform = "translateY(-2px)"; e.target.style.boxShadow = `0 10px 28px ${SM.shadow}`; }}
        onMouseLeave={(e) => { e.target.style.transform = "translateY(0)"; e.target.style.boxShadow = `0 6px 20px ${SM.shadow}`; }}
      >
        AI კონსულტაციის დაწყება →
      </button>

      {/* Nav Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", width: "100%", marginBottom: "56px" }}>
        {[
          { icon: "👤", label: "ექიმის პროფილი", sub: "პირადი მონაცემები", page: "profile" },
          { icon: "📋", label: "სამედიცინო ჩანაწერები", sub: "პაციენტების ბაზა", page: "history" },
          { icon: "💊", label: "წამლების ურთიერთქმედება", sub: "AI ფარმაკო ანალიზი", page: "drugInteractions" },
          { icon: "✉️", label: "კორესპონდენცია", sub: "სამედიცინო მიმართვები", page: "correspondence" },
        ].map((item) => (
          <button key={item.page}
            style={{
              padding: "20px 16px",
              backgroundColor: "#FFFFFF",
              border: `1.5px solid ${SM.border}`,
              borderRadius: "14px",
              cursor: "pointer",
              textAlign: "left",
              transition: "all 0.2s ease",
              boxShadow: `0 2px 8px ${SM.shadow}`,
            }}
            onClick={() => item.page === "drugInteractions" ? checkDrugInteractions() : setPage(item.page)}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = SM.primary;
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = `0 8px 20px ${SM.shadow}`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = SM.border;
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = `0 2px 8px ${SM.shadow}`;
            }}
          >
            <div style={{ fontSize: "26px", marginBottom: "10px" }}>{item.icon}</div>
            <div style={{ fontSize: "14px", fontWeight: "700", color: SM.textDark, marginBottom: "4px" }}>{item.label}</div>
            <div style={{ fontSize: "12px", color: SM.textLight }}>{item.sub}</div>
          </button>
        ))}
      </div>

      {/* Features */}
      <div style={{
        backgroundColor: "#FFFFFF",
        borderRadius: "16px",
        padding: "40px",
        border: `1px solid ${SM.border}`,
        width: "100%",
        boxShadow: `0 4px 16px ${SM.shadow}`,
        marginBottom: "32px",
      }}>
        <h2 style={{ fontSize: "22px", fontWeight: "700", color: SM.textDark, marginBottom: "28px", textAlign: "left" }}>
          პლატფორმის ძირითადი ფუნქციები
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "24px", textAlign: "left" }}>
          {[
            { icon: "🤖", title: "AI კონსულტაცია", desc: "Claude AI-ზე დაფუძნებული დიაგნოსტიკური ანალიზი და სამედიცინო რეკომენდაციები" },
            { icon: "🔒", title: "უსაფრთხო მონაცემები", desc: "HIPAA შესაბამისი დაცვა პაციენტების კონფიდენციალური ინფორმაციისთვის" },
            { icon: "⚡", title: "რეალურ დროში", desc: "მყისიერი AI პასუხები კლინიკური მონაცემების ანალიზისთვის" },
            { icon: "📚", title: "სამეცნიერო კვლევა", desc: "ინტეგრაცია PubMed, NEJM და სხვა სამეცნიერო ბაზებთან" },
          ].map((f, i) => (
            <div key={i} style={{ display: "flex", gap: "14px", alignItems: "flex-start" }}>
              <div style={{
                width: "40px", height: "40px", minWidth: "40px",
                backgroundColor: SM.primaryXLight,
                borderRadius: "10px",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "18px"
              }}>{f.icon}</div>
              <div>
                <div style={{ fontSize: "14px", fontWeight: "700", color: SM.textDark, marginBottom: "4px" }}>{f.title}</div>
                <div style={{ fontSize: "13px", color: SM.textMid, lineHeight: "1.5" }}>{f.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Trust badges */}
      <div style={{
        display: "flex", gap: "24px", flexWrap: "wrap", justifyContent: "center",
        color: SM.textLight, fontSize: "13px", fontWeight: "500"
      }}>
        {["✅ HIPAA შესაბამისი", "🧬 მტკიცებულებებზე დაფუძნებული", "🌿 სერტიფიცირებული", "⚡ რეალურ დროში AI"].map(b => (
          <span key={b} style={{
            padding: "6px 14px",
            backgroundColor: "#FFFFFF",
            border: `1px solid ${SM.border}`,
            borderRadius: "20px",
          }}>{b}</span>
        ))}
      </div>
    </div>

    {/* Footer */}
    <div style={{
      borderTop: `1px solid ${SM.border}`,
      padding: "20px 48px",
      textAlign: "center",
      backgroundColor: "#FFFFFF",
    }}>
      <p style={{ fontSize: "12px", color: SM.textLight, margin: "0" }}>
        ⚠️ მხოლოდ კლინიკური გადაწყვეტილების მხარდაჭერისთვის. ყოველთვის გამოიყენეთ პროფესიონალური სამედიცინო განსჯა.
      </p>
    </div>
  </div>
);

  const renderProfile = () => (

    <div style={pageStyle}>
    <div style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: "24px",
      paddingBottom: "16px",
      borderBottom: `1px solid ${SM.border}`,
    }}>
      <h2 style={{ color: SM.textDark, margin: "0", fontSize: "24px", fontWeight: "700" }}>👤 ექიმის პროფილი</h2>
      <button
        style={{
          padding: "9px 18px",
          backgroundColor: SM.primaryXLight,
          color: SM.primary,
          border: `1.5px solid ${SM.border}`,
          borderRadius: "10px",
          cursor: "pointer",
          fontSize: "14px",
          fontWeight: "600",
          transition: "all 0.2s ease",
        }}
        onClick={() => setPage("home")}
        onMouseEnter={(e) => { e.target.style.backgroundColor = SM.border; }}
        onMouseLeave={(e) => { e.target.style.backgroundColor = SM.primaryXLight; }}
      >
        ← მთავარი გვერდი
      </button>
    </div>
      <input 
        style={inputStyle} 
        placeholder="სახელი" 
        value={profile.name} 
        onChange={e => handleProfileChange("name", e.target.value)} 
      />
      <input 
        style={inputStyle} 
        placeholder="გვარი" 
        value={profile.surname} 
        onChange={e => handleProfileChange("surname", e.target.value)} 
      />
      <input 
        style={inputStyle} 
        placeholder="ასაკი" 
        value={profile.age} 
        onChange={e => handleProfileChange("age", e.target.value)} 
      />
      <input 
        style={inputStyle} 
        placeholder="სამედიცინო სპეციალობა" 
        value={profile.field} 
        onChange={e => handleProfileChange("field", e.target.value)} 
      />
      <input 
        style={inputStyle} 
        placeholder="ელ-ფოსტა" 
        value={profile.email} 
        onChange={e => handleProfileChange("email", e.target.value)} 
      />
      <textarea 
        style={{...inputStyle, minHeight: '100px'}} 
        placeholder="პროფესიონალური რეზიუმე" 
        value={profile.summary} 
        onChange={e => handleProfileChange("summary", e.target.value)} 
      />
      <button style={buttonStyle} onClick={() => setPage("home")}>
        ← უკან მთავარ გვერდზე
      </button>
    </div>
  );

  const renderCorrespondence = () => {
  // Helper functions for correspondence management
  const saveCorrespondence = () => {
    if (!newCorrespondence.patientName || !newCorrespondence.content || !newCorrespondence.subject) {
      alert("გთხოვთ შეავსოთ ყველა სავალდებულო ველი.");
      return;
    }

    const correspondence = {
      id: Date.now().toString(),
      ...newCorrespondence,
      createdDate: new Date().toLocaleDateString('ka-GE'),
      createdTime: new Date().toLocaleTimeString('ka-GE'),
      status: "გაგზავნილი"
    };

    setCorrespondences([correspondence, ...correspondences]);
    
    // Reset form
    setNewCorrespondence({
      patientName: "",
      patientID: "",
      recipientName: "",
      recipientType: "doctor",
      subject: "",
      content: "",
      correspondenceType: "referral",
      urgency: "routine"
    });
    
    alert("კორესპონდენცია წარმატებით შეინახა!");
  };

  const deleteCorrespondence = (id) => {
    if (window.confirm("დარწმუნებული ხართ რომ გსურთ ამ კორესპონდენციის წაშლა?")) {
      setCorrespondences(correspondences.filter(c => c.id !== id));
    }
  };

  const exportCorrespondence = (correspondence) => {
    const exportData = `
სამედიცინო კორესპონდენცია
შექმნილია: ${correspondence.createdDate} ${correspondence.createdTime}

პაციენტის ინფორმაცია:
სახელი: ${correspondence.patientName}
პაციენტის ID: ${correspondence.patientID}

მიმღები:
სახელი: ${correspondence.recipientName}
ტიპი: ${correspondence.recipientType === 'doctor' ? 'ექიმი' : correspondence.recipientType === 'patient' ? 'პაციენტი' : correspondence.recipientType === 'hospital' ? 'ჰოსპიტალი' : 'დაზღვევა'}

კორესპონდენციის დეტალები:
თემა: ${correspondence.subject}
ტიპი: ${correspondence.correspondenceType === 'referral' ? 'მიმართვა' : correspondence.correspondenceType === 'report' ? 'ანგარიში' : correspondence.correspondenceType === 'consultation' ? 'კონსულტაცია' : 'გაწერა'}
სისწრაფე: ${correspondence.urgency === 'routine' ? 'რუტინული' : correspondence.urgency === 'urgent' ? 'სასწრაფო' : 'საგანგებო'}

შინაარსი:
${correspondence.content}

---
სამედიცინო კორესპონდენციის სისტემა
    `.trim();

    const blob = new Blob([exportData], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `korespondencia_${correspondence.patientName}_${correspondence.createdDate}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={pageStyle}>
      {/* Header */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "24px",
        paddingBottom: "16px",
        borderBottom: "1px solid #e2e8f0",
      }}>
        <div>
          <h2 style={{
            color: "#1e293b",
            fontSize: "24px",
            margin: "0 0 4px 0",
            fontWeight: "600",
          }}>
            სამედიცინო კორესპონდენცია
          </h2>
          <p style={{
            color: "#64748b",
            fontSize: "14px",
            margin: 0,
          }}>
            {correspondences.length} კორესპონდენცია • პროფესიონალური სამედიცინო კომუნიკაცია
          </p>
        </div>
        <button
          style={{
            padding: "8px 16px",
            backgroundColor: SM.primaryXLight,
            color: SM.primary,
            border: `1.5px solid ${SM.border}`,
            borderRadius: "6px",
            cursor: "pointer",
            fontSize: "14px",
            fontWeight: "500",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            transition: "all 0.2s ease",
          }}
          onClick={() => setPage("home")}
          onMouseEnter={(e) => {
            e.target.style.backgroundColor = "#e2e8f0";
            e.target.style.borderColor = "#cbd5e1";
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = "#f1f5f9";
            e.target.style.borderColor = "#e2e8f0";
          }}
        >
          ← მთავარი გვერდი
        </button>
      </div>

      {/* Two-column layout */}
      <div style={{ display: "flex", gap: "24px" }}>
        
        {/* Left side - New Correspondence Form */}
        <div style={{ flex: "0 0 500px" }}>
          <div style={{
            backgroundColor: "#ffffff",
            border: `1.5px solid ${SM.border}`,
            borderRadius: "8px",
            padding: "24px",
            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)"
          }}>
            <h3 style={{ color: "#374151", margin: "0 0 20px 0", fontSize: "18px", fontWeight: "600" }}>
              ახალი კორესპონდენცია
            </h3>

            {/* Patient Information */}
            <div style={{ marginBottom: "16px" }}>
              <label style={{ fontSize: "14px", fontWeight: "500", color: "#374151", display: "block", marginBottom: "4px" }}>
                პაციენტის სქესი *
              </label>
              <input
                style={inputStyle}
                placeholder="შეიყვანეთ პაციენტის სქესი"
                value={newCorrespondence.patientGender}
                onChange={(e) => setNewCorrespondence({...newCorrespondence, patientGender: e.target.value})}
              />
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label style={{ fontSize: "14px", fontWeight: "500", color: "#374151", display: "block", marginBottom: "4px" }}>
                პაციენტის ID/MRN
              </label>
              <input
                style={inputStyle}
                placeholder="შეიყვანეთ პაციენტის ID"
                value={newCorrespondence.patientID}
                onChange={(e) => setNewCorrespondence({...newCorrespondence, patientID: e.target.value})}
              />
            </div>

            {/* Recipient Information */}
            <div style={{ marginBottom: "16px" }}>
              <label style={{ fontSize: "14px", fontWeight: "500", color: "#374151", display: "block", marginBottom: "4px" }}>
                მიმღები *
              </label>
              <input
                style={inputStyle}
                placeholder="მიმღების სახელი"
                value={newCorrespondence.recipientName}
                onChange={(e) => setNewCorrespondence({...newCorrespondence, recipientName: e.target.value})}
              />
            </div>

            <div style={{ display: "flex", gap: "12px", marginBottom: "16px" }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: "14px", fontWeight: "500", color: "#374151", display: "block", marginBottom: "4px" }}>
                  მიმღების ტიპი
                </label>
                <select
                  style={inputStyle}
                  value={newCorrespondence.recipientType}
                  onChange={(e) => setNewCorrespondence({...newCorrespondence, recipientType: e.target.value})}
                >
                  <option value="doctor">ექიმი</option>
                  <option value="patient">პაციენტი</option>
                  <option value="hospital">ჰოსპიტალი</option>
                  <option value="insurance">დაზღვევა</option>
                </select>
              </div>

              <div style={{ flex: 1 }}>
                <label style={{ fontSize: "14px", fontWeight: "500", color: "#374151", display: "block", marginBottom: "4px" }}>
                  კორესპონდენციის ტიპი
                </label>
                <select
                  style={inputStyle}
                  value={newCorrespondence.correspondenceType}
                  onChange={(e) => setNewCorrespondence({...newCorrespondence, correspondenceType: e.target.value})}
                >
                  <option value="referral">მიმართვა</option>
                  <option value="report">ანგარიში</option>
                  <option value="consultation">კონსულტაცია</option>
                  <option value="discharge">გაწერა</option>
                </select>
              </div>
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label style={{ fontSize: "14px", fontWeight: "500", color: "#374151", display: "block", marginBottom: "4px" }}>
                სისწრაფე
              </label>
              <select
                style={inputStyle}
                value={newCorrespondence.urgency}
                onChange={(e) => setNewCorrespondence({...newCorrespondence, urgency: e.target.value})}
              >
                <option value="routine">რუტინული</option>
                <option value="urgent">სასწრაფო</option>
                <option value="emergency">საგანგებო</option>
              </select>
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label style={{ fontSize: "14px", fontWeight: "500", color: "#374151", display: "block", marginBottom: "4px" }}>
                თემა *
              </label>
              <input
                style={inputStyle}
                placeholder="კორესპონდენციის თემა"
                value={newCorrespondence.subject}
                onChange={(e) => setNewCorrespondence({...newCorrespondence, subject: e.target.value})}
              />
            </div>

            <div style={{ marginBottom: "20px" }}>
              <label style={{ fontSize: "14px", fontWeight: "500", color: "#374151", display: "block", marginBottom: "4px" }}>
                შინაარსი *
              </label>
              <textarea
                style={{...inputStyle, minHeight: "150px", resize: "vertical"}}
                placeholder="კორესპონდენციის დეტალური შინაარსი..."
                value={newCorrespondence.content}
                onChange={(e) => setNewCorrespondence({...newCorrespondence, content: e.target.value})}
              />
            </div>

            <button
              style={{
                width: "100%",
                padding: "12px 20px",
                backgroundColor: "#6b7280",
                color: "white",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: "500",
                transition: "background-color 0.2s ease"
              }}
              onClick={saveCorrespondence}
              onMouseEnter={(e) => e.target.style.backgroundColor = "#9ca3af"}
              onMouseLeave={(e) => e.target.style.backgroundColor = "#6b7280"}
            >
              კორესპონდენციის შენახვა
            </button>
          </div>
        </div>

        {/* Right side - Correspondence History */}
        <div style={{ flex: 1 }}>
          <div style={{
            backgroundColor: "#ffffff",
            border: `1.5px solid ${SM.border}`,
            borderRadius: "8px",
            overflow: "hidden",
            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)"
          }}>
            <div style={{
              padding: "20px 24px",
              borderBottom: "1px solid #e2e8f0",
              backgroundColor: "#f8fafc"
            }}>
              <h3 style={{ color: "#374151", margin: "0", fontSize: "18px", fontWeight: "600" }}>
                კორესპონდენციის ისტორია
              </h3>
            </div>

            <div style={{ maxHeight: "600px", overflowY: "auto" }}>
              {correspondences.length === 0 ? (
                <div style={{
                  padding: "40px 24px",
                  textAlign: "center",
                  color: "#6b7280"
                }}>
                  <div style={{ fontSize: "48px", marginBottom: "16px" }}>📋</div>
                  <h4 style={{ margin: "0 0 8px 0", fontSize: "16px", fontWeight: "500" }}>
                    კორესპონდენცია ვერ მოიძებნა
                  </h4>
                  <p style={{ margin: "0", fontSize: "14px" }}>
                    შექმენით თქვენი პირველი სამედიცინო კორესპონდენცია.
                  </p>
                </div>
              ) : (
                correspondences.map((correspondence) => (
                  <div
                    key={correspondence.id}
                    style={{
                      padding: "20px 24px",
                      borderBottom: "1px solid #f1f5f9",
                      transition: "background-color 0.2s ease"
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#f8fafc"}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                      <div>
                        <h4 style={{ margin: "0 0 4px 0", fontSize: "16px", fontWeight: "600", color: "#1e293b" }}>
                          {correspondence.subject}
                        </h4>
                        <p style={{ margin: "0", fontSize: "14px", color: "#64748b" }}>
                          პაციენტი: {correspondence.patientName} → {correspondence.recipientName}
                        </p>
                      </div>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <button
                          style={{
                            padding: "4px 8px",
                            backgroundColor: "#3b82f6",
                            color: "white",
                            border: "none",
                            borderRadius: "4px",
                            fontSize: "12px",
                            cursor: "pointer",
                          }}
                          onClick={() => exportCorrespondence(correspondence)}
                        >
                          ექსპორტი
                        </button>
                        <button
                          style={{
                            padding: "4px 8px",
                            backgroundColor: "#ef4444",
                            color: "white",
                            border: "none",
                            borderRadius: "4px",
                            fontSize: "12px",
                            cursor: "pointer",
                          }}
                          onClick={() => deleteCorrespondence(correspondence.id)}
                        >
                          წაშლა
                        </button>
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: "12px", marginBottom: "8px", fontSize: "12px" }}>
                      <span style={{
                        padding: "2px 6px",
                        borderRadius: "4px",
                        backgroundColor: correspondence.correspondenceType === 'referral' ? '#dbeafe' : correspondence.correspondenceType === 'report' ? '#dcfce7' : correspondence.correspondenceType === 'consultation' ? '#fef3c7' : '#f3e8ff',
                        color: correspondence.correspondenceType === 'referral' ? '#1e40af' : correspondence.correspondenceType === 'report' ? '#166534' : correspondence.correspondenceType === 'consultation' ? '#92400e' : '#6b21a8',
                        fontWeight: "500"
                      }}>
                        {correspondence.correspondenceType === 'referral' ? 'მიმართვა' : correspondence.correspondenceType === 'report' ? 'ანგარიში' : correspondence.correspondenceType === 'consultation' ? 'კონსულტაცია' : 'გაწერა'}
                      </span>
                      <span style={{
                        padding: "2px 6px",
                        borderRadius: "4px",
                        backgroundColor: correspondence.urgency === 'routine' ? '#f0fdf4' : correspondence.urgency === 'urgent' ? '#fef7ed' : '#fef2f2',
                        color: correspondence.urgency === 'routine' ? '#166534' : correspondence.urgency === 'urgent' ? '#ea580c' : '#dc2626',
                        fontWeight: "500"
                      }}>
                        {correspondence.urgency === 'routine' ? 'რუტინული' : correspondence.urgency === 'urgent' ? 'სასწრაფო' : 'საგანგებო'}
                      </span>
                    </div>

                    <p style={{ margin: "0 0 8px 0", fontSize: "14px", color: "#374151", lineHeight: "1.4" }}>
                      {correspondence.content.length > 150 ? correspondence.content.substring(0, 150) + "..." : correspondence.content}
                    </p>

                    <div style={{ fontSize: "12px", color: "#9ca3af" }}>
                      {correspondence.createdDate} {correspondence.createdTime}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};




  const renderHistory = () => (
    <div style={pageStyle}>
      {/* Professional Header with Navigation */}
      {/* Professional Header with Navigation - REPLACE existing header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "24px",
          paddingBottom: "16px",
          borderBottom: "1px solid #e2e8f0",
        }}
      >
        <div>
          <h2
            style={{
              color: "#1e293b",
              fontSize: "24px",
              margin: "0 0 4px 0",
              fontWeight: "600",
            }}
          >
            პაციენტების სამედიცინო ჩანაწერები
          </h2>
          <p
            style={{
              color: "#64748b",
              fontSize: "14px",
              margin: 0,
            }}
          >
            {savedPatients.length} პაციენტი • AI-ზე დაფუძნებული კლინიკური
            გადაწყვეტილების მხარდაჭერა
          </p>
        </div>
        <div style={{ display: "flex", gap: "12px" }}>
          <button
            style={{
              padding: "8px 16px",
              backgroundColor: SM.primaryXLight,
              color: SM.primary,
              border: `1.5px solid ${SM.border}`,
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "500",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              transition: "all 0.2s ease",
            }}
            onClick={() => setPage("home")}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = "#e2e8f0";
              e.target.style.borderColor = "#cbd5e1";
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = "#f1f5f9";
              e.target.style.borderColor = "#e2e8f0";
            }}
          >
            ← მთავარი გვერდი
          </button>
        </div>
      </div>

      {/* Enhanced Action Bar */}
      <div style={{
        display: 'flex',
        gap: '12px',
        marginBottom: '24px',
        padding: '16px',
        backgroundColor: '#f8fafc',
        borderRadius: '8px',
        border: '1px solid #e2e8f0'
      }}>
        <button 
          style={{
            padding: '10px 20px',
            background: `linear-gradient(135deg, ${SM.primary} 0%, ${SM.primaryLight} 100%)`,
            color: 'white',
            border: 'none',
            borderRadius: '10px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: `0 2px 8px ${SM.shadow}`,
            transition: 'all 0.2s ease'
          }}
          onClick={() => setPage("createHistory")}
          onMouseEnter={(e) => {
            e.target.style.transform = 'translateY(-1px)';
            e.target.style.boxShadow = '0 4px 12px rgba(30, 64, 175, 0.3)';
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = 'translateY(0px)';
            e.target.style.boxShadow = '0 2px 8px rgba(30, 64, 175, 0.2)';
          }}
        >
          + ახალი პაციენტის ჩანაწერი
        </button>

        <div style={{flex: 1, display: 'flex', gap: '8px'}}>
          <input 
            style={{
              flex: 1,
              padding: '10px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px',
              backgroundColor: 'white'
            }} 
            placeholder="ძებნა პაციენტის სახელით, MRN-ით, ან სიმპტომებით..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <button 
            style={{
              padding: '10px 16px',
              backgroundColor: '#374151',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
            onClick={() => setSearchTerm("")}
          >
            გასუფთავება
          </button>
        </div>
      </div>

      {/* Patient Records List */}
      {filteredPatients.length === 0 ? (
        <div style={{
          backgroundColor: 'white',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          padding: '32px',
          textAlign: 'center',
          minHeight: '300px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <div style={{
            fontSize: '48px',
            marginBottom: '16px',
            opacity: 0.5
          }}>📋</div>
          <h3 style={{
            color: '#64748b',
            fontSize: '18px',
            margin: '0 0 8px 0',
            fontWeight: '500'
          }}>
            {searchTerm ? 'შესაბამისი ჩანაწერები ვერ მოიძებნა' : 'პაციენტების ჩანაწერები ვერ მოიძებნა'}
          </h3>
          <p style={{
            color: '#94a3b8',
            fontSize: '14px',
            margin: '0 0 20px 0',
            maxWidth: '400px',
            lineHeight: '1.5'
          }}>
            {searchTerm ? 'სცადეთ ძებნის პარამეტრების შეცვლა.' : 'შექმენით თქვენი პირველი პაციენტის ჩანაწერი AI-ზე დაფუძნებული კლინიკური გადაწყვეტილების მხარდაჭერის სისტემის გამოსაყენებლად.'}
          </p>
          {!searchTerm && (
            <button 
              style={{
                padding: '12px 24px',
                background: 'linear-gradient(135deg, #16a34a 0%, #22c55e 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                boxShadow: '0 2px 8px rgba(22, 163, 74, 0.2)'
              }}
              onClick={() => setPage("createHistory")}
            >
              + პირველი პაციენტის ჩანაწერის შექმნა
            </button>
          )}
        </div>
      ) : (
        <div style={{
          backgroundColor: 'white',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          overflow: 'hidden'
        }}>
          {/* Table Header - REPLACE existing header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '150px 80px 130px 1fr 100px 100px 140px', // Adjusted for gender column
            gap: '16px',
            padding: '16px',
            backgroundColor: '#f8fafc',
            borderBottom: '1px solid #e2e8f0',
            fontSize: '12px',
            fontWeight: '600',
            color: '#64748b',
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}>
            <div>პაციენტის სქესი</div> {/* Changed from სახელი to სქესი */}
            <div>ასაკი</div>
            <div>MRN</div>
            <div>მთავარი საჩივარი</div>
            <div>სისწრაფე</div>
            <div>ბოლო შესწორება</div>
            <div>მოქმედებები</div>
          </div>

          {/* Patient Records - REPLACE the patient record mapping */}
          {filteredPatients.map((patient) => (
            <div key={patient.id} style={{
              display: 'grid',
              gridTemplateColumns: "150px 80px 130px 1fr 100px 100px 140px", // Updated columns
              gap: '16px',
              padding: '16px',
              borderBottom: '1px solid #f1f5f9',
              fontSize: '14px',
              alignItems: 'center',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <div style={{fontWeight: '600', color: '#1e293b'}}>
                {patient.patientGender === 'male' ? 'მამრობითი' : 
                 patient.patientGender === 'female' ? 'მდედრობითი' : 
                 patient.patientGender === 'other' ? 'სხვა' : 
                 patient.patientGender === 'not_specified' ? 'არ არის მითითებული' : 
                 patient.patientGender || 'არ არის მითითებული'}
              </div>
              <div style={{color: '#64748b'}}>{patient.patientAge}</div>
              <div style={{color: '#64748b', fontFamily: 'monospace'}}>{patient.patientID}</div>
              <div style={{color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>
                {patient.symptoms.substring(0, 60)}...
              </div>
              <div>
                <span style={{
                  padding: '2px 8px',
                  borderRadius: '12px',
                  fontSize: '11px',
                  fontWeight: '500',
                  backgroundColor: patient.urgencyLevel === 'emergency' ? '#fef2f2' : patient.urgencyLevel === 'urgent' ? '#fef7ed' : '#f0fdf4',
                  color: patient.urgencyLevel === 'emergency' ? '#dc2626' : patient.urgencyLevel === 'urgent' ? '#ea580c' : '#16a34a'
                }}>
                  {patient.urgencyLevel === 'emergency' ? 'საგანგებო' : patient.urgencyLevel === 'urgent' ? 'სასწრაფო' : 'რუტინული'}
                </span>
              </div>
              <div style={{ color: "#64748b", fontSize: "12px" }}>
                {new Date(patient.lastModified).toLocaleDateString('ka-GE')}
              </div>
              <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                <button
                  style={{
                    padding: '4px 8px',
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '11px',
                    cursor: 'pointer',
                    minWidth: "42px"
                  }}
                  onClick={() => loadPatientRecord(patient)}
                  title="გახსნა და რედაქტირება"
                >
                  გახსნა
                </button>
                <button
                  style={{
                    padding: "4px 8px",
                    backgroundColor: "#059669",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    fontSize: "11px",
                    cursor: "pointer",
                    minWidth: "42px"
                  }}
                  onClick={() => exportPatientConsultation(patient)}
                  title="ექსპორტი PDF/TXT"
                >
                  ექსპორტი
                </button>
                <button
                  style={{
                    padding: '4px 8px',
                    backgroundColor: '#ef4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '11px',
                    cursor: 'pointer',
                    minWidth: "42px"
                  }}
                  onClick={() => deletePatientRecord(patient.id)}
                  title="წაშლა"
                >
                  წაშლა
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderCreateHistory = () => (
  <div style={unifiedPageStyle}>
    {/* // Replace this section at the top of renderCreateHistory function: */}
<div style={{
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "24px",
  paddingBottom: "16px",
  borderBottom: "1px solid rgba(226, 232, 240, 0.8)", // Make border semi-transparent
  backgroundColor: "rgba(255, 255, 255, 0.90)", // Add semi-transparent background
  backdropFilter: "blur(10px)", // Add blur effect
  borderRadius: "8px", // Add rounded corners
  padding: "16px 24px", // Add padding
  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)", // Add subtle shadow
}}>

  <h2 style={{ 
    color: "#1f2937", 
    margin: "0",
    fontSize: "24px",
    fontWeight: "600"
  }}>
    ახალი სამედიცინო ისტორიის შექმნა
  </h2>
  
  {/* Move buttons to top right */}
  <div style={{ display: "flex", gap: "12px" }}>
    {showChat && (
      <button
        style={{
          padding: "8px 16px",
          backgroundColor: SM.primaryXLight,
          color: SM.primary,
          border: `1.5px solid ${SM.border}`,
          borderRadius: "6px",
          cursor: "pointer",
          fontSize: "14px",
          fontWeight: "500",
          display: "flex",
          alignItems: "center",
          gap: "6px",
          transition: "all 0.2s ease",
        }}
        onClick={clearChat}
        onMouseEnter={(e) => {
          e.target.style.backgroundColor = "#e2e8f0";
          e.target.style.borderColor = "#cbd5e1";
        }}
        onMouseLeave={(e) => {
          e.target.style.backgroundColor = "#f1f5f9";
          e.target.style.borderColor = "#e2e8f0";
        }}
      >
        🗑️ გასუფთავება
      </button>
    )}
    
    <button
      style={{
        padding: "8px 16px",
        backgroundColor: SM.primaryXLight,
        color: SM.primary,
        border: `1.5px solid ${SM.border}`,
        borderRadius: "6px",
        cursor: "pointer",
        fontSize: "14px",
        fontWeight: "500",
        display: "flex",
        alignItems: "center",
        gap: "6px",
        transition: "all 0.2s ease",
      }}
      onClick={() => setPage("home")}
      onMouseEnter={(e) => {
        e.target.style.backgroundColor = "#e2e8f0";
        e.target.style.borderColor = "#cbd5e1";
      }}
      onMouseLeave={(e) => {
        e.target.style.backgroundColor = "#f1f5f9";
        e.target.style.borderColor = "#e2e8f0";
      }}
    >
      ← მთავარი გვერდი
    </button>
  </div>
</div>

    {/* Main Side by Side Layout */}
    <div style={dualPanelContainerStyle}>
      {/* LEFT SIDE - Collapsible Patient Information Input */}
      <div style={{ 
        flex: isLeftPanelCollapsed ? "0 0 50px" : "0 0 550px", 
        marginRight: "25px",
        transition: "flex 0.3s ease"
      }}>
        <div
          style={{
            backgroundColor: "rgba(255, 255, 255, 0.95)", // Semi-transparent white
            border: "1px solid rgba(209, 213, 219, 0.8)", // Semi-transparent border
            borderRadius: "8px",
            padding: isLeftPanelCollapsed ? "15px 10px" : "25px",
            boxShadow: "0 4px 16px rgba(0, 0, 0, 0.1)", // Enhanced shadow
            backdropFilter: "blur(12px)", // Add blur effect
            transition: "padding 0.3s ease"
          }}
        >
          {/* Collapse/Expand Header */}
          <div style={{ 
            display: "flex", 
            justifyContent: "space-between", 
            alignItems: "center", 
            marginBottom: isLeftPanelCollapsed ? "0" : "20px",
            cursor: "pointer"
          }}
          onClick={() => setIsLeftPanelCollapsed(!isLeftPanelCollapsed)}
          >
            <h3 style={{ 
              color: "#374151", 
              margin: "0",
              fontSize: isLeftPanelCollapsed ? "14px" : "16px",
              transition: "font-size 0.3s ease"
            }}>
              {isLeftPanelCollapsed ? "📋" : "📋 პაციენტის ინფორმაცია"}
            </h3>
            <button
              style={{
                background: "none",
                border: "none",
                fontSize: "18px",
                cursor: "pointer",
                color: "#6b7280",
                padding: "5px",
                borderRadius: "4px",
                transition: "background-color 0.2s ease"
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = "#f3f4f6"}
              onMouseLeave={(e) => e.target.style.backgroundColor = "transparent"}
            >
              {isLeftPanelCollapsed ? "▶" : "◀"}
            </button>
          </div>

          {/* Collapsible Content */}
          {!isLeftPanelCollapsed && (
            <div style={{ 
              opacity: isLeftPanelCollapsed ? 0 : 1,
              transition: "opacity 0.3s ease"
            }}>
              <div style={{ marginBottom: "16px" }}>
                <label style={{
                  fontSize: "14px",
                  fontWeight: "500", 
                  color: "#374151",
                  display: "block",
                  marginBottom: "4px"
                }}>
                  პაციენტის სქესი *
                </label>
                <select
                  style={{ ...inputStyle, fontSize: "16px", padding: "12px" }}
                  value={newHistory.patientGender}
                  onChange={(e) => handleHistoryChange("patientGender", e.target.value)}
                >
                  <option value="">აირჩიეთ სქესი</option>
                  <option value="male">მამრობითი</option>
                  <option value="female">მდედრობითი</option>
                </select>
              </div>
              <input
                style={{ ...inputStyle, fontSize: "16px", padding: "12px" }}
                placeholder="პაციენტის ასაკი"
                value={newHistory.patientAge}
                onChange={(e) =>
                  handleHistoryChange("patientAge", e.target.value)
                }
              />
              <input
                style={{ ...inputStyle, fontSize: "16px", padding: "12px" }}
                placeholder="პაციენტის ID/MRN"
                value={newHistory.patientID}
                onChange={(e) => handleHistoryChange("patientID", e.target.value)}
              />

              <label
                style={{
                  fontSize: "16px",
                  fontWeight: "bold",
                  color: "#374151",
                  display: "block",
                  margin: "15px 0 8px 0",
                }}
              >
                კლინიკური დოკუმენტაცია:
              </label>
              <textarea
                style={{
                  ...inputStyle,
                  minHeight: "180px",
                  fontSize: "15px",
                  padding: "15px",
                  lineHeight: "1.5",
                }}
                placeholder="მთავარი საჩივარი, მიმდინარე დაავადების ისტორია, სიმპტომები (დაწყება, ხანგრძლივობა, სიმძიმე, ხარისხი, ლოკალიზაცია, გავრცელება, დრო, კონტექსტი), შეუძლებელი სიმპტომები, ანამნეზი, მედიკამენტები, ალერგიები, ოჯახური ისტორია, სოციალური ისტორია, სისტემების მიმოხილვა..."
                value={newHistory.symptoms}
                onChange={(e) => handleHistoryChange("symptoms", e.target.value)}
              />
              {/* Image Upload Section - PATIENT INFO */}
<div style={{ 
  margin: "15px 0",
  padding: "15px",
  backgroundColor: "#f9fafb",
  border: "1px solid #e5e7eb",
  borderRadius: "6px"
}}>
  <label style={{
    fontSize: "14px",
    fontWeight: "600",
    color: "#374151",
    display: "block",
    marginBottom: "8px"
  }}>
   დოკუმენტის ან ფოტოს ატვირთვა 
  </label>
  
  {/* Hidden file input */}
  <input
    type="file"
    multiple
    accept="image/*"
    onChange={(e) => handleImageUpload(e, false)}
    style={{ display: "none" }}
    id="patient-info-image-upload"
    disabled={isProcessingImage}
  />
  
  {/* Upload button */}
  <button
    style={{
      padding: "10px 16px",
      backgroundColor: isProcessingImage ? "#d1d5db" : "#6b7280",
      color: "white",
      border: "none",
      borderRadius: "6px",
      cursor: isProcessingImage ? "not-allowed" : "pointer",
      fontSize: "14px",
      fontWeight: "500",
      display: "flex",
      alignItems: "center",
      gap: "8px",
      transition: "background-color 0.2s ease"
    }}
    onClick={() => document.getElementById('patient-info-image-upload').click()}
    disabled={isProcessingImage}
    onMouseEnter={(e) => !isProcessingImage && (e.target.style.backgroundColor = "#9ca3af")}
    onMouseLeave={(e) => !isProcessingImage && (e.target.style.backgroundColor = "#6b7280")}
  >
    {isProcessingImage ? "⏳ დამუშავება..." : "📷 ატვირთე"}
  </button>
  
  {/* Uploaded images preview */}
  {uploadedImages.length > 0 && (
    <div style={{
      marginTop: "12px",
      padding: "10px",
      backgroundColor: "white",
      border: "1px solid #e5e7eb",
      borderRadius: "4px"
    }}>
      <div style={{
        fontSize: "12px",
        color: "#6b7280",
        marginBottom: "8px",
        fontWeight: "500"
      }}>
        ატვირთული სურათები ({uploadedImages.length}):
      </div>
      {uploadedImages.map((image) => (
        <div
          key={image.id}
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "6px 8px",
            margin: "4px 0",
            backgroundColor: "#f9fafb",
            borderRadius: "4px",
            fontSize: "12px",
            border: "1px solid #e5e7eb"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1 }}>
            <span style={{ fontSize: "16px" }}>🖼️</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: "500", color: "#374151" }}>{image.name}</div>
              <div style={{ fontSize: "10px", color: "#9ca3af" }}>
                {(image.size / 1024).toFixed(1)} KB • {image.uploadTime}
              </div>
            </div>
          </div>
          <button
            style={{
              padding: "4px 8px",
              backgroundColor: "#ef4444",
              color: "white",
              border: "none",
              borderRadius: "3px",
              fontSize: "11px",
              cursor: "pointer",
              fontWeight: "500"
            }}
            onClick={() => removeImage(image.id, false)}
            onMouseEnter={(e) => e.target.style.backgroundColor = "#dc2626"}
            onMouseLeave={(e) => e.target.style.backgroundColor = "#ef4444"}
          >
            ✕ წაშლა
          </button>
        </div>
      ))}
    </div>
  )}
  
  <div style={{
    fontSize: "11px",
    color: "#9ca3af",
    marginTop: "8px",
    fontStyle: "italic"
  }}>
    💡 ატვირთეთ რენტგენის სურათები, ანალიზების შედეგები, ან სხვა დიაგნოსტიკური მასალები
  </div>
</div>

              {/* // WRAP this entire section in a conditional to hide it: */}
              {true && ( // This false will hide the entire prompt section
                <>
                  {/* AI Prompt Customization */}
                  <label
                    style={{
                      fontSize: "16px",
                      fontWeight: "bold",
                      color: "#4b5563",
                      display: "block",
                      margin: "20px 0 8px 0",
                    }}
                  >
                    🤖 AI კონსულტაციის შაბლონი:
                  </label>

                  {/* Template Selection */}
                  <div style={{ marginBottom: "15px" }}>
                    <button
                      style={{
                        padding: "8px 16px",
                        backgroundColor: "#6b7280",
                        color: "white",
                        border: "none",
                        borderRadius: "6px",
                        cursor: "pointer",
                        fontSize: "14px",
                        fontWeight: "500",
                        marginRight: "10px",
                      }}
                      onClick={() => setShowTemplates(!showTemplates)}
                    >
                      📋 კლინიკური შაბლონები
                    </button>
                    {showTemplates && (
                      <div
                        style={{
                          marginTop: "10px",
                          padding: "10px",
                          backgroundColor: "#f9fafb",
                          borderRadius: "6px",
                          border: "1px solid #e5e7eb",
                        }}
                      >
                        {Object.keys(clinicalTemplates).map((templateName) => (
                          <button
                            key={templateName}
                            style={{
                              display: "block",
                              width: "100%",
                              padding: "8px 12px",
                              margin: "4px 0",
                              backgroundColor: "white",
                              border: "1px solid #d1d5db",
                              borderRadius: "4px",
                              cursor: "pointer",
                              fontSize: "14px",
                              textAlign: "left",
                            }}
                            onClick={() => applyTemplate(templateName)}
                          >
                            {templateName}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

    <textarea
      style={{
        ...inputStyle,
        minHeight: "150px",
        fontSize: "13px",
        padding: "12px",
        lineHeight: "1.4",
        backgroundColor: "#f9fafb",
        border: "2px solid #e5e7eb",
      }}
      placeholder="მოაადასტურეთ როგორ უნდა ურასუხოს AI-მ..."
      value={customPrompt}
      onChange={(e) => handlePromptChange(e.target.value)}
    />
    <div
      style={{
        fontSize: "12px",
        color: "#6b7280",
        fontStyle: "italic",
        marginBottom: "10px",
      }}
    >
      💡 გამოიყენეთ ადგილმარქერები: {"{patientName}"}, {"{patientAge}"},{" "}
      {"{patientID}"}, {"{symptoms}"}
    </div>

    {/* Prompt Management Buttons */}
    <div style={{ display: "flex", gap: "10px", marginBottom: "15px" }}>
      <button
        style={{
          padding: "8px 15px",
          backgroundColor: "#9ca3af",
          color: "white",
          border: "none",
          borderRadius: "6px",
          cursor: "pointer",
          fontSize: "13px",
          fontWeight: "500",
        }}
        onClick={resetPromptToDefault}
      >
        🔄 დაბრუნება ნაგულისხმევ მნიშვნელობამდე
      </button>
    </div>
  </>
)}

              {/* Action Buttons */}
              <div style={{ display: "flex", gap: "10px", marginBottom: "15px" }}>
                <button
                  style={{
                    flex: 1,
                    padding: "15px 25px",
                    background:
                      isLoading || isLoadingNews || !newHistory.symptoms.trim()
                        ? "#d1d5db"
                        : `linear-gradient(135deg, ${SM.primary} 0%, ${SM.primaryLight} 100%)`,
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    cursor:
                      isLoading || isLoadingNews || !newHistory.symptoms.trim()
                        ? "not-allowed"
                        : "pointer",
                    fontSize: "16px",
                    fontWeight: "600",
                    boxShadow:
                      isLoading || isLoadingNews || !newHistory.symptoms.trim()
                        ? "none"
                        : "0 4px 16px rgba(75, 85, 99, 0.2)",
                  }}
                  onClick={consultWithAI}
                  disabled={
                    isLoading || isLoadingNews || !newHistory.symptoms.trim()
                  }
                >
                  {isLoading || isLoadingNews
                    ? "🔄 AI კონსულტაცია..."
                    : "🤖 AI კონსულტაციის დაწყება"}
                </button>

                <button
                  style={{
                    padding: "15px 20px",
                    backgroundColor: "#6b7280",
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: "500",
                  }}
                  onClick={savePatientRecord}
                >
                  💾 შენახვა
                </button>
              </div>

              {/* Additional Tools */}
              <div style={{ display: "flex", gap: "10px", marginBottom: "15px" }}>
              </div>

              <button
                style={{
                  width: "100%",
                  padding: "12px 20px",
                  backgroundColor: "#9ca3af",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontSize: "16px",
                  fontWeight: "500",
                }}
                onClick={() => setPage("history")}
              >
                ← უკან სამედიცინო ჩანაწერებზე
              </button>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT SIDE - Side-by-Side AI Windows */}
      <div style={{ 
        flex: 1, 
        minWidth: isLeftPanelCollapsed ? "calc(100vw - 120px)" : "700px",
        display: "flex",
        gap: "15px"
      }}>
        
        {/* AI Chat Window - Left Side */}
        <div style={{ 
          flex: isNewsPanelCollapsed ? 1 : "0 0 60%",
          display: "flex",
          flexDirection: "column",
          transition: "flex 0.3s ease"
        }}>
          {!showChat && !newsResponse ? (
            <div
              style={{
                backgroundColor: "#f9fafb",
                border: "2px dashed #d1d5db",
                borderRadius: "8px",
                padding: "60px 40px",
                textAlign: "center",
                color: "#6b7280",
                minHeight: "500px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
              }}
            >
              <div style={{ fontSize: "64px", marginBottom: "25px" }}>🩺</div>
              <h3 style={{ fontSize: "24px", marginBottom: "15px", color: "#374151" }}>
                AI სამედიცინო კონსულტაცია
              </h3>
              <p style={{ fontSize: "16px", marginBottom: "25px", color: "#6b7280" }}>
                შეავსეთ პაციენტის ინფორმაცია და კლინიკური დოკუმენტაცია მარცხნივ,
                შემდეგ დააწკაპუნეთ "AI კონსულტაციის დაწყება" რომ მიიღოთ:
              </p>
              <ul
                style={{
                  textAlign: "left",
                  maxWidth: "400px",
                  margin: "0 auto",
                  lineHeight: "1.8",
                  fontSize: "15px",
                  color: "#4b5563"
                }}
              >
                <li>🎯 AI სამედიცინო ანალიზი & დიაგნოზი</li>
                <li>🔍 დიფერენციალური დიაგნოზები</li>
                <li>📋 რეკომენდებული ტესტები & გამოკვლევები</li>
                <li>⚠️ წითელი ალმები & გამაფრთხილებელი ნიშნები</li>
                <li>📰 უახლესი სამედიცინო კვლევა</li>
                <li>💬 ინტერაქტიული AI ჩეთი შემდგომი შეკითხვებისთვის</li>
              </ul>
            </div>
          ) : (
            /* AI Chat Window */
            <div
              style={{
                backgroundColor: "rgba(255, 255, 255, 0.98)", // CHANGE: more opaque
                border: "1px solid rgba(209, 213, 219, 0.8)",
                borderRadius: "8px",
                boxShadow: "0 4px 16px rgba(0, 0, 0, 0.1)",
                backdropFilter: "blur(12px)",
                display: "flex",
                flexDirection: "column",
                height: "600px",
                // ADD THESE LINES:
                position: "relative",
                zIndex: 2,
                width: "100%"
  }}
              >
              <div
                style={{
                  color: "#374151",
                  backgroundColor: "#f3f4f6",
                  fontSize: "18px",
                  padding: "15px 20px",
                  fontWeight: "bold",
                  borderBottom: "1px solid #e5e7eb",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center"
                }}
              >
                <span>💬 AI სამედიცინო კონსულტაცია</span>
              </div>
              
              {/* Chat Messages */}
              <div
                ref={chatMessagesRef}
                style={{
                  flex: 1,
                  overflowY: "auto",
                  padding: "15px",
                }}
              >
                {isLoading ? (
                  <div style={{ textAlign: "center", color: "#6b7280", fontStyle: "italic", fontSize: "16px" }}>
                    🤖 AI აანალიზებს საქმეს...
                  </div>
                ) : chatMessages.length > 0 ? (
                  chatMessages.map((message, index) => (
                    <div key={index} style={{ marginBottom: "15px" }}>
                      <div
                        style={{
                          margin: "10px 0",
                          padding: "12px 15px",
                          borderRadius: "8px",
                          fontSize: "14px",
                          lineHeight: "1.4",
                          backgroundColor: "#ffffff", // Pure white for all messages
                          marginLeft: message.type === "user" ? "30px" : "0",
                          marginRight: message.type === "user" ? "0" : "30px",
                          border: message.type === "user" ? "2px solid #d1d5db" : "2px solid #9ca3af", // Different borders to distinguish
                          boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)"
                        }}
                      >
                        <strong
                          style={{
                            color: message.type === "user" ? "#4b5563" : "#374151",
                            fontSize: "15px",
                          }}
                        >
                          {message.type === "user" ? "👨‍⚕️ ექიმი:" : "🤖 AI:"}
                        </strong>
                        <div
                          style={{
                            marginTop: "8px",
                            whiteSpace: "pre-wrap",
                            lineHeight: "1.5",
                            color: "#1f2937"
                          }}
                        >
                          {message.text}
                        </div>
                        <div
                          style={{
                            fontSize: "11px",
                            color: "#9ca3af",
                            marginTop: "5px",
                          }}
                        >
                          {message.timestamp}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div
                    style={{
                      textAlign: "center",
                      color: "#6b7280",
                      fontStyle: "italic",
                      fontSize: "16px",
                    }}
                  >
                    შეტყობინებები ჯერ არ არის. დააწკაპუნეთ "AI კონსულტაციის
                    დაწყება" დასაწყებად.
                  </div>
                )}
              </div>

              {/* // Replace the existing chat input section in renderCreateHistory with this: */}
                {showChat && (
                  <div
                    style={{
                      padding: "15px 20px",
                      borderTop: "1px solid #e5e7eb",
                      backgroundColor: "#fafafa"
                    }}
                  >
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                      {/* Chat images preview */}
                      {chatImages.length > 0 && (
                        <div style={{
                          border: "1px solid #e5e7eb",
                          borderRadius: "4px",
                          padding: "8px",
                          backgroundColor: "white",
                          maxHeight: "100px",
                          overflowY: "auto"
                        }}>
                          <div style={{ fontSize: "11px", color: "#6b7280", marginBottom: "5px" }}>
                            ჩასართავი სურათები ({chatImages.length}):
                          </div>
                          {chatImages.map((image) => (
                            <div key={image.id} style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              padding: "3px 5px",
                              margin: "2px 0",
                              backgroundColor: "#f9fafb",
                              borderRadius: "3px",
                              fontSize: "11px"
                            }}>
                              <span>{image.name}</span>
                              <button
                                style={{
                                  padding: "1px 4px",
                                  backgroundColor: "#ef4444",
                                  color: "white",
                                  border: "none",
                                  borderRadius: "2px",
                                  fontSize: "9px",
                                  cursor: "pointer"
                                }}
                                onClick={() => removeImage(image.id, true)}
                              >
                                ✕
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      <textarea
                        style={{
                          ...inputStyle,
                          margin: "0",
                          fontSize: "14px",
                          padding: "12px",
                          minHeight: "80px",
                          resize: "vertical",
                          lineHeight: "1.5",
                          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif'
                        }}
                        placeholder="დასვით შემდგომი შეკითხვა... (Shift+Enter ახალი ხაზისთვის, Enter გაგზავნისთვის)"
                        value={followUpQuestion}
                        onChange={(e) => setFollowUpQuestion(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            if (e.shiftKey || e.metaKey) {
                              e.preventDefault();
                              const textarea = e.target;
                              const start = textarea.selectionStart;
                              const end = textarea.selectionEnd;
                              const newValue = followUpQuestion.substring(0, start) + "\n" + followUpQuestion.substring(end);
                              setFollowUpQuestion(newValue);
                              
                              setTimeout(() => {
                                textarea.selectionStart = textarea.selectionEnd = start + 1;
                              }, 0);
                            } else {
                              e.preventDefault();
                              if (!isLoading && (followUpQuestion.trim() || chatImages.length > 0)) {
                                sendFollowUpQuestion();
                              }
                            }
                          }
                        }}
                        disabled={isLoading}
                      />
                      
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                          <input
                            type="file"
                            multiple
                            accept="image/*"
                            onChange={(e) => handleImageUpload(e, true)}
                            style={{ display: "none" }}
                            id="chat-image-upload"
                            disabled={isProcessingImage}
                          />
                          
                          <button
                            style={{
                              padding: "8px 12px",
                              backgroundColor: isProcessingImage ? "#d1d5db" : "#9ca3af",
                              color: "white",
                              border: "none",
                              borderRadius: "4px",
                              cursor: isProcessingImage ? "not-allowed" : "pointer",
                              fontSize: "12px",
                              fontWeight: "500"
                            }}
                            onClick={() => document.getElementById('chat-image-upload').click()}
                            disabled={isProcessingImage}
                          >
                            {isProcessingImage ? "⏳" : "📷"}
                          </button>
                          
                          <div style={{ fontSize: "12px", color: "#6b7280", fontStyle: "italic" }}>
                            Enter - გაგზავნა | Shift+Enter - ახალი ხაზი
                          </div>
                        </div>
                        
                        <button
                          style={{
                            padding: "12px 20px",
                            backgroundColor: isLoading ? "#d1d5db" : "#6b7280",
                            color: "white",
                            border: "none",
                            borderRadius: "6px",
                            cursor: isLoading ? "not-allowed" : "pointer",
                            fontSize: "14px",
                            fontWeight: "500",
                            minWidth: "80px"
                          }}
                          onClick={sendFollowUpQuestion}
                          disabled={isLoading || (!followUpQuestion.trim() && chatImages.length === 0)}
                        >
                          {isLoading ? "..." : "გაგზავნა"}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
            </div>
          )}
        </div>

        {/* Collapsible News Panel - Right Side */}
        <div style={{ 
          flex: isNewsPanelCollapsed ? "0 0 50px" : "0 0 40%",
          transition: "flex 0.3s ease",
          display: "flex",
          flexDirection: "column"
        }}>
          <div
            style={{
              backgroundColor: "transparent", // Semi-transparent white
              border: "1px solid rgba(209, 213, 219, 0.8)", // Semi-transparent border
              borderRadius: "8px",
              boxShadow: "0 4px 16px rgba(0, 0, 0, 0.1)", // Enhanced shadow
              backdropFilter: "blur(12px)", // Add blur effect
              height: "600px",
              display: "flex",
              flexDirection: "column"
            }}
          >
            {/* Collapsible Header */}
            <div
              style={{
                color: "#374151",
                backgroundColor: "rgba(243, 244, 246, 0.8)", // Make semi-transparent
                fontSize: isNewsPanelCollapsed ? "14px" : "18px",
                padding: "15px 20px",
                fontWeight: "bold",
                borderBottom: "1px solid #e5e7eb",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                cursor: "pointer",
                transition: "font-size 0.3s ease"
              }}
              onClick={() => setIsNewsPanelCollapsed(!isNewsPanelCollapsed)}
            >
              <span>
                {isNewsPanelCollapsed ? "📰" : "📰 უახლესი სამედიცინო კვლევა & სიახლეები"}
              </span>
              <button
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "16px",
                  cursor: "pointer",
                  color: "#6b7280",
                  padding: "5px",
                  borderRadius: "4px",
                  transition: "background-color 0.2s ease"
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = "#e5e7eb"}
                onMouseLeave={(e) => e.target.style.backgroundColor = "transparent"}
              >
                {isNewsPanelCollapsed ? "◀" : "▶"}
              </button>
            </div>
            
            {/* News Content - REPLACE the existing news content div */}
            {!isNewsPanelCollapsed && (
              <div
                style={{
                  flex: 1,
                  overflowY: "auto",
                  padding: "20px",
                  fontSize: "14px",
                  opacity: isNewsPanelCollapsed ? 0 : 1,
                  transition: "opacity 0.3s ease",
                  backgroundColor: "transparent" // Add this line
                }}
              >
                {isLoadingNews ? (
                  <div style={{ textAlign: "center", color: "#6b7280", fontStyle: "italic", fontSize: "16px" }}>
                    🔍 ვეძებ უახლეს სამედიცინო კვლევას...
                  </div>
                ) : newsResponse ? (
                  <div style={{ 
                    lineHeight: "1.6", 
                    color: "#1f2937",
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif'
                  }}>
                    {formatResearchText(newsResponse)}
                  </div>
                ) : (
                  <div style={{ textAlign: "center", color: "#6b7280", fontStyle: "italic", fontSize: "16px" }}>
                    კვლევითი მონაცემები ჯერ კიდევ მიუწვდომელია.
                  </div>
                )}
                
                {/* Research Enhancement Notice */}
                {newsResponse && (
                  <div style={{
                    marginTop: "16px",
                    padding: "12px",
                    backgroundColor: "#f0f9ff",
                    border: "1px solid #e0f2fe",
                    borderRadius: "6px",
                    fontSize: "12px",
                    color: "#0369a1"
                  }}>
                    💡 <strong>ლეგენდა:</strong>{" "}
                    <span style={{ color: "#1e40af", backgroundColor: "#dbeafe", padding: "1px 3px", borderRadius: "2px", marginRight: "8px" }}>
                      ჟურნალები
                    </span>
                    <span style={{ color: "#059669", backgroundColor: "#ecfdf5", padding: "1px 3px", borderRadius: "2px", marginRight: "8px" }}>
                      DOI ლინკები
                    </span>
                    <span style={{ color: "#7c2d12", backgroundColor: "#fef7ed", padding: "1px 3px", borderRadius: "2px", marginRight: "8px" }}>
                      PubMed
                    </span>
                    <span style={{ color: "#dc2626", backgroundColor: "#fef2f2", padding: "1px 3px", borderRadius: "2px" }}>
                      რეკომენდაციები
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>

    <p
      style={{
        fontSize: "11px",
        color: "#9ca3af",
        fontStyle: "italic",
        margin: "20px 0 0 0",
        textAlign: "center",
      }}
    >
      ⚠️ AI კონსულტაცია მხოლოდ სარეკომენდაციო ხასიათისაა! პასუხისმგებლობა სრულად ეკისრება სერტიფიცირებულ ექიმს.
    </p>
  </div>
);

// Main render function
  return (
    <>
      {/* Fixed Background Layer */}
      <div style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: "100vw",
        height: "100vh",
        background: `linear-gradient(150deg, #F4F9F6 0%, #EBF5F0 50%, #F0F8F4 100%)`,
        zIndex: -1
      }}></div>
      
      {/* Main Content Container */}
      <div style={containerStyle}>
        {/* Background overlay */}
        <div style={backgroundOverlay}></div>
        
        {page === "home" && renderHome()}
        {page === "profile" && renderProfile()}
        {page === "correspondence" && renderCorrespondence()}
        {page === "history" && renderHistory()}
        {page === "createHistory" && renderCreateHistory()}
        {page === "drugInteractions" && renderDrugInteractions()}
      </div>
    </>
  );
};

export default DoctorAssistantApp;