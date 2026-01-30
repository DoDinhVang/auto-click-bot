import { connect } from "puppeteer-real-browser";
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
puppeteer.use(StealthPlugin());

const awardId = 1139348144238723073;
const pageUrl =
  "https://wechoice.vn/chi-tiet-de-cu/rising-artist-9/lyhan-76.htm";

// Danh sách email + password (thêm bao nhiêu tùy ý)
const accounts = [
  {
    email: "dodinhvang0302@gmail.com",
    password: "huu0302@",
  },
  // Thêm tiếp ở đây...
];

(async () => {
  for (const acc of accounts) {
    console.log(`\n=== BẮT ĐẦU VỚI TÀI KHOẢN: ${acc.email} ===`);

    let browser;
    let page;

    try {
      const connection = await connect({
        headless: false,
        turnstile: true,
        defaultViewport: null,
        args: ["--start-maximized", "--kiosk"],
        connectOption: { slowMo: 80 },
      });

      browser = connection.browser;
      page = connection.page;

      await page.setBypassCSP(true);

      await page.goto(pageUrl, {
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

        await googlePage.type('input[type="email"]', acc.email, {
          delay: 80,
        });
        await googlePage.keyboard.press("Enter");

        await new Promise((resolve) => setTimeout(resolve, 3500));

        await googlePage.waitForSelector(
          'input[type="password"], input[name="Passwd"], input[autocomplete="current-password"]',
          { visible: true, timeout: 30000 },
        );

        await googlePage.type('input[type="password"]', acc.password, {
          delay: 80,
        });
        await googlePage.keyboard.press("Enter");

        await new Promise((resolve) => setTimeout(resolve, 5000));

        console.log("→ Đã submit login Google → Chờ quay về WeChoice...");

        // Chờ dấu hiệu login thành công
        await page.waitForSelector(
          "#fan-login-wrapt.logon-info, .user-ava, .user-name",
          { timeout: 90000 },
        );

        console.log(`Login thành công cho ${acc.email}!`);
      } else {
        console.log(`Đã login sẵn cho ${acc.email}!`);
      }

      // === PHẦN VOTE ===
      const voteSelector = `div[awardid="${awardId}"]  .js-vote-action`;
      await page.waitForSelector(voteSelector, {
        visible: true,
        timeout: 60000,
      });
      await new Promise((resolve) => setTimeout(resolve, 10000)); // delay thay waitForTimeout
      page.click(voteSelector);

      console.log(`✅ VOTE THÀNH CÔNG  với ${acc.email}!`);
    } catch (error) {
      console.error(`LỖI với tài khoản ${acc.email}:`, error.message);
    } finally {
      if (browser) {
        // await browser.close();
      }
      // Delay giữa các tài khoản để tránh bị chặn IP hoặc detect
      if (acc !== accounts[accounts.length - 1]) {
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    }
  }

  console.log("\nHOÀN TẤT TẤT CẢ TÀI KHOẢN!");
})();
