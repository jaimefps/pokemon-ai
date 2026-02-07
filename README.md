# pokemon-ai

![example of experiment running](./assets/sample.png)

Small experiment with AI vision analysis capabilities. The idea is to feed an AI model with screenshots from a game that has a simple UX and limited series of actions that can be executed. The model is meant to infer or explore its location within the game and progress through it by seeing a screenshot of the current game state and responding with the next action it wishes to take. We use Puppeteer to grab screenshots from the GameBoy emulator in browser and also to enable the AI assistant to independently act on the game via Puppeteer keyboard events. The actions are expressed as button presses, such as `A`, `B`, or pressing the D-pad to move in some direction within the game.

Supports multiple AI providers (Anthropic Claude, OpenAI, Google Gemini) via a plugin architecture — switch between them by changing a single config value.

This is also an experiment of the idea of "explicit awareness", by requesting that the model explicitly state its short-term and long-term goals so that it creates some form of reinforcement and remain on task over time. This is achieved by forcing the model to only respond in a constrained manner:

```
{
  action:       game action to be executed based on screenshot
  description:  description of latest screenshot
  short_goal:   description of its short-term goal based on the current game state
  long_goal:    description of its long-term goal based on the current game state
}
```

## how to run locally

Clone this repo onto your machine, then...

### 1. prepare local data

Create a directory named `local` inside the `pkmn/` folder (i.e. `pkmn/local/`). This directory is in `.gitignore` to avoid committing secrets or ROM files you may not have the right to distribute.

Add the following files to `pkmn/local/`:

- **`rom.gb`** — a legally obtained Pokemon Red ROM file.
- **`rom.state`** _(optional)_ — a save-state file if you want to skip ahead in the game. When the app starts it will pause for a few seconds and ask you to load this file manually in the emulator UI.
- **`secrets.js`** — your provider config. Pick **one** of the three providers below and fill in your keys:

**Google Gemini** *(recommended — top-ranked vision model):*
1. Go to [Google AI Studio](https://aistudio.google.com/apikey) and create an API key
2. Configure `secrets.js`:

```js
module.exports = {
  PROVIDER: "gemini",
  apiKey: "YOUR_GOOGLE_AI_KEY",
  model: "gemini-3-pro-preview", // optional, this is the default
}
```

**Anthropic (Claude):**
1. Go to the [Anthropic Console](https://console.anthropic.com/) and create an API key
2. Configure `secrets.js`:

```js
module.exports = {
  PROVIDER: "anthropic",
  apiKey: "YOUR_ANTHROPIC_API_KEY",
  model: "claude-sonnet-4-5-20250929", // optional, this is the default
}
```

**OpenAI:**
1. Go to the [OpenAI Platform](https://platform.openai.com/api-keys) and create an API key
2. Configure `secrets.js`:

```js
module.exports = {
  PROVIDER: "openai",
  apiKey: "YOUR_OPENAI_ACCESS_KEY",
  model: "gpt-5.2", // optional, this is the default
}
```

### 2. prepare and run emulator

Clone the [EmulatorJS](https://github.com/EmulatorJS/EmulatorJS) project that allows us to run GameBoy roms within the browser. Open a terminal window, go into the cloned repo and run the emulator locally with `npm install` and `npm start`. You do NOT need to visit the url where the emulator is running, `pokemon-ai` will take care of that.

### 3. prepare and run pokemon-ai

Once the EmulatorJS process is running successfully, open a new terminal. In the new terminal, `cd` into the `pkmn/` directory and run:

```
npm install
npm start
```

This will install all provider SDKs (only the one matching your `PROVIDER` setting is used at runtime). The app will automatically open a browser, upload the ROM into the emulator, and begin playing.

## assistant prompts

The short-term goal for this mvp is to complete the opening sequence of the game, i.e., pick a starter pokemon. Previously the goal was to complete the game and defeat the Elite 4 trainers, but that is too open-ended for a brute-force project like this. For now our definition of success is to have the AI only complete the opening sequence. See some of the prompts I've tried using under the `prompts/` directory.

## fine-tuning options

1. `jsonl` dataset with base64 enconded screenshots.
2. `jsonl` dataset with ASCII translations of the map: each type of tile has its corresponding label.
3. OpenAI Gym Retro training: https://openai.com/index/gym-retro/
