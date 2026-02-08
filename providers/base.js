const fs = require("fs")
const path = require("path")

const MAX_HISTORY = 8
const API_TIMEOUT = 30000
const IMAGES_TO_KEEP = 3

class AIProvider {
  constructor(config) {
    this.config = config
    this.systemPrompt = fs.readFileSync(
      path.join(__dirname, "..", "prompts", "v9.txt"),
      "utf-8"
    )

    const goalsPath = path.join(__dirname, "..", "local", "goals.txt")
    if (fs.existsSync(goalsPath)) {
      const goals = fs.readFileSync(goalsPath, "utf-8")
      this.previousGoals = `You are resuming from a saved state. Here is where you left off last time:\n${goals}\nUse this context to orient yourself on the first screenshot, then focus on what you see.`
    } else {
      this.previousGoals = null
    }
  }

  seedGoals(assistantRole, formatMessage) {
    if (!this.previousGoals) return []
    const resumeResponse = '{"what_changed":"first turn","screen_type":"overworld","description":"Resuming from saved state.","location":"N/A","surroundings":"N/A","short_goal":"Orient from saved state.","medium_goal":"Determine current game progress.","long_goal":"Become the Pokemon Champion.","action":"unknown"}'
    return [
      formatMessage("user", this.previousGoals),
      formatMessage(assistantRole, resumeResponse),
    ]
  }

  withTimeout(promise) {
    return Promise.race([
      promise,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("API call timed out")), API_TIMEOUT)
      ),
    ])
  }

  trimHistory() {
    if (this.conversationHistory.length > MAX_HISTORY * 2) {
      this.conversationHistory = this.conversationHistory.slice(-MAX_HISTORY * 2)
    }
  }

  stripOldImages(replaceParts) {
    let imageCount = 0
    for (let i = this.conversationHistory.length - 1; i >= 0; i--) {
      const msg = this.conversationHistory[i]
      if (msg.role !== "user") continue
      imageCount++
      if (imageCount > IMAGES_TO_KEEP) {
        replaceParts(msg)
      }
    }
  }

  parseJSON(raw) {
    const cleaned = raw.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "")
    try {
      return JSON.parse(cleaned)
    } catch (err) {
      throw new Error(`failed to parse response: ${err}`)
    }
  }

  async init() {
    // Override in subclasses
  }

  async analyzeScreenshot(filePath) {
    throw new Error("analyzeScreenshot() not implemented")
  }
}

module.exports = AIProvider
