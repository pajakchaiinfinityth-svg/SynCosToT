
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { GoogleGenAI, Modality } from "@google/genai";
import { AspectRatio, ComplexityLevel, VisualStyle, ResearchResult, SearchResultItem, Language, ImageGenerationModel, ImageSize } from "../types";

// Create a fresh client for every request to ensure the latest API key from process.env.API_KEY is used
const getAi = () => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

// Model definitions based on latest guidelines
const RESEARCH_MODEL = 'gemini-2.5-flash'; // Supports both Search and Maps grounding
const CHAT_MODEL = 'gemini-3-pro-preview';
const VISION_MODEL = 'gemini-3-pro-preview';
const TRANSCRIPTION_MODEL = 'gemini-3-flash-preview';
const TTS_MODEL = 'gemini-2.5-flash-preview-tts';

const getLevelInstruction = (level: ComplexityLevel): string => {
  switch (level) {
    case 'Elementary':
      return "Target Audience: Elementary School (Ages 6-10). Style: Bright, simple, fun. Use large clear icons and very minimal text labels.";
    case 'High School':
      return "Target Audience: High School. Style: Standard Textbook. Clean lines, clear labels, accurate maps or diagrams. Avoid cartoony elements.";
    case 'College':
      return "Target Audience: University. Style: Academic Journal. High detail, data-rich, precise cross-sections or complex schematics.";
    case 'Expert':
      return "Target Audience: Industry Expert. Style: Technical Blueprint/Schematic. Extremely dense detail, monochrome or technical coloring, precise annotations.";
    default:
      return "Target Audience: General Public. Style: Clear and engaging.";
  }
};

const getStyleInstruction = (style: VisualStyle): string => {
  switch (style) {
    case 'Minimalist': return "Aesthetic: Bauhaus Minimalist. Flat vector art, limited color palette (2-3 colors), reliance on negative space and simple geometric shapes.";
    case 'Realistic': return "Aesthetic: Photorealistic Composite. Cinematic lighting, 8k resolution, highly detailed textures. Looks like a photograph.";
    case 'Cartoon': return "Aesthetic: Educational Comic. Vibrant colors, thick outlines, expressive cel-shaded style.";
    case 'Vintage': return "Aesthetic: 19th Century Scientific Lithograph. Engraving style, sepia tones, textured paper background, fine hatch lines.";
    case 'Futuristic': return "Aesthetic: Cyberpunk HUD. Glowing neon blue/cyan lines on dark background, holographic data visualization, 3D wireframes.";
    case '3D Render': return "Aesthetic: 3D Isometric Render. Claymorphism or high-gloss plastic texture, studio lighting, soft shadows, looks like a physical model.";
    case 'Sketch': return "Aesthetic: Da Vinci Notebook. Ink on parchment sketch, handwritten annotations style, rough but accurate lines.";
    case 'Geometric Patterns': return "Aesthetic: Art Deco Geometric Patterns. Emphasizes intricate geometric shapes, symmetry, and repeating patterns. Color palette inspired by Art Deco including gold, black, emerald, and cream. Elegant and architectural.";
    default: return "Aesthetic: High-quality digital scientific illustration. Clean, modern, highly detailed.";
  }
};

export const researchTopicForPrompt = async (
  topic: string, 
  level: ComplexityLevel, 
  style: VisualStyle,
  language: Language
): Promise<ResearchResult> => {
  
  const levelInstr = getLevelInstruction(level);
  const styleInstr = getStyleInstruction(style);
  
  // Try to get user location for better Maps grounding
  let latLng = undefined;
  try {
    const pos = await new Promise<GeolocationPosition>((res, rej) => navigator.geolocation.getCurrentPosition(res, rej, { timeout: 5000 }));
    latLng = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
  } catch (e) {
    console.warn("Location access denied or timed out for Maps grounding.");
  }

  const systemPrompt = `
    You are an expert visual researcher and data journalist.
    Your goal is to research the topic: "${topic}" and create a factual plan for an infographic.
    
    **CRITICAL: Use both Google Search and Google Maps tools to find the most accurate, up-to-date information, local details, and factual data about this topic.**
    
    Context:
    ${levelInstr}
    ${styleInstr}
    Language: ${language}
    
    Please provide your response in the following format EXACTLY:
    
    FACTS:
    - [Fact 1]
    - [Fact 2]
    - [Fact 3]
    
    IMAGE_PROMPT:
    [A highly detailed image generation prompt describing the visual composition, colors, and layout for the infographic. Do not include citations in the prompt string itself.]
  `;

  const response = await getAi().models.generateContent({
    model: RESEARCH_MODEL,
    contents: systemPrompt,
    config: {
      tools: [{ googleSearch: {} }, { googleMaps: {} }],
      toolConfig: latLng ? {
        retrievalConfig: { latLng }
      } : undefined
    },
  });

  const text = response.text || "";
  
  // Parse Facts
  const factsMatch = text.match(/FACTS:\s*([\s\S]*?)(?=IMAGE_PROMPT:|$)/i);
  const factsRaw = factsMatch ? factsMatch[1].trim() : "";
  const facts = factsRaw.split('\n')
    .map(f => f.replace(/^-\s*/, '').trim())
    .filter(f => f.length > 0)
    .slice(0, 5);

  // Parse Prompt
  const promptMatch = text.match(/IMAGE_PROMPT:\s*([\s\S]*?)$/i);
  const imagePrompt = promptMatch ? promptMatch[1].trim() : `Create a detailed infographic about ${topic}. ${levelInstr} ${styleInstr}`;

  // Extract Grounding (Search and Maps Results)
  const searchResults: SearchResultItem[] = [];
  const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
  
  if (chunks) {
    chunks.forEach(chunk => {
      if (chunk.web?.uri && chunk.web?.title) {
        searchResults.push({ title: chunk.web.title, url: chunk.web.uri });
      } else if (chunk.maps?.uri && chunk.maps?.title) {
        searchResults.push({ title: `Map: ${chunk.maps.title}`, url: chunk.maps.uri });
      }
    });
  }

  const uniqueResults = Array.from(new Map(searchResults.map(item => [item.url, item])).values());

  return {
    imagePrompt: imagePrompt,
    facts: facts,
    searchResults: uniqueResults
  };
};

export const generateInfographicImage = async (
  prompt: string, 
  model: ImageGenerationModel, 
  aspectRatio: AspectRatio,
  size: ImageSize = '1K'
): Promise<string> => {
  const ai = getAi();
  
  if (model === 'imagen-4.0-generate-001') {
    const response = await ai.models.generateImages({
      model: model,
      prompt: prompt,
      config: {
        numberOfImages: 1,
        outputMimeType: 'image/jpeg',
        aspectRatio: aspectRatio,
      },
    });
    const base64EncodeString = response.generatedImages[0].image.imageBytes;
    return `data:image/jpeg;base64,${base64EncodeString}`;
  }

  // Gemini models (nano banana series)
  const config: any = {
    imageConfig: {
      aspectRatio: aspectRatio
    }
  };

  if (model === 'gemini-3-pro-image-preview') {
    config.imageConfig.imageSize = size;
  }

  const response = await ai.models.generateContent({
    model: model,
    contents: {
      parts: [{ text: prompt }]
    },
    config
  });

  for (const part of response.candidates[0].content.parts) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  
  throw new Error("Failed to generate image output from model");
};

export const editInfographicImage = async (
  currentImageBase64: string, 
  editInstruction: string, 
  model: ImageGenerationModel, 
  aspectRatio: AspectRatio
): Promise<string> => {
  const cleanBase64 = currentImageBase64.replace(/^data:image\/(png|jpeg|jpg);base64,/, '');
  const ai = getAi();

  if (model === 'imagen-4.0-generate-001') {
    return generateInfographicImage(`Modified version of previous scene: ${editInstruction}`, model, aspectRatio);
  }

  const response = await getAi().models.generateContent({
    model: model,
    contents: {
      parts: [
         { inlineData: { mimeType: 'image/jpeg', data: cleanBase64 } },
         { text: editInstruction }
      ]
    },
    config: {
      imageConfig: {
        aspectRatio: aspectRatio
      }
    }
  });
  
  for (const part of response.candidates[0].content.parts) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  throw new Error("Failed to edit image");
};

export const chatWithGemini = async (message: string, history: {role: string, parts: any[]}[] = []) => {
  const ai = getAi();
  const chat = ai.chats.create({
    model: CHAT_MODEL,
    config: {
      systemInstruction: "You are InfoGenius, a helpful AI assistant specialized in research and visual information design. Keep responses concise and insightful."
    }
  });
  
  const response = await chat.sendMessage({ message });
  return response.text;
};

export const analyzeImageWithGemini = async (
  imageBase64: string, 
  question: string, 
  context: string,
  language: Language
): Promise<string> => {
  const cleanBase64 = imageBase64.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, '');
  
  const analysisPrompt = `
    Analyze this image in ${language}. 
    
    Targeted Question/Context provided by user: "${question || 'Provide a general detailed analysis.'}"
    Additional Context: "${context || 'Focus on visual clarity and factual representation.'}"
    
    Provide a professional, informative report identifying key elements and answering the user's specific query.
  `;

  const response = await getAi().models.generateContent({
    model: VISION_MODEL,
    contents: {
      parts: [
        { inlineData: { mimeType: 'image/jpeg', data: cleanBase64 } },
        { text: analysisPrompt }
      ]
    }
  });

  return response.text || "No analysis available.";
};

export const transcribeAudio = async (base64Audio: string, mimeType: string): Promise<string> => {
  const response = await getAi().models.generateContent({
    model: TRANSCRIPTION_MODEL,
    contents: [
      {
        parts: [
          { inlineData: { data: base64Audio, mimeType } },
          { text: "Transcribe this audio message. Provide only the text of the transcription." }
        ]
      }
    ]
  });
  return response.text || "";
};

export const generateSpeech = async (text: string): Promise<string> => {
  const response = await getAi().models.generateContent({
    model: TTS_MODEL,
    contents: [{ parts: [{ text: `Speak this message clearly: ${text}` }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: 'Kore' },
        },
      },
    },
  });
  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!base64Audio) throw new Error("Failed to generate speech");
  return base64Audio;
};
