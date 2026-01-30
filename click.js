
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { connect } from "puppeteer-real-browser";
puppeteer.use(StealthPlugin());

(async () => {
  const { page, browser } = await connect({
    headless: false,
    turnstile: true,
  });

  await page.setBypassCSP(true);

  await page.goto("https://wechoice.vn/", {
    waitUntil: "networkidle2",
  });

  await vote();
  const isLogged = await checkLogged();
  if (isLogged) {
    return;
  }
  await loginWithGoogle("dodinhvang0302@gmail.com", "huu0302@");

  async function checkLogged() {
    const googleSignInSelector = "#login-popup";
    return await page.$eval(googleSignInSelector, () => false).catch(() => true);
  }
  /**
   * HANDLE LOGIN WITH GOOGLE
   * 
   */
  async function loginWithGoogle(email, password) {
    try {
      // Attach listener popup/tab mới TRƯỚC click
      const popupPromise = new Promise((resolve) => {
        const handler = async (target) => {
          const newPg = await target.page().catch(() => null);
          if (newPg && newPg !== page) {
            const url = await newPg.url().catch(() => '');
            if (url.includes('accounts.google.com') || url.includes('google.com/signin')) {
              browser.off('targetcreated', handler);
              console.log("Detect popup qua event! URL:", url);
              resolve(newPg);
            }
          }
        };
        browser.on('targetcreated', handler);
        // Fallback timeout 20s
        setTimeout(() => {
          browser.off('targetcreated', handler);
          resolve(null);
        }, 20000);
      });

      // Click nút
      const googleSignInSelector = "#login-popup .g_id_signin";
      await page.waitForSelector(googleSignInSelector, { visible: true, timeout: 60000 });
      console.log("Nút Sign in with Google đã sẵn sàng, chuẩn bị click...");
      await page.click(googleSignInSelector);
      console.log("Đã click nút → chờ popup Google login...");

      // Chờ popup (timeout 15s fallback)
      const googlePopup = await popupPromise;

      if (!googlePopup) {
        console.log("Không mở được popup → kiểm tra xem Google có chặn hoặc dùng redirect thay vì popup không");
        return;
      }

      await googlePopup.bringToFront();
      await googlePopup.setViewport({ width: 1280, height: 800 }); // optional, giúp ổn định

      // Selector email (cập nhật 2026: #identifierId là ổn định nhất)
      const emailSelector = '#identifierId, input[type="email"], input[name="identifier"]';
      await googlePopup.waitForSelector(emailSelector, { visible: true, timeout: 45000 });
      console.log("Email field hiện trong popup!");
      await googlePopup.type(emailSelector, email, { delay: 60 });
      await googlePopup.keyboard.press('Enter');

      // Password
      const passSelector = 'input[type="password"], input[name="Passwd"], input[autocomplete="current-password"]';
      await googlePopup.waitForSelector(passSelector, { visible: true, timeout: 45000 });
      await googlePopup.type(passSelector, password, { delay: 60 });
      await googlePopup.keyboard.press('Enter');

      console.log("Đã điền email + password trong popup, chờ redirect về trang gốc...");

      // Chờ 5-10s hoặc check logged in trên page chính
      await page.waitForTimeout(8000);
      // Optional: await page.waitForSelector(selector_cua_user_logged_in, { timeout: 20000 });

    } catch (error) {
      console.error("Lỗi loginWithGoogle:", error.message || error);
      if (error.message.includes('Timeout')) {
        console.log("→ Timeout: Popup có mở không? Có thông báo 'This browser may not be secure' không?");
      }
    }
  }
  /**
 * HANDLE CLICK VOTE BUTTON
 */
  async function vote() {
    const btnSelector = 'li[candidateid="61"] a.js-vote-action';

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

    console.log("Clicked candidate 61");
  }

  return;
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

    await googlePage.type('input[type="email"]', "dodinhvang0302@gmail.com", {
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

  // await browser.close();
})();


