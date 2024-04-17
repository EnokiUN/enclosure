import { Message } from "discord.js";
import { toPascalCase } from "./utils";
import { cache, getCached } from "./cache";
import { Browser } from "puppeteer";

export default async (msg: Message, args: string, browser: Browser) => {
  const last = args.split(' ').at(-1);
  let mode = 'default';
  let map: string;
  if (['story', 'easy', 'hard'].indexOf(last) > -1) {
    mode = last;
    let parts = args.split(' ');
    parts.pop();
    map = toPascalCase(parts.join(' '));
  } else {
    map = toPascalCase(args);
  }

  const reply = await msg.reply(`Fetching ${map}`);
  let cached = await getCached(map + mode + 'mapinfo');
  if (cached) {
    await reply.edit({ content: `[More info](<https://arknights.wiki.gg/wiki/${map.replace(/ /gi, '_')}>)`, files: [{ attachment: cached }] });
    return;
  }
  const page = await browser.newPage();
  const resp = await page.goto(`https://arknights.wiki.gg/wiki/${map.replace(/ /gi, '_')}`, { timeout: 1000000, waitUntil: 'networkidle0' });
  if (resp.status() == 404) {
    await reply.edit(`Couldn't find ${map}`);
    return;
  }

  await page.evaluate(() => window.scrollTo(0, window.innerHeight));
  await page.evaluate(() => window.scrollTo(0, 0));

  let isMap = await page.evaluate((mode) => {
    try {
      let span = document.createElement('span');
      document.getElementsByTagName('main')[0].appendChild(span);
      span.id = 'map';

      const terminalButton = document.getElementById('tab-Terminal-0');
      (terminalButton as HTMLAnchorElement)?.click();

      if (mode == 'default') {
        const adverseButton = document.getElementById('tab-Adverse_Environment-1');
        (adverseButton as HTMLAnchorElement)?.click();
        const adverseMapButton = document.getElementById('tab-Adverse_Environment-0');
        (adverseMapButton as HTMLAnchorElement)?.click();
      } else if (mode == 'hard') {
        const hardButton = document.getElementById('tab-Adverse_Environment-1') || document.getElementById('tab-Challenge_Mode-0');
        (hardButton as HTMLAnchorElement)?.click();
        const hardMapButton = document.getElementById('tab-Adverse_Environment-0');
        (hardMapButton as HTMLAnchorElement)?.click();
      } else if (mode == 'story') {
        const storyButton = document.getElementById('tab-Story_Environment-1');
        (storyButton as HTMLAnchorElement)?.click();
      } else if (mode == 'easy') {
        const storyButton = document.getElementById('tab-Standard_Environment-1');
        (storyButton as HTMLAnchorElement)?.click();
      }

      const mapImage = document.querySelector('[aria-hidden="false"] .imagefit') || document.querySelector('.imagefit');
      span.appendChild(mapImage);

      let info: Element;
      let data = Array.from(document.getElementsByClassName('tabber__section'));
      if (data.length) {
        info = data.at(-1).querySelector('[aria-hidden="false"]')
      } else {
        info = document.querySelector('.mw-parser-output');
        while (true) {
          if (info.firstElementChild.nodeName == 'H2') {
            break;
          }
          info.firstElementChild.remove();
        }
      }
      Array.from(info.getElementsByTagName('h2')).forEach((e) => e.remove());
      Array.from(info.getElementsByClassName('mw-collapsed')).forEach((e) => e.remove());
      span.innerHTML += info.innerHTML;

      return true;
    } catch {
      return false;
    }
  }, mode);
  if (!isMap) {
    await reply.edit(`Couldn't find ${map}`);
    return;
  }
  const span = await page.$('#map');
  await span.evaluateHandle((h) => {
    (h as HTMLSpanElement).style.backgroundColor = '#1B1B1B';
    (h as HTMLSpanElement).style.zIndex = '99999';
    (h as HTMLSpanElement).style.position = 'absolute';
    (h as HTMLSpanElement).style.top = '0';
    (h as HTMLSpanElement).style.left = '0';

    const style = document.createElement('style');
    style.innerHTML = '.imagefit { width: 100% !important; } .mrfz-wtable { margin: 0; border: unset; width: 100% !important; } article { display: block; } .mw-headline { color: #eee };';
    document.head.appendChild(style);

    (h as HTMLSpanElement).style.height = 'unset';
  });
  await span.scrollIntoView();

  await new Promise(r => setTimeout(r, 1000));

  const screenshot = await span.screenshot({ encoding: 'binary' });
  await cache(map + mode + 'mapinfo', screenshot as Buffer);

  await reply.edit({ content: `[More info](<https://arknights.wiki.gg/wiki/${map.replace(/ /gi, '_')}>)`, files: [{ attachment: screenshot }] });

  await page.close()
}
