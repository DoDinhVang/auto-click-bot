import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
puppeteer.use(StealthPlugin());

(async () => {
  const browser = await puppeteer.launch({
    headless: false,
    slowMo: 80,
    defaultViewport: null,
    args: ["--start-maximized"],
  });

  const page = await browser.newPage();
  await page.setBypassCSP(true);

  await page.goto("https://wechoice.vn/", {
    waitUntil: "networkidle2",
    timeout: 60000,
  });

  // === BƯỚC ĐĂNG NHẬP GOOGLE ===
  const loginBtn = await page.$("#btn-open-popup-login");

  if (loginBtn) {
    console.log("Chưa login → Mở popup và đăng nhập Google...");

    await loginBtn.click();

    await page.waitForSelector("#login-popup .g_id_signin", {
      visible: true,
      timeout: 15000,
    });

    console.log("→ Click nút Google...");

    const newPagePromise = new Promise((resolve) =>
      browser.once("targetcreated", (target) => resolve(target.page())),
    );

    await page.click("#login-popup .g_id_signin");

    const googlePage = await newPagePromise;
    if (!googlePage) {
      throw new Error("Không mở được trang Google login!");
    }

    await googlePage.bringToFront();

    console.log("→ Trang Google login đã mở → Đang điền email...");

    await googlePage.setDefaultTimeout(60000);

    await googlePage.waitForSelector(
      'input[type="email"], input[name="identifier"], input[autocomplete="username"]',
      { visible: true, timeout: 30000 },
    );

    await googlePage.type('input[type="email"]', "vangdd@gmail.com", {
      delay: 80,
    }); // ← thay email thật
    await googlePage.keyboard.press("Enter");

    // Thay waitForTimeout bằng delay
    await new Promise((resolve) => setTimeout(resolve, 3500)); // chờ 3.5s để màn hình pass load

    await googlePage.waitForSelector(
      'input[type="password"], input[name="Passwd"], input[autocomplete="current-password"]',
      { visible: true, timeout: 30000 },
    );

    await googlePage.type('input[type="password"]', "huu0302@", {
      delay: 80,
    }); // ← thay pass thật
    await googlePage.keyboard.press("Enter");

    console.log("→ Đã submit login Google → Chờ quay về WeChoice...");

    // Chờ nút login header biến mất (đã login thành công)
    await page.waitForSelector("#btn-open-popup-login", {
      hidden: true,
      timeout: 60000,
    });
    console.log("Đăng nhập thành công!");
  } else {
    console.log("Đã login sẵn!");
  }

  // === PHẦN VOTE ===
  const voteSelector = 'li[candidateid="3"] .js-vote-action';
  await page.waitForSelector(voteSelector, { visible: true, timeout: 60000 });

  await page.evaluate((sel) => {
    document
      .querySelector(sel)
      ?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, voteSelector);

  await new Promise((resolve) => setTimeout(resolve, 1500)); // delay thay waitForTimeout

  await page.click(voteSelector);

  console.log("✅ VOTE THÀNH CÔNG CHO CANDIDATE ID = 3!");
  // await browser.close();
})();
