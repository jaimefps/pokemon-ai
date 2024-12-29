# pokemon-ai

![example of experiment running](./assets/sample.png)

Small experiment with OpenAI vision analysis capabilities. The idea is to feed an OpenAI assistant with screenshots from a game that has a simple UX and limited series of actions that can be executed. The assistant is meant to infer or explore its location within the game and progress through it by seeing a screenshot of the current game state and responding with the next action it wishes to take. We use Puppeteer to grab screenshots from the GameBoy emulator in browser and also to enable the AI assistant to independently act on the game via Puppeteer keyboard events. The actions are expressed as button presses, such as `A`, `B`, or pressing the D-pad to move in some direction within the game.

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

Open this project on your preferred code editor and create a directory within this repo named `local`. Note the "local" directory is in `.gitignore` in order to avoid committing your secrets or sharing out the ROM files that you may not have the right to distribute.

- Legally obtain a Pokemon Red ROM file and add it to `local/` as a file named `rom.gb`
- Create a `secrets.js` file within `local/`, then add following export and populate accordingly:

```
module.exports = {
  GPT_KEY:      "YOUR_OPENAI_ACCESS_KEY",
  ASSISTANT_ID: "YOUR_OPENAI_ASSISTANT_ID",
  THREAD_ID:    "YOUR_OPENAI_THREAD_ID",
}
```

### 2. prepare and run emulator

Clone the [EmulatorJS](https://github.com/EmulatorJS/EmulatorJS) project that allows us to run GameBoy roms within the browser. Open a terminal window, go into the cloned repo and run the emulator locally with `npm install` and `npm start`. You do NOT need to visit the url where the emulator is running, `pokemon-ai` will take care of that.

### 3. prepare and run pokemon-ai

Once the EmulatorJS process is running successfully, open a new terminal. In the new terminal visit your pokemon-ai project clone and run `npm install` and `npm start`: it will automatically upload the game ROM into the emulator and begin playing.

## assistant prompts

The short-term goal for this mvp is to complete the opening sequence of the game, i.e., pick a starter pokemon. Previously the goal was to complete the game and defeat the Elite 4 trainers, but that is too open-ended for a brute-force project like this. For now our definition of success is to have the OpenAI assistant only complete the opening sequence. See some of the prompts I've tried using under the `prompts/` directory.

## fine-tuning options

1. `jsonl` dataset with base64 enconded screenshots.
2. `jsonl` dataset with ASCII translations of the map: each type of tile has its corresponding label. 
3. OpenAI Gym Retro training: https://openai.com/index/gym-retro/
