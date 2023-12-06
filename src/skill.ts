import { Message } from "discord.js";
import { toPascalCase } from "./utils";
import { cache, getCached } from "./cache";
import { Browser } from "puppeteer";

export default async (msg: Message, args: string, browser: Browser) => {
  const last = args.split(' ').at(-1);
  let skillIndex = 1;
  let char: string;
  if (['1', '2', '3'].indexOf(last) > -1) {
    skillIndex = Number.parseInt(last);
    let parts = args.split(' ');
    parts.pop();
    char = toPascalCase(parts.join(' '));
  }
  else {
    char = toPascalCase(args);
  }
  const reply = await msg.reply(`Fetching operator ${char}'s skill ${skillIndex}`);
  let cached = await getCached(char + skillIndex.toString());
  if (cached) {
    await reply.edit({ content: `[More info](<https://arknights.wiki.gg/wiki/${char.replace(/ /gi, '_')}#Skills>)`, files: [{ attachment: cached }] });
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

  const tempTitle = (await page.$('#Skills')) ?? (await page.$('#Skill'));
  if (tempTitle == null) {
    await reply.edit(`Couldn't find operator ${char}'s skills`);
    return;
  }
  const skillTitle = await tempTitle.evaluateHandle((h) => h.parentElement);
  let skillInfo = await skillTitle.evaluateHandle((h) => h.nextElementSibling);
  for (let i = 1; i < skillIndex; i++) {
    skillInfo = await skillInfo.evaluateHandle((h) => {
      let next = h.nextElementSibling;
      if ((next as HTMLDivElement).dataset.collapsetext != 'Hide effects') {
        return null;
      }
      return next;
    });
  };
  if (!skillInfo.asElement()) {
    await reply.edit(`Couldn't find operator ${char}'s skill ${skillIndex}`);
    return;
  }
  await skillInfo.evaluateHandle((h) => {
    (h as HTMLSpanElement).style.backgroundColor = '#1B1B1B';
    (h as HTMLSpanElement).style.zIndex = '99999';
    (h as HTMLSpanElement).style.position = 'absolute';
    (h as HTMLSpanElement).style.top = '0';
    (h as HTMLSpanElement).style.width = '100%';

    const style = document.createElement('style');
    style.innerHTML = '.table-wide:before { content: unset !important; } .table-wide-inner,.mrfz-wtable { margin: 0 !important; }';
    document.head.appendChild(style);
  });
  await skillInfo.scrollIntoView();

  let toggle = await skillInfo.evaluateHandle((h) => h.firstElementChild);
  await toggle.click();
  await toggle.evaluateHandle((h) => h.remove());

  await new Promise(r => setTimeout(r, 1000));

  const screenshot = await skillInfo.screenshot({ encoding: 'binary' });
  await cache(char + skillIndex.toString(), screenshot as Buffer);

  await reply.edit({ content: `[More info](<https://arknights.wiki.gg/wiki/${char.replace(/ /gi, '_')}#Skills>)`, files: [{ attachment: screenshot }] });

  await page.close()
}
