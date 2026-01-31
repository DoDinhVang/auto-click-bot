import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { connect } from "puppeteer-real-browser";
import fs from "fs";
import path from "path";
puppeteer.use(StealthPlugin());

const accounts = [
  {
    email: "dodinhvang0302@gmail.com",
    password: "huu0302@",
  },
  {
    email: "ptothen27n@gmail.com",
    password: "ptothennn2005",
  },
  {
    email: "pnupzire@gmail.com",
    password: "ptothennn2005",
  },
];
const candidateid = 17;

const LOG_FILE = path.join(
  "C:\\Users\\H2gaming\\Desktop\\auto-click-bot",
  "wechoice-vote-log.txt",
);

(async () => {
  let page, browser;
  for (const account of accounts) {
    try {
      const connection = await connect({
        headless: false,
        turnstile: true,
        connectOption: { slowMo: 80 },
      });

      page = connection.page;
      browser = connection.browser;

      await page.setBypassCSP(true);

      await page.goto("https://wechoice.vn/", {
        waitUntil: ["networkidle2", "domcontentloaded"],
      });

      await vote();
      const isLogged = await checkLogged();
      if (isLogged) {
        continue;
      }
      await loginWithGoogle(account.email, account.password);

      await page.waitForNavigation({
        waitUntil: ["networkidle2", "domcontentloaded"],
        timeout: 120000,
      });
      await vote();
      await new Promise((r) => setTimeout(r, 8000));
      await browser.close();
    } catch (error) {
      appendToLog(`LỖI với ${account.email}: ${error.message || error}`);
    }
  }

  /**
   * HANDLE CLICK VOTE BUTTON
   */
  async function vote() {
    const btnSelector = `li[candidateid="${candidateid}"] a.js-vote-action`;

    await page.waitForSelector(btnSelector, { visible: true });

    // Scroll tới đúng vị trí
    await page.evaluate((sel) => {
      document.querySelector(sel).scrollIntoView({
        block: "center",
        behavior: "instant",
      });
    }, btnSelector);

    // Đợi layout ổn định
    await new Promise((r) => setTimeout(r, 800));

    // Highlight để chắc chắn đúng element
    await page.evaluate((sel) => {
      const el = document.querySelector(sel);
      el.style.border = "4px solid red";
    }, btnSelector);

    await page.evaluate(async (sel) => {
      document.querySelector(sel).click();
    }, btnSelector);

    console.log(`Clicked candidate ${candidateid}`);
  }
  /**
   * Check user is logged
   * @returns boolean
   */
  async function checkLogged() {
    const googleSignInSelector = "#login-popup";
    return await page
      .$eval(googleSignInSelector, () => false)
      .catch(() => true);
  }
  /**
   * HANDLE LOGIN WITH GOOGLE
   */
  async function loginWithGoogle(email, password) {
    try {
      const googleSignInSelector = "#login-popup .g_id_signin";
      await page.waitForSelector(googleSignInSelector, {
        visible: true,
        timeout: 60000,
      });

      const newPagePromise = new Promise((resolve) =>
        browser.once("targetcreated", (target) => resolve(target.page())),
      );
      await page.click(googleSignInSelector);

      const googlePage = await newPagePromise;
      if (!googlePage) {
        console.log("Google account not open");
        return;
      }

      await googlePage.bringToFront();
      await googlePage.setDefaultTimeout(60000);

      // Fill email
      const emailSelector =
        '#identifierId, input[type="email"], input[name="identifier"]';
      await googlePage.waitForSelector(emailSelector, {
        visible: true,
        timeout: 600000, //10 minutes
      });
      await googlePage.type(emailSelector, email, { delay: 60 });
      await googlePage.keyboard.press("Enter");

      // Fill password
      const passSelector =
        'input[type="password"], input[name="Passwd"], input[autocomplete="current-password"]';
      await googlePage.waitForSelector(passSelector, {
        visible: true,
        timeout: 600000, //10 minutes
      });
      await googlePage.type(passSelector, password, { delay: 60 });
      await googlePage.keyboard.press("Enter");
      // await new Promise((resolve) => setTimeout(resolve, 120000));
      await checkLogged();
    } catch (error) {
      console.error("Lỗi loginWithGoogle:", error.message || error);
    }
  }
  // Hàm ghi log chung (append, không ghi đè)
  function appendToLog(message) {
    const now = new Date();
    // Format giờ Việt Nam: DD/MM/YYYY HH:mm:ss
    const timestamp = now.toLocaleString("vi-VN", {
      timeZone: "Asia/Ho_Chi_Minh",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });

    const logLine = `[${timestamp}] ${message}\n`;

    // Ghi ra console trước
    console.log(logLine.trim());

    // Ghi vào file (append)
    fs.appendFile(LOG_FILE, logLine, "utf8", (err) => {
      if (err) {
        console.error(`❌ KHÔNG GHI ĐƯỢC FILE LOG: ${err.message}`);
        console.error(`→ Kiểm tra quyền ghi file ở thư mục: ${__dirname}`);
      }
    });
  }
})();
