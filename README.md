# pokemon-ai

Small experiment with OpenAI vision analysis capabilities. The idea is to feed an OpenAI model with screenshots from a game that has a simple UX and limited series of actions that can be executed. The AI model is meant to infer or explore its location within the game and progress through it by seeing a screenshot of the current game state and responding with the next action it wishes to take.

This is also an experiment of the idea of "explicit awareness", by requesting that the model explicitly state its short-term and long-term goals so that it creates some form of reinforcement and remain on task over time. This is achieved by forcing the model to only respond in a constrained manner:

```
{
  action:       game action to be executed based on screenshot
  description:  description of latest screenshot
  short_goal:   description of its short-term goal based on the current game state
  long_goal:    description of its long-term goal based on the current game state
}
```

When then execute the actions that the model says it want to take. The actions are expressed as button presses, such as `A`, `B`, or pressing the D-pad to move in some direction within the game.

## how to run locally

Clone this repo onto your machine, then...

### 1. prepare local data

Open this project on your preferred code editor and create a directory within this repo named `local`. Note the "local" directory is in `.gitignore` in order to avoid committing your secrets or sharing out the ROM files that you may not have the right to distribute.

- Legally obtain a Pokemon Red ROM file and add it to `local/` as a file named `rom.gb`
- Create a `secrets.js` file within `local/`, add the following export, and populate accordingly:

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

Once the EmulatorJS process is running successfully, open a new terminal. In the new terminal visit this project and run `npm install` and `npm start`: it will automatically upload the game ROM into the emulator and begin playing.

## chatgpt assistant prompt

The short-term goal for this mvp is to complete the opening sequence of the game, i.e., pick a starter pokemon and play out a pokemon battle against the rival. Previously the goal was to complete the game and defeat the Elite 4 trainers, but that might be too open-ended for a brute-force project like this. For now our definition of success is to have the ChatGPT Assistant only complete the opening sequence, hence out prompt is something along the lines of:

```
You are a ChatGPT Assistant that is meant to play the GameBoy game Pokemon Red version.

You are playing the game from the beginning, starting within the character's bedroom. Your goal is to go through the game sequence up to the point where you select your starter Pokemon. You should select Bulbasaur as your starter Pokemon, and then battle your rival. You should attempt tp defeat your rival in battle.

You will be fed images of the game screen and you are meant to ONLY respond in JSON with the following format:

{
    action      // the action you want to take based on the current game state.
    description // description of what you see on screen.
    short_goal  // a brief description of your short term goal based on the current game state.
    long_goal   // a brief description of your long term goal based on the current game state.
}

The "action" field may only be populated by one of the following values:

"a"
"b"
"up"
"down"
"left"
"right"
"start"

You should know how to play with a GameBoy, how to play Pokemon Red, and how to use each of the action commands based on the current game state you see on the screen. Before taking new actions, consider whether the image changed after previous actions you took. If the screenshot images remain the same after multiple attempts of taking the same action, then you are likely taking an invalid action, and you should try taking different actions to discover the correct next steps.

If you receive a message that you don't know how to process, return "unknown" within the "action" field and explain why the received message is unclear within the "description" field.
```
