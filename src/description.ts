import { Message } from "discord.js";
import { toPascalCase } from "./utils";
import { cache, getCached } from "./cache";
import { Browser } from "puppeteer";

export default async (msg: Message, args: string, browser: Browser) => {
  const char = toPascalCase(args);
  const reply = await msg.reply(`Fetching ${char}'s description`);
  let cached = await getCached(char + 'desc');
  if (cached) {
    await reply.edit({ content: `[More info](<https://arknights.wiki.gg/wiki/${char.replace(/ /gi, '_')}>)`, files: [{ attachment: cached }] });
    return;
  }
  const page = await browser.newPage();
  const resp = await page.goto(`https://arknights.wiki.gg/wiki/${char.replace(/ /gi, '_')}`, { timeout: 1000000, waitUntil: 'networkidle0' });
  if (resp.status() == 404) {
    await reply.edit(`Couldn't find ${char}`);
    return;
  }

  await page.evaluate(() => window.scrollTo(0, window.innerHeight));
  await page.evaluate(() => window.scrollTo(0, 0));

  let hasInfo = await page.evaluate(() => {
    let span = document.createElement('span');
    document.getElementsByTagName('main')[0].appendChild(span);
    span.id = 'desc';

    let desc = document.querySelector('.quote.desc');
    if (!desc) {
      return false;
    }
    span.appendChild(desc);
    return true;
  });
  if (!hasInfo) {
    await reply.edit(`Couldn't find ${char}'s description`);
    return;
  }

  const span = await page.$('#desc');
  await span.evaluateHandle((h) => {
    (h as HTMLSpanElement).style.backgroundColor = '#1B1B1B';
    (h as HTMLSpanElement).style.zIndex = '99999';
    (h as HTMLSpanElement).style.position = 'absolute';
    (h as HTMLSpanElement).style.top = '0';
    (h as HTMLSpanElement).style.left = '0';

    const style = document.createElement('style');
    style.innerHTML = '.quote { margin: 0 !important; }';
    document.head.appendChild(style);
  });
  await span.scrollIntoView();

  await new Promise(r => setTimeout(r, 1000));

  const screenshot = await span.screenshot({ encoding: 'binary' });
  await cache(char + 'desc', screenshot as Buffer);

  await reply.edit({ content: `[More info](<https://arknights.wiki.gg/wiki/${char.replace(/ /gi, '_')}>)`, files: [{ attachment: screenshot }] });

  await page.close()
}
