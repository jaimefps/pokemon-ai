const fs = require("fs")
const { GoogleGenAI } = require("@google/genai")
const AIProvider = require("./base")

const MAX_HISTORY = 20

class GeminiProvider extends AIProvider {
  async init() {
    this.client = new GoogleGenAI({ apiKey: this.config.apiKey })
    this.model = this.config.model || "gemini-3-pro-preview"
    this.conversationHistory = []
  }

  async analyzeScreenshot(filePath) {
    const imageData = fs.readFileSync(filePath).toString("base64")

    const userMessage = {
      role: "user",
      parts: [
        {
          inlineData: {
            mimeType: "image/png",
            data: imageData,
          },
        },
      ],
    }

    this.conversationHistory.push(userMessage)

    console.log("analyzing screenshot...")
    const response = await this.client.models.generateContent({
      model: this.model,
      contents: this.conversationHistory,
      config: {
        systemInstruction: this.systemPrompt,
        maxOutputTokens: 4096,
      },
    })

    const raw = response.text

    this.conversationHistory.push({
      role: "model",
      parts: [{ text: raw }],
    })

    // Trim history to avoid unbounded growth
    if (this.conversationHistory.length > MAX_HISTORY * 2) {
      this.conversationHistory = this.conversationHistory.slice(-MAX_HISTORY * 2)
    }

    try {
      // Gemini often wraps JSON in markdown code fences
      const cleaned = raw.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "")
      return JSON.parse(cleaned)
    } catch (err) {
      throw new Error(`failed to parse response: ${err}`)
    }
  }
}

module.exports = GeminiProvider
