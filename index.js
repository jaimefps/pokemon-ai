const secrets = require("./local/secrets")
const puppeteer = require("puppeteer")
const OpenAI = require("openai")
const path = require("path")
const fs = require("fs")

const SCREEN_CAP_LIMIT = 10
const SCREEN_DIR = path.join(__dirname, "./game-screen")
const EMULATOR_URL = "http://127.0.0.1:8080/"
const ASSISTANT_ID = secrets.ASSISTANT_ID
const GPT_KEY = secrets.GPT_KEY

// Increase max cycles for long running games.
// 10 is just to get a taste of how it works:
const MAX_CYCLES = 10

// globals:
let cycles = 0
let openai
let browser
let page

main()

async function main() {
  try {
    await initAnalyzer()
    await initEmulator()
    await playGame()
  } catch (error) {
    console.error("An error occurred:", error)
  } finally {
    if (browser) await browser.close()
    console.log("Browser closed.")
  }
}

async function initAnalyzer() {
  openai = new OpenAI({ apiKey: GPT_KEY })
}

async function initEmulator() {
  browser = await puppeteer.launch({ headless: false })
  page = await browser.newPage()

  console.log("loading emulator...")
  await page.goto(EMULATOR_URL)

  console.log("uploading rom...")
  const romUploadSelector = 'input[type="file"]'
  await page.waitForSelector(romUploadSelector)
  const romPath = path.join(__dirname, "local", "rom.gb")
  const fileInput = await page.$(romUploadSelector)
  await fileInput.uploadFile(romPath)
  console.log(`uploaded "${romPath}"`)

  // wait for the game to load
  await sleep(5000)

  // todo: automate rom.state upload.
  // manually upload rom.state file.
  console.log("load rom.state manually!")

  await sleep(5000)
  console.log("GPT will start in 5s")
  await sleep(1000)
  console.log("GPT will start in 4s")
  await sleep(1000)
  console.log("GPT will start in 3s")
  await sleep(1000)
  console.log("GPT will start in 2s")
  await sleep(1000)
  console.log("GPT will start in 1s")
  await sleep(1000)
}

async function playGame() {
  // enable local screenshot storage:
  if (!fs.existsSync(SCREEN_DIR)) {
    fs.mkdirSync(SCREEN_DIR)
    console.log(`created screenshots directory: ${SCREEN_DIR}`)
  }

  while (cycles < MAX_CYCLES) {
    cycles += 1
    console.log(`--------- action #${cycles} ---------`)

    // capture screenshot:
    await clickControl("Pause")
    const screenPath = path.join(SCREEN_DIR, `${Date.now()}.png`)
    await page.screenshot({ path: screenPath })
    clearScreenshots()

    // analyze screenshot:
    const result = await analyzeScreenshot()
    console.log("result:", JSON.stringify(result, null, 2))

    // execute action:
    const action = actions[result.action]
    if (action) {
      // resume game and wait
      // for action to complete:
      await clickControl("Play")
      await sleep(100)
      action()
      await sleep(3000)
    } else {
      console.error("failed to call action")
    }
  }

  console.log(`reached MAX_CYCLES: ${MAX_CYCLES}`)
}

function lastScreenshot() {
  const files = fs.readdirSync(SCREEN_DIR)
  const sortedFiles = files.map((file) => ({
    time: fs.statSync(path.join(SCREEN_DIR, file)).mtime.getTime(),
    file,
  }))
  sortedFiles.sort((a, b) => b.time - a.time)
  return sortedFiles.length > 0
    ? path.join(SCREEN_DIR, sortedFiles[0].file)
    : null
}

async function analyzeScreenshot() {
  const filePath = lastScreenshot()
  const file = await openai.files.create({
    file: fs.createReadStream(filePath),
    purpose: "vision",
  })
  console.log("uploaded file:", JSON.stringify(file, null, 2))

  await openai.beta.threads.messages.create(secrets.THREAD_ID, {
    role: "user",
    content: [
      {
        type: "image_file",
        image_file: {
          file_id: file.id,
          detail: "auto",
        },
      },
    ],
  })

  console.log("analyzing screenshot...")
  const run = await openai.beta.threads.runs.createAndPoll(secrets.THREAD_ID, {
    assistant_id: ASSISTANT_ID,
  })

  let result

  if (run.status === "completed") {
    const messages = await openai.beta.threads.messages.list(run.thread_id, {
      order: "desc",
      limit: 1,
    })
    try {
      const raw = messages.data[0].content[0].text.value
      result = JSON.parse(raw)
    } catch (err) {
      throw new Error(`failed to parse response: ${err}`)
    }
  } else {
    throw new Error(`analysis failed with status: ${run.status}`)
  }

  return result
}

function clearScreenshots() {
  const files = fs.readdirSync(SCREEN_DIR).map((file) => {
    const filePath = path.join(SCREEN_DIR, file)
    const stats = fs.statSync(filePath)
    return {
      filePath,
      createdAt: stats.birthtime,
    }
  })

  if (files.length < SCREEN_CAP_LIMIT) {
    // If there are fewer than limit,
    // nothing needs to be done
    return
  }

  files.sort((a, b) => a.createdAt - b.createdAt)
  const deleteCount = Math.ceil(files.length / 2)

  for (let i = 0; i < deleteCount; i++) {
    fs.unlinkSync(files[i].filePath)
  }

  console.log(`${deleteCount} files deleted.`)
}

async function sleep(ms) {
  return new Promise((res) => {
    return setTimeout(res, ms)
  })
}

async function press(key) {
  await page.keyboard.down(key)
  await sleep(100)
  await page.keyboard.up(key)
}

async function clickControl(txt) {
  const selector = `xpath/.//button[descendant::text()[contains(., '${txt}')]]`
  const [btn] = await page.$$(selector)
  if (!btn) {
    throw new Error(`Failed to find button: ${txt}`)
  }
  await btn.click()
  await sleep(100)
  // set focus on game:
  await clickCanvas()
}

async function clickCanvas() {
  const canvasSelector = "canvas"
  const canvas = await page.$(canvasSelector)
  if (canvas) {
    const canvasBox = await canvas.boundingBox()
    if (canvasBox) {
      await page.mouse.click(
        canvasBox.x + canvasBox.width / 2,
        canvasBox.y + canvasBox.height / 2
      )
      console.log("Canvas clicked")
    } else {
      console.error("Unable to retrieve canvas bounding box.")
    }
  } else {
    console.error("Canvas not found!")
  }
}

const actions = {
  a: () => press("z"),
  b: () => press("x"),
  up: () => press("ArrowUp"),
  down: () => press("ArrowDown"),
  left: () => press("ArrowLeft"),
  right: () => press("ArrowRight"),
  start: () => press("Enter"),
  unknown: (msg) => console.log(`Analyzer failed: ${msg}`),
}
