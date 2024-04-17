import { Message } from "discord.js";
import { toPascalCase } from "./utils";
import { cache, getCached } from "./cache";
import { Browser } from "puppeteer";

export default async (msg: Message, args: string, browser: Browser) => {
  const parts = args.split(' ');
  let moduleIndex = parts.pop().toUpperCase();
  let char = toPascalCase(parts.join(' '));
  if (!['X', 'Y', 'Z'].includes(moduleIndex)) {
    await msg.reply('Only modules X, Y and Z exist <:warf_laugh:1161312645052383293>')
    return;
  }
  const reply = await msg.reply(`Fetching operator ${char}'s module ${moduleIndex}`);
  let cached = await getCached(char + 'mod' + moduleIndex);
  if (cached) {
    await reply.edit({ content: `[More info](<https://arknights.wiki.gg/wiki/${char.replace(/ /gi, '_')}#Modules>)`, files: [{ attachment: cached }] });
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

  const tempTitle = await page.$('#Operator_Modules');
  if (tempTitle == null) {
    await reply.edit(`Couldn't find operator ${char}'s modules`);
    return;
  }

  let hasStats = await page.evaluate((moduleIndex) => {
    try {
      let span = document.createElement('span');
      document.getElementsByTagName('main')[0].appendChild(span);
      span.id = 'modules';
      const moduleTitle = document.getElementById('Operator_Modules').parentElement;
      let module = moduleTitle.nextElementSibling;
      const actualModIndex = moduleIndex == 'Z' ? 'Δ' : moduleIndex;
      while (true) {
        try {
          if (module.nodeName == 'DIV' && module.getElementsByTagName('span')[1].innerText.endsWith(actualModIndex)) {
            break;
          }
        } catch { }
        module = module.nextElementSibling;
        if (!module) return false;
      }
      let hideButton =
        (module.getElementsByClassName('mw-collapsible-text')[0] as HTMLAnchorElement);
      hideButton.click();
      hideButton.parentElement.remove();
      (module as HTMLDivElement).style.width = '100%'
      module.children[0].remove();
      let data = module.children[0];
      data.children[3].remove();
      data.children[1].remove();
      span.appendChild(module);
      return true;
    } catch {
      return false;
    }
  }, moduleIndex);
  if (!hasStats) {
    await reply.edit(`Couldn't find ${char}'s module ${moduleIndex}`);
    return;
  }

  const span = await page.$('#modules');
  await span.evaluateHandle((h) => {
    (h as HTMLSpanElement).style.backgroundColor = '#1B1B1B';
    (h as HTMLSpanElement).style.zIndex = '99999';
    (h as HTMLSpanElement).style.position = 'absolute';
    (h as HTMLSpanElement).style.top = '0';
    (h as HTMLSpanElement).style.width = '100%';

    const style = document.createElement('style');
    style.innerHTML = '.mrfz-wtable { margin: 0 !important; }'
    document.head.appendChild(style);
  });
  await span.scrollIntoView();

  await new Promise(r => setTimeout(r, 1000));

  const screenshot = await span.screenshot({ encoding: 'binary' });
  await cache(char + 'mod' + moduleIndex, screenshot as Buffer);

  await reply.edit({ content: `[More info](<https://arknights.wiki.gg/wiki/${char.replace(/ /gi, '_')}#Modules>)`, files: [{ attachment: screenshot }] });

  await page.close()
}
