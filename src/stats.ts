import { Message } from "discord.js";
import { toPascalCase } from "./utils";
import { cache, getCached } from "./cache";
import { Browser } from "puppeteer";

export default async (msg: Message, args: string, browser: Browser) => {
  const char = toPascalCase(args);
  const reply = await msg.reply(`Fetching ${char}'s stats`);
  let cached = await getCached(char + 'stats');
  if (cached) {
    await reply.edit({ content: `[More info](<https://arknights.wiki.gg/wiki/${char.replace(/ /gi, '_')}#Stats>)`, files: [{ attachment: cached }] });
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

  let hasStats = await page.evaluate(() => {
    try {
      let span = document.createElement('span');
      const parsed = document.getElementsByClassName('mw-parser-output')[0];
      if (parsed.children[0].nodeName == 'DL') {
        parsed.children[0].remove();
      }
      const header = parsed.children[0];
      let pageType = 'enemy';
      if (header.classList.contains('mrfz-btable')) {
        pageType = 'operator';
        let iconButtonsHeader = header.getElementsByClassName('tabber__header')[0] as HTMLDivElement;
        if (iconButtonsHeader) {
          iconButtonsHeader.style.opacity = '0';
        }
        let eliteTab = document.getElementById('tab-Elite_2-1') as HTMLAnchorElement;
        if (eliteTab) {
          eliteTab.click();
          eliteTab.parentElement.remove();
        }
        span.appendChild(header);
      }
      document.getElementsByTagName('main')[0].appendChild(span);
      span.id = 'stats';
      span.dataset.pageType = pageType;

      const statsHeader = document.getElementById('Stats').parentElement;
      if (pageType == 'operator') {
        const range = statsHeader.nextElementSibling.nextElementSibling;
        const stats = range.nextElementSibling.nextElementSibling;
        // span.appendChild(range);
        span.appendChild(stats);
      } else {
        let current = statsHeader.nextElementSibling;
        while (true) {
          if (current.nodeName == 'TABLE') {
            span.appendChild(current);
            break;
          }
          current = current.nextElementSibling;
        }
      }
      return true;
    } catch {
      return false;
    }
  });
  if (!hasStats) {
    await reply.edit(`Couldn't find ${char}'s stats`);
    return;
  }
  const span = await page.$('#stats');
  await span.evaluateHandle((h) => {
    (h as HTMLSpanElement).style.backgroundColor = '#1B1B1B';
    (h as HTMLSpanElement).style.zIndex = '99999';
    (h as HTMLSpanElement).style.position = 'absolute';
    (h as HTMLSpanElement).style.top = '0';
    (h as HTMLSpanElement).style.left = '0';
    (h as HTMLSpanElement).style.width = '1080px';
    if ((h as HTMLSpanElement).dataset.pageType == 'operator') {
      (h as HTMLSpanElement).style.padding = '5px';
    }

    const style = document.createElement('style');
    style.innerHTML = '.mrfz-btable , .mrfz-wtable { margin: 0; width: 100%; } .mrfz-btable { border: unset; width: 100%; }';
    document.head.appendChild(style);
  });
  await span.scrollIntoView();

  await new Promise(r => setTimeout(r, 1000));

  const screenshot = await span.screenshot({ encoding: 'binary' });
  await cache(char + 'stats', screenshot as Buffer);

  await reply.edit({ content: `[More info](<https://arknights.wiki.gg/wiki/${char.replace(/ /gi, '_')}#Stats>)`, files: [{ attachment: screenshot }] });

  await page.close()
}
