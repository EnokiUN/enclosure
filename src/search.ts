import { Message } from "discord.js";

export default async (msg: Message, args: string) => {
  await msg.react('<a:WDance:1132989381687382046>');
  const resp = await fetch(
    `https://arknights.wiki.gg/api.php?action=opensearch&format=json&formatversion=2&search=${encodeURIComponent(args)}&namespace=0&limit=5`,
  );
  const results: string[] = (await resp.json())[1];
  if (!results.length) {
    await msg.reply("The thing you searched for apparently does not exist <:mlynar_gaming:1182806139449131010>");
    return;
  }
  await msg.reply('## Results\n' + results.map((r) => `- ${r}`).join('\n'));
}
