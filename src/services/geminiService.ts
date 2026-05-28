import { GoogleGenAI, Type } from "@google/genai";
import { Transaction, AIInsight } from "../types";

let activeApiKey = '';

export function setGeminiApiKey(key: string) {
  activeApiKey = key;
  if (key) {
    localStorage.setItem('nova_gemini_api_key', key);
  }
}

function getGeminiClient() {
  const keyToUse = activeApiKey || localStorage.getItem('nova_gemini_api_key') || process.env.GEMINI_API_KEY || '';
  return new GoogleGenAI({ 
    apiKey: keyToUse,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build'
      }
    }
  });
}

export async function analyzeExpenses(transactions: Transaction[]): Promise<AIInsight[]> {
  const keyToUse = activeApiKey || localStorage.getItem('nova_gemini_api_key') || process.env.GEMINI_API_KEY || '';
  if (!keyToUse) {
    console.warn("GEMINI_API_KEY not configured. Using placeholder insights.");
    return [
      {
        id: "ai-err-no-key",
        type: "warning",
        message: "No se ha configurado la clave de API de Gemini. Por favor, añada su clave de API de Gemini en el panel de Configuraciones para activar el Asistente Inteligente.",
        impact: "Clave Requerida"
      }
    ];
  }

  const prompt = `
    Analiza las siguientes transacciones financieras y proporciona 3 insights clave en formato JSON.
    Los insights deben ser:
    1. Una advertencia sobre un gasto excesivo o tendencia negativa.
    2. Una sugerencia de ahorro o mejora.
    3. Un elogio o refuerzo positivo sobre un buen hábito detectado.

    Transacciones:
    ${JSON.stringify(transactions)}

    Responde ÚNICAMENTE con un array de objetos JSON que sigan esta estructura:
    {
      "type": "warning" | "suggestion" | "praise",
      "message": "string",
      "impact": "string (opcional, ej: 'Ahorra RD$1,000/mes')"
    }
  `;

  try {
    const aiInstance = getGeminiClient();
    const response = await aiInstance.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              type: { type: Type.STRING, enum: ["warning", "suggestion", "praise"] },
              message: { type: Type.STRING },
              impact: { type: Type.STRING }
            },
            required: ["type", "message"]
          }
        }
      }
    });

    const text = response.text;
    if (!text) return [];
    return JSON.parse(text).map((item: any, index: number) => ({
      ...item,
      id: `ai-${Date.now()}-${index}`
    }));
  } catch (error: any) {
    console.error("Error analyzing expenses with Gemini:", error);
    const errorStr = typeof error === 'object' ? JSON.stringify(error) : String(error);
    
    if (errorStr.includes("leaked") || errorStr.includes("403") || errorStr.includes("PERMISSION_DENIED")) {
      return [
        {
          id: `ai-err-leaked-${Date.now()}`,
          type: "warning",
          message: "⚠️ Tu clave de API de Gemini ha sido reportada como filtrada (leaked) y bloqueada por Google. Por seguridad, ingresa una nueva clave de API válida en las Configuraciones (icono de engranaje).",
          impact: "Acción requerida: Configurar API Key"
        }
      ];
    }
    
    return [
      {
        id: `ai-err-general-${Date.now()}`,
        type: "warning",
        message: `No se pudo conectar con el Asistente de IA: ${error?.message || "Servicio no disponible temporalmente."}`,
        impact: "Error de conexión"
      }
    ];
  }
}

export async function chatWithAI(messages: { role: 'user' | 'assistant', content: string }[], transactions: Transaction[]) {
  const keyToUse = activeApiKey || localStorage.getItem('nova_gemini_api_key') || process.env.GEMINI_API_KEY || '';
  if (!keyToUse) return "Lo siento, el Asistente Inteligente no tiene configurada una clave de API de Gemini válida en las Configuraciones.";

  const systemInstruction = `
    Eres un asistente financiero experto llamado Financiera Nova. 
    Tu objetivo es ayudar al usuario a ahorrar dinero y entender sus finanzas.
    Tienes acceso a sus transacciones recientes para dar consejos personalizados.
    Sé amable, profesional y motivador.
    Usa markdown para dar formato a tus respuestas.
    
    Transacciones actuales:
    ${JSON.stringify(transactions)}
  `;

  try {
    const aiInstance = getGeminiClient();
    const response = await aiInstance.models.generateContent({
      model: "gemini-3.5-flash",
      contents: messages.map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }]
      })),
      config: {
        systemInstruction
      }
    });

    return response.text || "No pude generar una respuesta.";
  } catch (error: any) {
    console.error("Error in AI chat:", error);
    const errorStr = typeof error === 'object' ? JSON.stringify(error) : String(error);
    
    if (errorStr.includes("leaked") || errorStr.includes("403") || errorStr.includes("PERMISSION_DENIED")) {
      return "⚠️ **Error de Seguridad (API Key reportada como filtrada)**\n\nTu clave de API de Gemini actual ha sido reportada como **filtrada o expuesta (leaked)** pública o accidentalmente en algún repositorio o foro. Por esta razón, los servidores de Google han inhabilitado y bloqueado esta clave por seguridad para que nadie pueda abusar de ella.\n\n**Para solucionarlo:**\n1. Ve al panel de **Configuraciones / Claves de API** (icono de engranaje en la sección de Recordatorios).\n2. Adquiere una nueva clave de API de Gemini de forma gratuita en tu Google AI Studio.\n3. Pégala allí y presiona **Guardar Clave de API**.\n\nUna vez hecho esto, tu Asistente Inteligente funcionará de nuevo sin inconvenientes.";
    }
    
    return `Hubo un error al procesar tu solicitud con el Asistente Inteligente. Detalle: ${error?.message || errorStr}`;
  }
}
