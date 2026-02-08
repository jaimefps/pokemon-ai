const fs = require("fs")
const Anthropic = require("@anthropic-ai/sdk")
const AIProvider = require("./base")

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

    this.conversationHistory.push({
      role: "user",
      content: [{
        type: "image",
        source: { type: "base64", media_type: "image/png", data: imageData },
      }],
    })

    console.log("analyzing screenshot...")
    const response = await this.withTimeout(
      this.client.messages.create({
        model: this.model,
        max_tokens: 1024,
        system: this.systemPrompt,
        messages: this.conversationHistory,
      })
    )

    const raw = response.content[0].text

    this.conversationHistory.push({
      role: "assistant",
      content: raw,
    })

    this.trimHistory()
    this.stripOldImages(msg => {
      msg.content = [{ type: "text", text: "(screenshot omitted)" }]
    })

    return this.parseJSON(raw)
  }
}

module.exports = AnthropicProvider
