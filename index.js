const config = require("./local/secrets")
const puppeteer = require("puppeteer")
const path = require("path")
const fs = require("fs")

const Provider = require(`./providers/${config.PROVIDER}`)
const provider = new Provider(config)

const SCREEN_CAP_LIMIT = 10
const SCREEN_DIR = path.join(__dirname, "./screenshots")
const EMULATOR_URL = "http://127.0.0.1:8080/"

// Increase max cycles for long running games.
// 100 is just to get a taste of how it works.
const MAX_CYCLES = 100

// globals:
let cycles = 0
let browser
let page

main()

async function main() {
  try {
    await initAnalyzer()
    await initEmulator()
    await playGame()
  } catch (error) {
    console.error("Process failed:", error)
  } finally {
    if (browser) await browser.close()
    console.log("Browser closed.")
  }
}

async function initAnalyzer() {
  await provider.init()
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

  // wait for emulator to load the game rom:
  console.log("waiting for emulator to initialize...")
  await page.waitForFunction(
    () => window.EJS_emulator && window.EJS_emulator.gameManager,
    { timeout: 30000 }
  )
  console.log("emulator ready.")

  // load save state if available:
  const statePath = path.join(__dirname, "local", "rom.state")
  if (fs.existsSync(statePath)) {
    const stateBase64 = fs.readFileSync(statePath).toString("base64")
    await page.evaluate((b64) => {
      const binary = atob(b64)
      const bytes = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i)
      }
      window.EJS_emulator.gameManager.loadState(bytes)
    }, stateBase64)
    console.log("loaded save state from rom.state")
  } else {
    console.log("no rom.state found, starting from scratch.")
  }

  await sleep(2000)
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
      await sleep(200)
      action()
      await sleep(3000)
    } else {
      throw new Error("failed to call action")
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
  return await provider.analyzeScreenshot(filePath)
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
  await sleep(200)
  await page.keyboard.up(key)
}

async function clickControl(txt) {
  const selector = `xpath/.//button[descendant::text()[contains(., '${txt}')]]`
  const [btn] = await page.$$(selector)
  if (!btn) throw new Error(`Failed to find button: ${txt}`)

  await btn.click()
  await sleep(200)
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
        canvasBox.y + canvasBox.height / 2,
      )
    } else {
      throw new Error("unable to retrieve canvas bounding box")
    }
  } else {
    throw new Error("canvas not found")
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
