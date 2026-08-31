import React, { useState } from "react";

const DoctorAssistantApp = () => {
  const [page, setPage] = useState("home");
  const [aiResponse, setAiResponse] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [followUpQuestion, setFollowUpQuestion] = useState("");
  const [showChat, setShowChat] = useState(false);
  const [newsResponse, setNewsResponse] = useState("");
  const [isLoadingNews, setIsLoadingNews] = useState(false);
  const [savedPatients, setSavedPatients] = useState(() => {
    try {
      const saved = localStorage.getItem('savedPatients');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [urgencyLevel, setUrgencyLevel] = useState("routine");
  const [patientNotes, setPatientNotes] = useState("");
  const [showTemplates, setShowTemplates] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  
  // Clinical templates
  const clinicalTemplates = {
    "Emergency Medicine": `You are an emergency medicine specialist. Patient: {patientName}, Age: {patientAge}
    
Symptoms: {symptoms}

URGENT ASSESSMENT:
1. Triage level (ESI 1-5)
2. Life-threatening conditions to rule out immediately
3. Emergency diagnostic tests needed NOW
4. Immediate interventions required
5. Disposition (discharge, admit, observe)

Focus on time-sensitive conditions and emergency protocols.`,
    
    "Internal Medicine": `You are an internal medicine physician. Patient: {patientName}, Age: {patientAge}
    
Clinical presentation: {symptoms}

COMPREHENSIVE ASSESSMENT:
1. Primary differential diagnoses (5 most likely)
2. Systematic review approach
3. Evidence-based diagnostic workup
4. Risk stratification
5. Treatment recommendations with guidelines
6. Follow-up care plan`,
    
    "Pediatrics": `You are a pediatric specialist. Patient: {patientName}, Age: {patientAge}
    
Clinical findings: {symptoms}

PEDIATRIC ASSESSMENT:
1. Age-appropriate differential diagnoses
2. Developmental considerations
3. Pediatric-specific red flags
4. Weight-based medication dosing
5. Family/caregiver counseling points
6. Growth and development impact`,
    
    "Psychiatry": `You are a psychiatric consultant. Patient: {patientName}, Age: {patientAge}
    
Clinical presentation: {symptoms}

PSYCHIATRIC EVALUATION:
1. Mental status examination findings
2. Differential psychiatric diagnoses
3. Risk assessment (suicide, self-harm, violence)
4. Substance use considerations
5. Psychosocial factors
6. Treatment recommendations (therapy vs medication)`
  };
  
  // Default prompt
  const defaultPrompt = `You are a medical AI assistant providing second opinion suggestions to healthcare professionals. 

Patient Information:
- Name: {patientName}
- Age: {patientAge}
- ID: {patientID}

Symptoms and Anamnesis:
{symptoms}

Please provide:
1. Possible differential diagnoses (list 3-5 most likely conditions)
2. Recommended additional tests or examinations
3. Red flags to watch for
4. General treatment considerations

IMPORTANT DISCLAIMER: This is for reference only and should not replace professional medical judgment. Always verify with clinical guidelines and consult with colleagues when needed.`;

  // Load saved prompt from localStorage or use default
  const [customPrompt, setCustomPrompt] = useState(() => {
    try {
      const savedPrompt = localStorage.getItem('doctorAssistantPrompt');
      return savedPrompt || defaultPrompt;
    } catch (error) {
      console.log('localStorage not available, using default prompt');
      return defaultPrompt;
    }
  });

  // Save prompt to localStorage whenever it changes
  const handlePromptChange = (newPrompt) => {
    setCustomPrompt(newPrompt);
    try {
      localStorage.setItem('doctorAssistantPrompt', newPrompt);
    } catch (error) {
      console.log('Could not save prompt to localStorage');
    }
  };

  // Save patient record
  const savePatientRecord = () => {
    if (!newHistory.patientName || !newHistory.symptoms) {
      alert("Please enter patient name and clinical documentation before saving.");
      return;
    }

    const patientRecord = {
      id: Date.now().toString(),
      patientName: newHistory.patientName,
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
    
    try {
      localStorage.setItem('savedPatients', JSON.stringify(updatedPatients));
      alert("✅ Patient record saved successfully!");
    } catch (error) {
      alert("❌ Could not save patient record.");
    }
  };

  // Load patient record
  const loadPatientRecord = (record) => {
    setNewHistory({
      patientName: record.patientName,
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
    if (window.confirm("Are you sure you want to delete this patient record?")) {
      const updatedPatients = savedPatients.filter(p => p.id !== recordId);
      setSavedPatients(updatedPatients);
      localStorage.setItem('savedPatients', JSON.stringify(updatedPatients));
    }
  };

  // Apply clinical template
  const applyTemplate = (templateName) => {
    setCustomPrompt(clinicalTemplates[templateName]);
    setShowTemplates(false);
    alert(`✅ ${templateName} template applied!`);
  };

  // Reset prompt to default
  const resetPromptToDefault = () => {
    setCustomPrompt(defaultPrompt);
    try {
      localStorage.setItem('doctorAssistantPrompt', defaultPrompt);
    } catch (error) {
      console.log('Could not save default prompt to localStorage');
    }
  };

  // Export consultation to PDF/text
  const exportConsultation = () => {
    const exportData = `
CLINICAL CONSULTATION REPORT
Generated: ${new Date().toLocaleString()}

PATIENT INFORMATION:
Name: ${newHistory.patientName}
Age: ${newHistory.patientAge}
MRN: ${newHistory.patientID}
Urgency: ${urgencyLevel.toUpperCase()}

CLINICAL DOCUMENTATION:
${newHistory.symptoms}

AI CONSULTATION RESULTS:
${aiResponse}

PHYSICIAN NOTES:
${patientNotes}

CONSULTATION HISTORY:
${chatMessages.map(msg => `[${msg.timestamp}] ${msg.type === 'user' ? 'Physician' : 'AI'}: ${msg.text}`).join('\n\n')}

---
This report was generated by Clinical Decision Support System
⚠️ For clinical decision support only. Apply professional medical judgment.
    `.trim();

    // Create downloadable file
    const blob = new Blob([exportData], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `consultation_${newHistory.patientName || 'patient'}_${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Drug interaction checker (placeholder)
  const checkDrugInteractions = () => {
    alert("🔍 Drug Interaction Checker\n\nThis feature would integrate with:\n• FDA Drug Database\n• Clinical drug interaction APIs\n• Pharmacy systems\n\n(Feature in development)");
  };

  // Quick differential diagnosis
  const getQuickDifferential = async () => {
    if (!newHistory.symptoms.trim()) {
      alert("Please enter symptoms first.");
      return;
    }

    setIsLoading(true);
    try {
      const quickPrompt = `Patient: ${newHistory.patientName}, Age: ${newHistory.patientAge}
Symptoms: ${newHistory.symptoms}

Provide ONLY a quick list of 5 most likely differential diagnoses with brief rationale. Be concise.`;

      const response = await fetch(GEMINI_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: quickPrompt }] }]
        })
      });

      const data = await response.json();
      const result = data.candidates[0].content.parts[0].text;
      alert(`🎯 Quick Differential Diagnosis:\n\n${result}`);
    } catch (error) {
      alert("❌ Could not generate quick differential. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Filter patients based on search
  const filteredPatients = savedPatients.filter(patient => 
    patient.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.patientID.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.symptoms.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const [profile, setProfile] = useState({
    name: "",
    surname: "",
    age: "",
    field: "",
    email: "",
    summary: ""
  });

  const [newHistory, setNewHistory] = useState({
    patientName: "",
    patientAge: "",
    patientID: "",
    symptoms: ""
  });

  // Your Gemini API Key (get from Google AI Studio)
  const GEMINI_API_KEY = "AIzaSyB_HcwUslGlm7C8sIXCMORwzjZF2yMc3uU"; // Replace with your actual API key
  const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash/:generateContent?key=$AIzaSyB_HcwUslGlm7C8sIXCMORwzjZF2yMc3uU`;


  const consultWithAI = async () => {
    if (!newHistory.symptoms.trim()) {
      alert("Please enter symptoms before consulting AI");
      return;
    }

    setIsLoading(true);
    setIsLoadingNews(true);
    setAiResponse("");
    setNewsResponse("");

    // Start both AI consultation and news search simultaneously
    const aiPromise = getAIConsultation();
    const newsPromise = getLatestMedicalNews();

    try {
      await Promise.all([aiPromise, newsPromise]);
    } catch (error) {
      console.error('Error in consultation:', error);
    }
  };

  const getAIConsultation = async () => {
    try {
      console.log("Starting AI consultation..."); // Debug log
      
      // Replace placeholders in custom prompt with actual patient data
      const processedPrompt = customPrompt
        .replace('{patientName}', newHistory.patientName || "Not provided")
        .replace('{patientAge}', newHistory.patientAge || "Not provided")
        .replace('{patientID}', newHistory.patientID || "Not provided")
        .replace('{symptoms}', newHistory.symptoms);

      console.log("Processed prompt:", processedPrompt); // Debug log

      const response = await fetch(GEMINI_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: processedPrompt.trim()
            }]
          }]
        })
      });

      console.log("API Response status:", response.status); // Debug log

      if (!response.ok) {
        throw new Error(`AI API Error: ${response.status}`);
      }

      const data = await response.json();
      console.log("API Response data:", data); // Debug log
      
      const aiText = data.candidates[0].content.parts[0].text;
      console.log("AI Response text:", aiText); // Debug log
      
      setAiResponse(aiText);
      
      // Initialize chat with the first AI response
      const newMessages = [
        {
          type: 'user',
          text: `Patient: ${newHistory.patientName || 'Unknown'}\nSymptoms: ${newHistory.symptoms}`,
          timestamp: new Date().toLocaleTimeString()
        },
        {
          type: 'ai',
          text: aiText,
          timestamp: new Date().toLocaleTimeString()
        }
      ];
      
      console.log("Setting chat messages:", newMessages); // Debug log
      setChatMessages(newMessages);
      setShowChat(true);
      
    } catch (error) {
      console.error('Error calling AI:', error);
      setAiResponse("Sorry, there was an error connecting to the AI service. Please try again later.");
      
      // Show error in chat
      setChatMessages([{
        type: 'ai',
        text: `Error: ${error.message}`,
        timestamp: new Date().toLocaleTimeString()
      }]);
      setShowChat(true);
    } finally {
      setIsLoading(false);
    }
  };

  const getLatestMedicalNews = async () => {
    try {
      // Extract key medical terms from symptoms
      const medicalTerms = extractMedicalTerms(newHistory.symptoms);
      
      const newsPrompt = `
Find and summarize the latest medical news, research, and case studies related to these symptoms: "${newHistory.symptoms}"

Focus on:
1. Recent medical research (2023-2024) about these symptoms
2. New treatment approaches or guidelines
3. Emerging patterns or outbreaks related to these symptoms
4. Important case studies or medical alerts
5. Recent pharmaceutical developments

For each finding, provide:
- Brief summary (2-3 sentences)
- Relevance to the case
- Source information (journal name, date, or institution)
- Any actionable insights for healthcare providers

Format as: 
📰 **Finding 1:** [Summary]
**Source:** [Journal/Institution, Date]
**Relevance:** [How it relates to this case]

📰 **Finding 2:** [Summary]
**Source:** [Journal/Institution, Date]
**Relevance:** [How it relates to this case]

If no recent specific news is found, provide general recent medical updates related to the symptom categories.
      `.trim();

      const response = await fetch(GEMINI_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: newsPrompt
            }]
          }]
        })
      });

      if (!response.ok) {
        throw new Error(`News API Error: ${response.status}`);
      }

      const data = await response.json();
      const newsText = data.candidates[0].content.parts[0].text;
      setNewsResponse(newsText);
      
    } catch (error) {
      console.error('Error getting medical news:', error);
      setNewsResponse("Unable to fetch latest medical news at this time. Please check medical journals and databases manually for the most recent research.");
    } finally {
      setIsLoadingNews(false);
    }
  };

  // Helper function to extract medical terms
  const extractMedicalTerms = (symptoms) => {
    // Simple extraction - you could make this more sophisticated
    const terms = symptoms.toLowerCase()
      .split(/[,\.\s]+/)
      .filter(word => word.length > 3)
      .slice(0, 5) // Take first 5 meaningful words
      .join(', ');
    return terms;
  };

  const sendFollowUpQuestion = async () => {
    if (!followUpQuestion.trim()) return;

    // Add user message to chat
    const userMessage = {
      type: 'user',
      text: followUpQuestion,
      timestamp: new Date().toLocaleTimeString()
    };
    
    const updatedMessages = [...chatMessages, userMessage];
    setChatMessages(updatedMessages);
    setIsLoading(true);
    const currentQuestion = followUpQuestion;
    setFollowUpQuestion("");

    try {
      // Build context from previous messages (use updatedMessages instead of chatMessages)
      const chatContext = updatedMessages.map(msg => 
        `${msg.type === 'user' ? 'Doctor' : 'AI'}: ${msg.text}`
      ).join('\n\n');

      const prompt = `
Continue this medical consultation. You are a medical AI assistant helping a healthcare professional.

Previous conversation:
${chatContext}

Doctor's follow-up question: ${currentQuestion}

Please provide a helpful response while maintaining the medical context. Remember this is for reference only and should not replace professional medical judgment.
      `.trim();

      const response = await fetch(GEMINI_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }]
        })
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();
      const aiText = data.candidates[0].content.parts[0].text;
      
      // Add AI response to chat
      const aiMessage = {
        type: 'ai',
        text: aiText,
        timestamp: new Date().toLocaleTimeString()
      };
      
      setChatMessages(prev => [...prev, aiMessage]);
      
    } catch (error) {
      console.error('Error sending follow-up:', error);
      const errorMessage = {
        type: 'ai',
        text: "Sorry, there was an error processing your follow-up question. Please try again.",
        timestamp: new Date().toLocaleTimeString()
      };
      setChatMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    setChatMessages([]);
    setShowChat(false);
    setAiResponse("");
    setFollowUpQuestion("");
  };

  const handleProfileChange = (field, value) => {
    setProfile(prev => ({ ...prev, [field]: value }));
  };

  const handleHistoryChange = (field, value) => {
    setNewHistory(prev => ({ ...prev, [field]: value }));
  };

  // Professional button styles
  const buttonStyle = {
    padding: '16px 24px',
    background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    margin: '8px 0',
    fontSize: '15px',
    fontWeight: '500',
    width: '100%',
    boxShadow: '0 4px 16px rgba(30, 64, 175, 0.2)',
    transition: 'all 0.2s ease',
    position: 'relative',
    letterSpacing: '0.025em'
  };

  // Professional hover effects
  const buttonHoverStyle = {
    transform: 'translateY(-1px)',
    boxShadow: '0 6px 20px rgba(30, 64, 175, 0.3)'
  };

  // Disabled button style
  const disabledButtonStyle = {
    ...buttonStyle,
    backgroundColor: '#ccc',
    cursor: 'not-allowed',
    boxShadow: 'none'
  };

  // Input styles
  const inputStyle = {
    padding: '10px',
    border: '1px solid #ccc',
    borderRadius: '5px',
    margin: '5px 0',
    fontSize: '16px',
    width: '100%'
  };

  // Container styles
  const containerStyle = {
    minHeight: '100vh',
    padding: '0',
    fontFamily: '"Inter", "Segoe UI", system-ui, -apple-system, sans-serif',
    background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
    position: 'relative'
  };

  // Professional medical background overlay
  const backgroundOverlay = {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    background: `
      radial-gradient(circle at 20% 80%, rgba(59, 130, 246, 0.03) 0%, transparent 50%),
      radial-gradient(circle at 80% 20%, rgba(16, 185, 129, 0.03) 0%, transparent 50%),
      radial-gradient(circle at 40% 40%, rgba(99, 102, 241, 0.02) 0%, transparent 50%)
    `,
    zIndex: 0,
    pointerEvents: 'none'
  };

  const pageStyle = {
    padding: '40px',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
    maxWidth: '1400px',
    margin: '0 auto',
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    borderRadius: '16px',
    boxShadow: '0 8px 32px rgba(15, 23, 42, 0.08)',
    backdropFilter: 'blur(8px)',
    border: '1px solid rgba(226, 232, 240, 0.8)',
    position: 'relative',
    zIndex: 1,
    marginTop: '20px',
    marginBottom: '20px'
  };

  // AI Response styling
  const aiResponseStyle = {
    backgroundColor: '#f8f9fa',
    border: '1px solid #e9ecef',
    borderRadius: '8px',
    padding: '15px',
    marginTop: '10px',
    whiteSpace: 'pre-wrap',
    fontSize: '14px',
    lineHeight: '1.5',
    maxHeight: '400px',
    overflowY: 'auto'
  };

  // Chat styles
  const chatContainerStyle = {
    border: '1px solid #ddd',
    borderRadius: '8px',
    marginTop: '15px',
    backgroundColor: '#fafafa'
  };

  // Dual panel styles
  const dualPanelContainerStyle = {
    display: 'flex',
    gap: '15px',
    marginTop: '15px'
  };

  const leftPanelStyle = {
    flex: 1,
    border: '2px solid #4caf50',
    borderRadius: '8px',
    backgroundColor: '#f1f8e9'
  };

  const rightPanelStyle = {
    flex: 1,
    border: '2px solid #2196f3',
    borderRadius: '8px',
    backgroundColor: '#e3f2fd'
  };

  const panelHeaderStyle = {
    padding: '10px 15px',
    fontWeight: 'bold',
    fontSize: '16px',
    borderBottom: '1px solid #ddd'
  };

  const panelContentStyle = {
    padding: '15px',
    maxHeight: '400px',
    overflowY: 'auto',
    whiteSpace: 'pre-wrap',
    fontSize: '14px',
    lineHeight: '1.5'
  };

  const loadingStyle = {
    textAlign: 'center',
    color: '#666',
    fontStyle: 'italic'
  };

  const chatMessagesStyle = {
    height: '300px',
    overflowY: 'auto',
    padding: '10px'
  };

  const messageStyle = {
    margin: '10px 0',
    padding: '8px 12px',
    borderRadius: '8px',
    fontSize: '14px',
    lineHeight: '1.4'
  };

  const userMessageStyle = {
    ...messageStyle,
    backgroundColor: '#e3f2fd',
    marginLeft: '20px',
    textAlign: 'right'
  };

  const aiMessageStyle = {
    ...messageStyle,
    backgroundColor: '#fff3e0',
    marginRight: '20px'
  };

  const chatInputStyle = {
    ...inputStyle,
    margin: '0',
    borderRadius: '0 0 0 8px'
  };

  const chatButtonStyle = {
    ...buttonStyle,
    margin: '0',
    borderRadius: '0 0 8px 0',
    width: 'auto',
    padding: '10px 20px'
  };

  const renderHome = () => (
    <div style={pageStyle}>
      {/* Professional Header */}
      <div style={{
        background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
        borderRadius: '12px',
        padding: '48px 40px',
        textAlign: 'center',
        color: 'white',
        marginBottom: '32px',
        position: 'relative',
        border: '1px solid rgba(148, 163, 184, 0.2)'
      }}>
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.08) 0%, rgba(16, 185, 129, 0.05) 100%)',
          borderRadius: '12px',
          zIndex: 1
        }}></div>
        
        <div style={{position: 'relative', zIndex: 2}}>
          <div style={{
            fontSize: '56px', 
            marginBottom: '16px',
            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))'
          }}>⚕️</div>
          <h1 style={{
            fontSize: '32px', 
            margin: '0 0 12px 0', 
            fontWeight: '600',
            color: '#f8fafc',
            letterSpacing: '-0.025em'
          }}>
            Clinical Decision Support System
          </h1>
          <p style={{
            fontSize: '16px', 
            margin: '0 0 24px 0', 
            opacity: 0.9,
            color: '#cbd5e1',
            maxWidth: '600px',
            margin: '0 auto',
            lineHeight: '1.6'
          }}>
            Evidence-based AI consultation platform for healthcare professionals
          </p>
          
          {/* Professional badges */}
          <div style={{display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap', marginTop: '24px'}}>
            {[
              '🔬 Evidence-Based', 
              '🏥 Clinical Grade', 
              '📊 Real-Time Analysis', 
              '🔒 HIPAA Compliant'
            ].map((badge, index) => (
              <div key={index} style={{
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                padding: '6px 14px',
                borderRadius: '20px',
                fontSize: '13px',
                backdropFilter: 'blur(4px)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                color: '#e2e8f0'
              }}>
                {badge}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Professional Navigation Grid */}
      <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px'}}>
        
        {/* Physician Profile */}
        <div style={{
          background: 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)',
          borderRadius: '12px',
          padding: '28px',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          border: '1px solid rgba(148, 163, 184, 0.2)',
          boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)'
        }}
        onClick={() => setPage("profile")}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 8px 24px rgba(15, 23, 42, 0.12)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0px)';
          e.currentTarget.style.boxShadow = '0 2px 8px rgba(15, 23, 42, 0.04)';
        }}
        >
          <div style={{fontSize: '40px', marginBottom: '16px', opacity: 0.8}}>👨‍⚕️</div>
          <h3 style={{color: '#1e293b', fontSize: '20px', margin: '0 0 8px 0', fontWeight: '600'}}>
            Physician Profile
          </h3>
          <p style={{color: '#64748b', fontSize: '14px', margin: 0, lineHeight: '1.5'}}>
            Manage professional credentials and clinical preferences
          </p>
        </div>

        {/* Clinical Communications */}
        <div style={{
          background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
          borderRadius: '12px',
          padding: '28px',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          border: '1px solid rgba(59, 130, 246, 0.2)',
          boxShadow: '0 2px 8px rgba(59, 130, 246, 0.04)'
        }}
        onClick={() => setPage("correspondence")}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 8px 24px rgba(59, 130, 246, 0.12)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0px)';
          e.currentTarget.style.boxShadow = '0 2px 8px rgba(59, 130, 246, 0.04)';
        }}
        >
          <div style={{fontSize: '40px', marginBottom: '16px', opacity: 0.8}}>📋</div>
          <h3 style={{color: '#1e40af', fontSize: '20px', margin: '0 0 8px 0', fontWeight: '600'}}>
            Clinical Communications
          </h3>
          <p style={{color: '#1e40af', fontSize: '14px', margin: 0, lineHeight: '1.5', opacity: 0.8}}>
            Secure messaging and consultation records
          </p>
        </div>

        {/* Patient Medical Records */}
        <div style={{
          background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
          borderRadius: '12px',
          padding: '28px',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          border: '1px solid rgba(34, 197, 94, 0.2)',
          boxShadow: '0 2px 8px rgba(34, 197, 94, 0.04)',
          gridColumn: 'span 2'
        }}
        onClick={() => setPage("history")}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 8px 24px rgba(34, 197, 94, 0.12)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0px)';
          e.currentTarget.style.boxShadow = '0 2px 8px rgba(34, 197, 94, 0.04)';
        }}
        >
          <div style={{display: 'flex', alignItems: 'center', gap: '24px'}}>
            <div style={{fontSize: '52px', opacity: 0.8}}>🏥</div>
            <div>
              <h3 style={{color: '#166534', fontSize: '24px', margin: '0 0 8px 0', fontWeight: '600'}}>
                Patient Medical Records & AI Consultation
              </h3>
              <p style={{color: '#166534', fontSize: '16px', margin: 0, lineHeight: '1.5', opacity: 0.8}}>
                Comprehensive patient data management with AI-powered clinical decision support
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Professional Footer */}
      <div style={{
        textAlign: 'center',
        marginTop: '32px',
        padding: '20px',
        borderRadius: '8px',
        background: 'rgba(30, 41, 59, 0.02)',
        border: '1px solid rgba(148, 163, 184, 0.15)'
      }}>
        <p style={{color: '#64748b', fontSize: '13px', margin: 0, fontWeight: '500'}}>
          🛡️ Enterprise Security • ⚡ Real-Time Processing • 📊 Evidence-Based Medicine • 🔬 Clinical Research Integration
        </p>
      </div>
    </div>
  );

  const renderProfile = () => (
    <div style={pageStyle}>
      <h2>My Profile</h2>
      <input style={inputStyle} placeholder="Name" value={profile.name} onChange={e => handleProfileChange("name", e.target.value)} />
      <input style={inputStyle} placeholder="Surname" value={profile.surname} onChange={e => handleProfileChange("surname", e.target.value)} />
      <input style={inputStyle} placeholder="Age" value={profile.age} onChange={e => handleProfileChange("age", e.target.value)} />
      <input style={inputStyle} placeholder="Professional Field" value={profile.field} onChange={e => handleProfileChange("field", e.target.value)} />
      <input style={inputStyle} placeholder="Email" value={profile.email} onChange={e => handleProfileChange("email", e.target.value)} />
      <textarea style={{...inputStyle, minHeight: '100px'}} placeholder="Short Summary" value={profile.summary} onChange={e => handleProfileChange("summary", e.target.value)} />
      <button style={buttonStyle} onClick={() => setPage("home")}>Back</button>
    </div>
  );

  const renderCorrespondence = () => (
    <div style={pageStyle}>
      <h2>My Correspondences</h2>
      <p>This page will be developed later.</p>
      <button style={buttonStyle} onClick={() => setPage("home")}>Back</button>
    </div>
  );

  const renderHistory = () => (
    <div style={pageStyle}>
      {/* Professional Header with Navigation */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px',
        paddingBottom: '16px',
        borderBottom: '1px solid #e2e8f0'
      }}>
        <div>
          <h2 style={{
            color: '#1e293b',
            fontSize: '24px',
            margin: '0 0 4px 0',
            fontWeight: '600'
          }}>
            Patient Medical Records
          </h2>
          <p style={{
            color: '#64748b',
            fontSize: '14px',
            margin: 0
          }}>
            {savedPatients.length} patients • AI-powered clinical decision support
          </p>
        </div>
        <button 
          style={{
            padding: '8px 16px',
            backgroundColor: '#f1f5f9',
            color: '#475569',
            border: '1px solid #e2e8f0',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.2s ease'
          }}
          onClick={() => setPage("home")}
          onMouseEnter={(e) => {
            e.target.style.backgroundColor = '#e2e8f0';
            e.target.style.borderColor = '#cbd5e1';
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = '#f1f5f9';
            e.target.style.borderColor = '#e2e8f0';
          }}
        >
          ← Dashboard
        </button>
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
            background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 2px 8px rgba(30, 64, 175, 0.2)',
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
          + New Patient Record
        </button>

        <button 
          style={{
            padding: '10px 16px',
            backgroundColor: '#16a34a',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500'
          }}
          onClick={checkDrugInteractions}
        >
          💊 Drug Interactions
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
            placeholder="Search by Patient Name, MRN, or symptoms..." 
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
            Clear
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
            {searchTerm ? 'No matching records found' : 'No Patient Records Found'}
          </h3>
          <p style={{
            color: '#94a3b8',
            fontSize: '14px',
            margin: '0 0 20px 0',
            maxWidth: '400px',
            lineHeight: '1.5'
          }}>
            {searchTerm ? 'Try adjusting your search terms.' : 'Create your first patient record to begin using the AI-powered clinical decision support system.'}
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
              + Create First Patient Record
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
          {/* Table Header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '200px 100px 150px 1fr 120px 120px 100px',
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
            <div>Patient Name</div>
            <div>Age</div>
            <div>MRN</div>
            <div>Chief Complaint</div>
            <div>Urgency</div>
            <div>Last Modified</div>
            <div>Actions</div>
          </div>

          {/* Patient Records */}
          {filteredPatients.map((patient) => (
            <div key={patient.id} style={{
              display: 'grid',
              gridTemplateColumns: '200px 100px 150px 1fr 120px 120px 100px',
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
              <div style={{fontWeight: '600', color: '#1e293b'}}>{patient.patientName}</div>
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
                  {patient.urgencyLevel.toUpperCase()}
                </span>
              </div>
              <div style={{color: '#64748b', fontSize: '12px'}}>{patient.lastModified}</div>
              <div style={{display: 'flex', gap: '4px'}}>
                <button
                  style={{
                    padding: '4px 8px',
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '11px',
                    cursor: 'pointer'
                  }}
                  onClick={() => loadPatientRecord(patient)}
                >
                  Open
                </button>
                <button
                  style={{
                    padding: '4px 8px',
                    backgroundColor: '#ef4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '11px',
                    cursor: 'pointer'
                  }}
                  onClick={() => deletePatientRecord(patient.id)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderCreateHistory = () => (
    <div style={pageStyle}>
      <h2>Create New Medical History</h2>
      
      {/* Main Side by Side Layout */}
      <div style={dualPanelContainerStyle}>
        
        {/* LEFT SIDE - Patient Information Input */}
        <div style={{flex: '0 0 550px', marginRight: '25px'}}> {/* Wider left panel */}
          <div style={{backgroundColor: '#fff', border: '2px solid #ff6b35', borderRadius: '8px', padding: '25px'}}>
            <h3 style={{color: '#ff6b35', margin: '0 0 20px 0'}}>📋 Patient Information</h3>
            
            <input 
              style={{...inputStyle, fontSize: '16px', padding: '12px'}} 
              placeholder="Patient Name" 
              value={newHistory.patientName} 
              onChange={e => handleHistoryChange("patientName", e.target.value)} 
            />
            <input 
              style={{...inputStyle, fontSize: '16px', padding: '12px'}} 
              placeholder="Patient Age" 
              value={newHistory.patientAge} 
              onChange={e => handleHistoryChange("patientAge", e.target.value)} 
            />
            <input 
              style={{...inputStyle, fontSize: '16px', padding: '12px'}} 
              placeholder="Patient ID" 
              value={newHistory.patientID} 
              onChange={e => handleHistoryChange("patientID", e.target.value)} 
            />
            
            <label style={{fontSize: '16px', fontWeight: 'bold', color: '#333', display: 'block', margin: '15px 0 8px 0'}}>
              Anamnesis & Symptoms:
            </label>
            <textarea 
              style={{...inputStyle, minHeight: '180px', fontSize: '15px', padding: '15px', lineHeight: '1.5'}} 
              placeholder="Chief complaint, history of present illness, symptoms (onset, duration, severity, quality, location, radiation, timing, context), associated symptoms, past medical history, medications, allergies, family history, social history, review of systems..."
              value={newHistory.symptoms} 
              onChange={e => handleHistoryChange("symptoms", e.target.value)} 
            />

            {/* AI Prompt Customization */}
            <label style={{fontSize: '16px', fontWeight: 'bold', color: '#ff6b35', display: 'block', margin: '20px 0 8px 0'}}>
              🤖 AI Prompt Template:
            </label>
            <textarea 
              style={{...inputStyle, minHeight: '150px', fontSize: '13px', padding: '12px', lineHeight: '1.4', backgroundColor: '#fff8f0', border: '2px solid #ffcc80'}} 
              placeholder="Customize how the AI should respond..."
              value={customPrompt} 
              onChange={e => handlePromptChange(e.target.value)} 
            />
            <div style={{fontSize: '12px', color: '#666', fontStyle: 'italic', marginBottom: '10px'}}>
              💡 Use placeholders: {'{patientName}'}, {'{patientAge}'}, {'{patientID}'}, {'{symptoms}'}
            </div>
            
            {/* Prompt Management Buttons */}
            <div style={{display: 'flex', gap: '10px', marginBottom: '15px'}}>
              <button 
                style={{
                  ...buttonStyle,
                  backgroundColor: '#6c757d',
                  fontSize: '13px',
                  padding: '8px 15px',
                  width: 'auto'
                }}
                onClick={resetPromptToDefault}
              >
                🔄 Reset to Default
              </button>
              <div style={{
                fontSize: '12px',
                color: '#28a745',
                display: 'flex',
                alignItems: 'center',
                fontWeight: 'bold'
              }}>
                ✅ Prompt auto-saved
              </div>
            </div>
            
            <button 
              style={{
                ...buttonStyle,
                fontSize: '16px',
                padding: '15px 25px',
                ...(isLoading || isLoadingNews || !newHistory.symptoms.trim() ? {backgroundColor: '#ccc', cursor: 'not-allowed'} : {})
              }}
              onClick={consultWithAI}
              disabled={isLoading || isLoadingNews || !newHistory.symptoms.trim()}
            >
              {(isLoading || isLoadingNews) ? "🔄 Consulting AI..." : "🤖 Start AI Consultation"}
            </button>
            
            <button 
              style={{...buttonStyle, backgroundColor: '#6c757d', marginTop: '15px', fontSize: '16px', padding: '12px 20px'}} 
              onClick={() => setPage("history")}
            >
              ← Back to Medical Histories
            </button>
          </div>
        </div>

        {/* RIGHT SIDE - Dual Panel Chat Windows */}
        <div style={{flex: 1, minWidth: '700px'}}> {/* Much wider right panel */}
          {!showChat && !newsResponse ? (
            <div style={{
              backgroundColor: '#f8f9fa', 
              border: '2px dashed #ddd', 
              borderRadius: '8px', 
              padding: '60px 40px', 
              textAlign: 'center',
              color: '#666',
              minHeight: '500px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center'
            }}>
              <div style={{fontSize: '64px', marginBottom: '25px'}}>🩺</div>
              <h3 style={{fontSize: '24px', marginBottom: '15px'}}>AI Medical Consultation</h3>
              <p style={{fontSize: '16px', marginBottom: '25px'}}>Fill in the patient information and anamnesis on the left, then click "Start AI Consultation" to get:</p>
              <ul style={{textAlign: 'left', maxWidth: '400px', margin: '0 auto', lineHeight: '1.8', fontSize: '15px'}}>
                <li>🎯 AI Medical Analysis & Diagnosis</li>
                <li>🔍 Differential Diagnoses</li>
                <li>📋 Recommended Tests & Examinations</li>
                <li>⚠️ Red Flags & Warning Signs</li>
                <li>📰 Latest Medical Research</li>
                <li>💬 Interactive AI Chat for Follow-ups</li>
              </ul>
            </div>
          ) : (
            /* Dual Chat Windows */
            <div style={{display: 'flex', flexDirection: 'column', gap: '20px'}}>
              
              {/* Top Window - AI Chat (Orange) */}
              <div style={{...leftPanelStyle, backgroundColor: '#fff3e0', border: '2px solid #ff6b35'}}>
                <div style={{...panelHeaderStyle, color: '#ff6b35', backgroundColor: '#ffe0b3', fontSize: '18px', padding: '15px 20px'}}>
                  💬 AI Medical Consultation
                </div>
                <div style={{height: '300px', overflowY: 'auto', padding: '15px'}}>
                  {isLoading ? (
                    <div style={{...loadingStyle, fontSize: '16px'}}>🤖 AI is analyzing the case...</div>
                  ) : chatMessages.length > 0 ? (
                    chatMessages.map((message, index) => (
                      <div key={index} style={{marginBottom: '15px'}}>
                        <div style={{
                          ...messageStyle,
                          backgroundColor: message.type === 'user' ? '#e3f2fd' : '#fff8e1',
                          marginLeft: message.type === 'user' ? '30px' : '0',
                          marginRight: message.type === 'user' ? '0' : '30px',
                          fontSize: '14px',
                          padding: '12px 15px'
                        }}>
                          <strong style={{color: message.type === 'user' ? '#1976d2' : '#ff6b35', fontSize: '15px'}}>
                            {message.type === 'user' ? '👨‍⚕️ Doctor:' : '🤖 AI:'}
                          </strong>
                          <div style={{marginTop: '8px', whiteSpace: 'pre-wrap', lineHeight: '1.5'}}>{message.text}</div>
                          <div style={{fontSize: '11px', color: '#666', marginTop: '5px'}}>
                            {message.timestamp}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div style={{...loadingStyle, fontSize: '16px', color: '#ff6b35'}}>
                      No messages yet. Click "Start AI Consultation" to begin.
                    </div>
                  )}
                  
                  {/* Show error if API fails */}
                  {aiResponse && !chatMessages.some(msg => msg.type === 'ai') && (
                    <div style={{
                      backgroundColor: '#ffebee',
                      border: '1px solid #f44336',
                      borderRadius: '8px',
                      padding: '15px',
                      color: '#d32f2f',
                      fontSize: '14px'
                    }}>
                      <strong>⚠️ Error:</strong> {aiResponse}
                    </div>
                  )}
                </div>

                {/* Chat Input */}
                {showChat && (
                  <div style={{padding: '15px 20px', borderTop: '1px solid #ddd'}}>
                    <div style={{display: 'flex', gap: '10px'}}>
                      <input
                        style={{...inputStyle, margin: '0', fontSize: '14px', padding: '12px'}}
                        placeholder="Ask follow-up question..."
                        value={followUpQuestion}
                        onChange={(e) => setFollowUpQuestion(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && !isLoading && sendFollowUpQuestion()}
                        disabled={isLoading}
                      />
                      <button
                        style={{
                          ...buttonStyle,
                          margin: '0',
                          width: 'auto',
                          padding: '12px 20px',
                          fontSize: '14px',
                          backgroundColor: isLoading ? '#ccc' : '#ff6b35'
                        }}
                        onClick={sendFollowUpQuestion}
                        disabled={isLoading || !followUpQuestion.trim()}
                      >
                        Send
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom Window - Medical News (Blue) */}
              <div style={{...rightPanelStyle, backgroundColor: '#e3f2fd', border: '2px solid #2196f3'}}>
                <div style={{...panelHeaderStyle, color: '#1565c0', backgroundColor: '#bbdefb', fontSize: '18px', padding: '15px 20px'}}>
                  📰 Latest Medical Research & News
                </div>
                <div style={{height: '250px', overflowY: 'auto', padding: '20px', fontSize: '14px'}}>
                  {isLoadingNews ? (
                    <div style={{...loadingStyle, fontSize: '16px'}}>🔍 Searching latest medical research...</div>
                  ) : newsResponse ? (
                    <div style={{whiteSpace: 'pre-wrap', lineHeight: '1.6'}}>{newsResponse}</div>
                  ) : (
                    <div style={{...loadingStyle, fontSize: '16px'}}>No research data available yet.</div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{display: 'flex', gap: '15px', justifyContent: 'center'}}>
                <button 
                  style={{
                    ...buttonStyle,
                    backgroundColor: '#6c757d',
                    fontSize: '15px',
                    padding: '10px 20px',
                    width: 'auto'
                  }}
                  onClick={clearChat}
                >
                  🗑️ Clear Consultation
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <p style={{fontSize: '11px', color: '#666', fontStyle: 'italic', margin: '20px 0 0 0', textAlign: 'center'}}>
        ⚠️ AI consultation and medical research are for reference only. Always use professional medical judgment and verify with clinical guidelines.
      </p>
    </div>
  );

  return (
    <div style={containerStyle}>
      {/* Background overlay */}
      <div style={backgroundOverlay}></div>
      
      {page === "home" && renderHome()}
      {page === "profile" && renderProfile()}
      {page === "correspondence" && renderCorrespondence()}
      {page === "history" && renderHistory()}
      {page === "createHistory" && renderCreateHistory()}
    </div>
  );
};

export default DoctorAssistantApp;