async function sendGroqMessage(userText) {
    const apiKey = (state.aiSettings && state.aiSettings.groqApiKey) || localStorage.getItem("GROQ_API_KEY") || "";
    
    if (!apiKey) {
        throw new Error("يرجى إضافة مفتاح Groq API في إعدادات الذكاء الاصطناعي أولاً.");
    }

    const messages = [
        { role: "system", content: "أنت مساعد ذكي لحضانة براعم الإيمان. تجيب باللغة العربية باختصار ووضوح." },
        ...state.aiSettings.history.filter(m => m.role !== 'system')
    ];

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            model: "llama3-70b-8192",
            messages: messages
        })
    });

    if (!response.ok) throw new Error("Network error");
    const data = await response.json();
    const responseMessage = data.choices[0].message;
    
    state.aiSettings.history.push(responseMessage);
    ui.aiIsTyping = false;
    saveState();
    render();
}
