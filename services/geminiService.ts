import { GoogleGenAI, Type } from "@google/genai";
import { Fermenter, BrewingInsightData } from "../types";

const initGenAI = () => {
  if (!process.env.API_KEY) {
    console.warn("API_KEY not found in environment variables.");
    return null;
  }
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

export const getBrewingInsights = async (fermenter: Fermenter): Promise<BrewingInsightData | null> => {
  const ai = initGenAI();
  if (!ai) {
    console.error("Erro: Chave de API não configurada.");
    return null;
  }

  // Downsample readings to avoid token limits, taking 1 reading every ~4 hours
  const filteredReadings = fermenter.readings.filter((_, i) => i % 4 === 0).map(r => ({
    t: r.timestamp,
    grav: r.gravity,
    beerT: r.beerTemp,
    fridgeT: r.fridgeTemp,
    tgt: r.targetTemp
  }));

  const prompt = `
    Aja como um Mestre Cervejeiro experiente e técnico. Analise os seguintes dados de fermentação para a cerveja "${fermenter.beerName}" (Estilo: ${fermenter.style}).
    
    Estado Atual: ${fermenter.status}
    OG: ${fermenter.og}
    Volume: ${fermenter.volume}L
    Target Temp (Setpoint): ${fermenter.targetTemp}°C
    
    Sensores Atuais:
    - Temp Mosto (Poço Termométrico): ${fermenter.currentDevice.temperature}°C
    - Temp Geladeira (Ambiente): ${fermenter.currentFridgeTemp}°C
    - Gravidade Atual: ${fermenter.currentDevice.gravity}
    
    Histórico recente (amostra temporal):
    ${JSON.stringify(filteredReadings.slice(-15))} 
    
    Por favor, forneça uma análise estruturada da saúde da fermentação, riscos, recomendações, previsão de FG e dias restantes estimados. Responda em Português do Brasil.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING, description: "Resumo curto do status da fermentação" },
            healthScore: { type: Type.INTEGER, description: "Nota de 0 a 100 indicando a saúde da fermentação" },
            predictedFG: { type: Type.NUMBER, description: "Previsão da gravidade final (FG) baseada na atenuação atual" },
            estimatedDaysRemaining: { type: Type.INTEGER, description: "Estimativa de dias restantes para concluir a fermentação" },
            risks: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  level: { type: Type.STRING, description: "Nível de risco: LOW, MEDIUM, ou HIGH" },
                  message: { type: Type.STRING, description: "Descrição do risco" }
                }
              }
            },
            recommendations: {
              type: Type.ARRAY,
              items: { type: Type.STRING, description: "Recomendação acionável" }
            }
          },
          required: ["summary", "healthScore", "predictedFG", "estimatedDaysRemaining", "risks", "recommendations"]
        }
      }
    });
    
    if (response.text) {
      return JSON.parse(response.text) as BrewingInsightData;
    }
    return null;
  } catch (error) {
    console.error("Gemini API Error:", error);
    return null;
  }
};