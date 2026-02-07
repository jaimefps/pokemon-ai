const fs = require("fs")
const path = require("path")

class AIProvider {
  constructor(config) {
    this.config = config
    this.systemPrompt = fs.readFileSync(
      path.join(__dirname, "..", "prompts", "v6.txt"),
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
    const resumeResponse = '{"description":"Resuming from saved state.","ascii_grid":"","short_goal":"Orient from saved state.","long_goal":"Continue game progress.","action":"unknown"}'
    return [
      formatMessage("user", this.previousGoals),
      formatMessage(assistantRole, resumeResponse),
    ]
  }

  async init() {
    // Override in subclasses
  }

  async analyzeScreenshot(filePath) {
    throw new Error("analyzeScreenshot() not implemented")
  }
}

module.exports = AIProvider
