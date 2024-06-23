import { Message } from "discord.js";
import { toPascalCase } from "./utils";
import { cache, getCached } from "./cache";
import { Browser } from "puppeteer";

export default async (msg: Message, args: string, browser: Browser) => {
  const char = toPascalCase(args);
  const reply = await msg.reply(`Fetching operator ${char}'s talents`);
  let cached = await getCached(char + 'talents');
  if (cached) {
    await reply.edit({ content: `[More info](<https://arknights.wiki.gg/wiki/${char.replace(/ /gi, '_')}#Talent(s)>)`, files: [{ attachment: cached }] });
    return;
  }
  const page = await browser.newPage();
  const resp = await page.goto(`https://arknights.wiki.gg/wiki/${char.replace(/ /gi, '_')}`, { timeout: 1000000, waitUntil: 'networkidle0' });
  if (resp.status() == 404) {
    await reply.edit(`Couldn't find operator ${char}`);
    return;
  }

  await page.evaluate(() => window.scrollTo(0, window.innerHeight));
  await page.evaluate(() => window.scrollTo(0, 0));

  let hasTalents = await page.evaluate(() => {
    const span = document.createElement('span');
    let current = (document.getElementById('Talents') || document.getElementById('Talent')).parentElement.nextElementSibling;
    while (current && current.tagName != 'H2') {
      const newCurrent = current.nextElementSibling as HTMLElement;
      span.appendChild(current);
      current = newCurrent;
    }
    current = document.getElementById('Base_skills').parentElement.nextElementSibling;
    while (current && current.tagName != 'H2') {
      const newCurrent = current.nextElementSibling as HTMLElement;
      span.appendChild(current);
      current = newCurrent;
    }
    if (span.children.length == 0) {
      return false;
    }
    document.getElementsByTagName('main')[0].appendChild(span);
    span.id = 'talents';
    return true;
  });

  if (!hasTalents) {
    await reply.edit(`Couldn't find operator ${char}'s talents`);
    return;
  }

  const span = await page.$('#talents');
  await span.evaluateHandle((h) => {
    (h as HTMLSpanElement).style.backgroundColor = '#1B1B1B';
    (h as HTMLSpanElement).style.zIndex = '99999';
    (h as HTMLSpanElement).style.position = 'absolute';
    (h as HTMLSpanElement).style.top = '0';
    (h as HTMLSpanElement).style.left = '0';
    (h as HTMLSpanElement).style.display = 'flex';
    (h as HTMLSpanElement).style.flexDirection = 'column';
    (h as HTMLSpanElement).style.gap = '5px';
    (h as HTMLSpanElement).style.padding = '5px';

    const style = document.createElement('style');
    style.innerHTML = '.mrfz-wtable { width: 100%; margin: 0; box-sizing: border-box; }';
    document.head.appendChild(style);
  });
  await span.scrollIntoView();

  await new Promise(r => setTimeout(r, 1000));

  const screenshot = await span.screenshot({ encoding: 'binary' });
  await cache(char + 'talents', screenshot as Buffer);

  await reply.edit({ content: `[More info](<https://arknights.wiki.gg/wiki/${char.replace(/ /gi, '_')}#Talent(s)>)`, files: [{ attachment: screenshot }] });

  await page.close()
}
