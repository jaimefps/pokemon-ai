const fs = require("fs")
const { GoogleGenAI } = require("@google/genai")
const AIProvider = require("./base")

class GeminiProvider extends AIProvider {
  async init() {
    this.client = new GoogleGenAI({ apiKey: this.config.apiKey })
    this.model = this.config.model || "gemini-3-pro-preview"
    this.conversationHistory = this.seedGoals("model", (role, text) => ({
      role, parts: [{ text }],
    }))
  }

  async analyzeScreenshot(filePath) {
    const imageData = fs.readFileSync(filePath).toString("base64")

    this.conversationHistory.push({
      role: "user",
      parts: [{ inlineData: { mimeType: "image/png", data: imageData } }],
    })

    console.log("analyzing screenshot...")
    const response = await this.withTimeout(
      this.client.models.generateContent({
        model: this.model,
        contents: this.conversationHistory,
        config: {
          systemInstruction: this.systemPrompt,
          maxOutputTokens: 4096,
        },
      })
    )

    const raw = response.text

    this.conversationHistory.push({
      role: "model",
      parts: [{ text: raw }],
    })

    this.trimHistory()
    this.stripOldImages(msg => {
      msg.parts = [{ text: "(screenshot omitted)" }]
    })

    return this.parseJSON(raw)
  }
}

module.exports = GeminiProvider
