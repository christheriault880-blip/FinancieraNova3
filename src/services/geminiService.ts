import { GoogleGenAI, Type } from "@google/genai";
import { Transaction, AIInsight } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export async function analyzeExpenses(transactions: Transaction[]): Promise<AIInsight[]> {
  if (!process.env.GEMINI_API_KEY) {
    console.warn("GEMINI_API_KEY not found. Using mock insights.");
    return [];
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
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
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
  } catch (error) {
    console.error("Error analyzing expenses with Gemini:", error);
    return [];
  }
}

export async function chatWithAI(messages: { role: 'user' | 'assistant', content: string }[], transactions: Transaction[]) {
  if (!process.env.GEMINI_API_KEY) return "Lo siento, la IA no está configurada correctamente.";

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
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: messages.map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }]
      })),
      config: {
        systemInstruction
      }
    });

    return response.text || "No pude generar una respuesta.";
  } catch (error) {
    console.error("Error in AI chat:", error);
    return "Hubo un error al procesar tu solicitud.";
  }
}
