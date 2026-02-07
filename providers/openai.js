const fs = require("fs")
const OpenAI = require("openai")
const AIProvider = require("./base")

const MAX_HISTORY = 20

class OpenAIProvider extends AIProvider {
  async init() {
    this.client = new OpenAI({ apiKey: this.config.apiKey })
    this.model = this.config.model || "gpt-5.2"
    this.conversationHistory = this.seedGoals("assistant", (role, content) => ({
      role, content,
    }))
  }

  async analyzeScreenshot(filePath) {
    const imageData = fs.readFileSync(filePath).toString("base64")

    const userMessage = {
      role: "user",
      content: [
        {
          type: "image_url",
          image_url: {
            url: `data:image/png;base64,${imageData}`,
          },
        },
      ],
    }

    this.conversationHistory.push(userMessage)

    console.log("analyzing screenshot...")
    const response = await this.client.chat.completions.create({
      model: this.model,
      max_tokens: 1024,
      messages: [
        { role: "system", content: this.systemPrompt },
        ...this.conversationHistory,
      ],
    })

    const raw = response.choices[0].message.content

    this.conversationHistory.push({
      role: "assistant",
      content: raw,
    })

    // Trim history to avoid unbounded growth
    if (this.conversationHistory.length > MAX_HISTORY * 2) {
      this.conversationHistory = this.conversationHistory.slice(-MAX_HISTORY * 2)
    }

    try {
      return JSON.parse(raw)
    } catch (err) {
      throw new Error(`failed to parse response: ${err}`)
    }
  }
}

module.exports = OpenAIProvider
