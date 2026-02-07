const fs = require("fs")
const path = require("path")

class AIProvider {
  constructor(config) {
    this.config = config
    this.systemPrompt = fs.readFileSync(
      path.join(__dirname, "..", "prompts", "v6.txt"),
      "utf-8"
    )
  }

  async init() {
    // Override in subclasses
  }

  async analyzeScreenshot(filePath) {
    throw new Error("analyzeScreenshot() not implemented")
  }
}

module.exports = AIProvider
