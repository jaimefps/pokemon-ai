const fs = require("fs")
const Anthropic = require("@anthropic-ai/sdk")
const AIProvider = require("./base")

const MAX_HISTORY = 20

class AnthropicProvider extends AIProvider {
  async init() {
    this.client = new Anthropic({ apiKey: this.config.apiKey })
    this.model = this.config.model || "claude-sonnet-4-5-20250929"
    this.conversationHistory = this.seedGoals("assistant", (role, content) => ({
      role, content,
    }))
  }

  async analyzeScreenshot(filePath) {
    const imageData = fs.readFileSync(filePath).toString("base64")
    const mediaType = "image/png"

    const userMessage = {
      role: "user",
      content: [
        {
          type: "image",
          source: {
            type: "base64",
            media_type: mediaType,
            data: imageData,
          },
        },
      ],
    }

    this.conversationHistory.push(userMessage)

    console.log("analyzing screenshot...")
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 1024,
      system: this.systemPrompt,
      messages: this.conversationHistory,
    })

    const raw = response.content[0].text

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

module.exports = AnthropicProvider
