import { Message } from "discord.js";
import { Browser } from "puppeteer";
import { toPascalCase } from "./utils";


export default async (msg: Message, args: string, browser: Browser) => {
  let searchLevel: undefined | number = undefined;
  let assistant: undefined | string = undefined;
  args = args.replace(/(?:lv|lvl|level) ?(\d+)/i, (_, p1) => { searchLevel = Number.parseInt(p1); return ''; }).trim();
  args = args.replace(/-s ?(.+)/i, (_, p1) => { assistant = toPascalCase(p1); return ''; }).trim();
  await msg.react('<a:WDance:1132989381687382046>');
  const apiResp = await fetch(
    `https://arkprts.ashlen.top/api/search?nickname=${encodeURIComponent(args)}&server=en`,
  );
  let users: any[] = await apiResp.json();
  let data: any;
  if (searchLevel) {
    users = users.filter((u) => u.level == searchLevel);
  }
  if (assistant) {
    users = users.filter((u) => u.assistant.name == assistant);
  }
  data = users[0];
  if (!data) {
    await msg.reply("I couldn't find a user like that (they don't exist)");
    return;
  }
  const page = await browser.newPage();
  const resp = await page.goto(`https://arkprts.ashlen.top/search?nickname=${data.uid}&server=en`, { timeout: 1000000, waitUntil: 'networkidle0' });

  await page.evaluate(() => window.scrollTo(0, window.innerHeight));
  await page.evaluate(() => window.scrollTo(0, 0));


  const span = await page.$('.user');
  await span.evaluateHandle((h) => {
    (h as HTMLSpanElement).style.width = '1000px';

    const style = document.createElement('style');
    style.innerHTML = '.user-body {flex-direction: row !important;}.user-background {left: -25% !important;}.user-info{font-size:25px;}';
    document.head.appendChild(style);
  });
  await span.scrollIntoView();

  await new Promise(r => setTimeout(r, 1000));

  const screenshot = await span.screenshot({ encoding: 'binary' });

  await msg.reply({ content: `[More info](<https://arkprts.ashlen.top/search?nickname=${data.uid}&server=en>)`, files: [{ attachment: screenshot }] });

  await page.close();
}
