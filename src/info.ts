import { Message } from "discord.js";
import { toPascalCase } from "./utils";
import { cache, getCached } from "./cache";
import { Browser } from "puppeteer";

export default async (msg: Message, args: string, browser: Browser) => {
  const char = toPascalCase(args);
  const reply = await msg.reply(`Fetching ${char}'s info`);
  let cached = await getCached(char + 'info');
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
    const parsed = document.getElementsByClassName('mw-parser-output')[0];
    document.getElementsByTagName('main')[0].appendChild(span);
    span.id = 'info';

    let side = parsed.getElementsByTagName('aside')[0];
    if (!side) {
      return false;
    }
    side.getElementsByClassName('pi-media-collection-tabs')[0]?.remove();
    Array.from(side.getElementsByClassName('pi-collapse-closed')).forEach((e) => e.remove());
    let remove = false;
    Array.from(side.children).forEach((e) => {
      if (e.tagName == 'SECTION') {
        const center = e.getElementsByTagName('center')[0];
        if (center) {
          if (center.innerText == 'Related Characters') {
            remove = true;
          }
          else {
            remove = false;
          }
        };
        if (remove) {
          e.remove();
        }
      }
    });
    span.appendChild(side);
    return true;
  });
  if (!hasInfo) {
    await reply.edit(`Couldn't find ${char}'s info`);
    return;
  }

  const span = await page.$('#info');
  await span.evaluateHandle((h) => {
    (h as HTMLSpanElement).style.backgroundColor = '#1B1B1B';
    (h as HTMLSpanElement).style.zIndex = '99999';
    (h as HTMLSpanElement).style.position = 'absolute';
    (h as HTMLSpanElement).style.top = '0';
    (h as HTMLSpanElement).style.left = '0';

    const style = document.createElement('style');
    style.innerHTML = 'aside { margin: 0 !important; } aside h3 { color: #fff !important; }';
    document.head.appendChild(style);
  });
  await span.scrollIntoView();

  await new Promise(r => setTimeout(r, 1000));

  const screenshot = await span.screenshot({ encoding: 'binary' });
  await cache(char + 'info', screenshot as Buffer);

  await reply.edit({ content: `[More info](<https://arknights.wiki.gg/wiki/${char.replace(/ /gi, '_')}>)`, files: [{ attachment: screenshot }] });

  await page.close()
}
