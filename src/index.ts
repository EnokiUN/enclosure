import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { ActivityType, AttachmentBuilder, Client, Events, GatewayIntentBits, GuildChannel, TextChannel } from 'discord.js';
import { Database, open } from 'sqlite';
import sqlite3 from 'sqlite3'
import { Browser } from 'puppeteer';
import { rm } from 'fs/promises';
import puppeteer from 'puppeteer';
import skill from './skill';
import talents from './talents';
import info from './info';
import stats from './stats';
import module from './module';
import map from './map';
import user from './user';
import description from './description';
import search from './search';
import { handleInteraction, handleGachaCommand } from './gacha';
import { createCanvas, Image } from '@napi-rs/canvas';
import aliases from './aliases';

dotenv.config();

let browser: Browser;
let reportChannel: TextChannel;
let WOK: Image;
export const supportsWiki = process.env.WIKI == 'true';

const intents = GatewayIntentBits.Guilds | GatewayIntentBits.GuildMessages | GatewayIntentBits.MessageContent | GatewayIntentBits.GuildVoiceStates;
const client = new Client({ intents });

let chars: { [name: string]: { name: string, rarity: number } } = JSON.parse(readFileSync('simple_character_data.json').toString());
let charsByName: { [name: string]: string } = {};
Object.entries(chars).forEach(([id, c]) => { charsByName[c.name] = id; });

let db: Database<sqlite3.Database, sqlite3.Statement>;

client.on(Events.Error, async (err) => { console.log(err) });

client.once(Events.ClientReady, async (c) => {
  db = await open({ filename: 'db.db', driver: sqlite3.Database });
  c.user.setActivity({ name: "0 sanity doctor", type: ActivityType.Streaming, url: "https://twitch.tv/kyostinv" });
  console.log(`Logged in as ${c.user.username}#${c.user.discriminator}`);
  if (supportsWiki) {
    browser = await puppeteer.launch({ headless: 'new' });
  }
  reportChannel = client.channels.cache.get('1172549728437796924') as TextChannel;
  let wokBytes = await (await fetch('https://i5.walmartimages.com/asr/daf94fa7-3c4b-4da7-b973-c8399b2cb8dd_1.3c89a7f2b5c633c68a02ecbb61ca49b2.jpeg')).arrayBuffer();
  WOK = new Image();
  WOK.src = Buffer.from(wokBytes);
});

client.on(Events.MessageCreate, async (msg) => {
  if (msg.author.id != client.user.id && msg.channelId == '1128297878855626873') {
    let contentParts = msg.content.split(/ |\n/);
    if (contentParts.length > 1) {
      let pairs: string[][];
      if (contentParts.length > 2) {
        pairs = contentParts.slice(0, -1).map((_, i) => contentParts.slice(i, i + 2));
      } else {
        pairs = [contentParts];
      }

      for (let i = 0; i < pairs.length; i++) {
        await db.run('INSERT INTO markov(word1, word2) VALUES(?, ?)', pairs[i]);
      }
    }
  }
  if (msg.content == 'Shut up <:mosti_dare:1156860346645098566>') {
    await msg.reply('no u, nerd');
    return;
  }
  if (!msg.content.toLowerCase().startsWith('e!') || msg.author.id == client.user.id) {
    if (msg.content.toLowerCase().replace(/ /g, '').indexOf('kya') > -1) {
      await msg.react('<:kyaer:1247513995104096286>');
    }
    return;
  }
  const parts = msg.content.replace(/e!/i, '').split(' ');
  const [command, args] = [parts.shift(), parts.join(' ').trim()];
  try {
    if (command == 'ping') {
      await msg.reply('<a:WDance:1132989381687382046>');
    } else if (command == 'help') {
      await msg.reply('If you know, you know :D');
    } else if (command == 'user' && args) {
      await user(msg, args, browser);
    } else if (command == 'report') {
      let originalMessage = await msg.fetchReference().catch(() => undefined);
      if (originalMessage && originalMessage.author.id == client.user.id) {
        reportChannel.send(`<@559226493553737740> ${originalMessage.url} ${args}\n${msg.url} ${msg.author}`)
        await msg.react('<a:WDance:1132989381687382046>');
      } else {
        await msg.reply('You have to reply to a message that I sent to make a report');
      }
    } else if (command == 'wok') {
      let mentioned = msg.mentions.users.at(0);
      if (!mentioned && args) {
        mentioned = msg.guild.members.cache.find(user => user.displayName == args || user.user.username == args)?.user;
      }
      let imageUrl = mentioned?.displayAvatarURL({ extension: 'png' });
      if (!imageUrl && args) {
        const name = aliases[args.toLowerCase()] ?? args.at(0).toUpperCase() + args.substring(1);
        let op = charsByName[name];
        if (op) {
          imageUrl =
            `https://raw.githubusercontent.com/yuanyan3060/ArknightsGameResource/main/portrait/${op}_1.png`
        }
      }
      if (imageUrl) {
        const canvas = createCanvas(798, 798);
        const context = canvas.getContext('2d');
        context.drawImage(WOK, 0, 0, canvas.width, canvas.height);
        const avatarBytes = await (await fetch(imageUrl)).arrayBuffer();
        const avatar = new Image();
        avatar.src = Buffer.from(avatarBytes);
        context.drawImage(avatar, 200, 300, 300, 300);
        const attachment = new AttachmentBuilder(canvas.toBuffer('image/png'), { name: 'wok.png' });
        await msg.reply({ files: [attachment] })
      } else {
        await msg.reply('https://i5.walmartimages.com/asr/daf94fa7-3c4b-4da7-b973-c8399b2cb8dd_1.3c89a7f2b5c633c68a02ecbb61ca49b2.jpeg?odnWidth=1000&odnHeight=1000&odnBg=ffffff');
      }
    } else if (command == 'won') {
      await msg.reply('https://en.numista.com/catalogue/photos/coree_du_sud/5ea5c758432e06.99771138-original.jpg');
    } else if (command == 'woo') {
      await msg.reply('<:woo:1012378275538018405>');
    } else if (command == 'noki') {
      await msg.reply('<@559226493553737740>');
      await msg.reply('<@559226493553737740>');
      await msg.reply('<@559226493553737740>');
    } else if (command == 'Balls.') {
      await msg.reply('https://media.discordapp.net/attachments/1128297878855626873/1235547565404065793/image-1.png?ex=667d4756&is=667bf5d6&hm=3f80af833a47eb25bf068a89bf68cdfc7e52fd50f3264f7e7445db7443c3466d&=&format=webp&quality=lossless&width=253&height=350');
    } else if (command == 'hug') {
      await msg.reply('https://media.discordapp.net/attachments/676672353178222605/1172189444292489277/2931CA0CEEABB6EEACEB890511E84370302E89DA.png');
    } else if (command == 'lol') {
      await msg.reply('https://cdn.discordapp.com/attachments/1128297878855626873/1271108324925902930/Lol.mp4?ex=66b62360&is=66b4d1e0&hm=0c0b9f7b788036f84955218eee6a09762371fab7ac20f08bb88f55e16593d4c1&');
    } else if (command == 'eventmats') {
      await msg.reply('https://x.com/oyuki_gms/status/1819287489510887477');
    } else if (command == 'committaxfraud') {
      await msg.reply('ok, done');
    } else if (command == 'kill' && args) {
      if (args == 'yourself' && (msg.author.id == '559226493553737740' || msg.author.id == '436063009438171139')) {
        await msg.reply('ok');
        await client.destroy();
        return;
      }
      await msg.reply({ content: `Successfully killed ${args}`, allowedMentions: { parse: [] } });
    } else if (command == 'ban' && args) {
      await msg.reply({ content: `Successfully banned ${args}`, allowedMentions: { parse: [] } });
    } else if (command == 'xd' && msg.reference) {
      let reference = await msg.fetchReference();
      await msg.reply({
        content: reference.content.split(/ |\n/g)
          .map(value => ({ value, sort: Math.random() }))
          .sort((a, b) => a.sort - b.sort)
          .map(({ value }) => value)
          .join(' '), allowedMentions: { parse: [] }
      }
      );
    } else if (command == 'talk' && msg.channelId == '1128297878855626873') {
      let start: string;
      if (args) {
        start = args.split(/ |\n/).at(-1);
      } else {
        start = (await db.get('SELECT word1 FROM markov ORDER BY RANDOM() LIMIT 1')).word1;
      }
      let content = args ?? start;
      let last = start;
      for (let depth = 20; depth > 0; depth--) {
        let newWord = await db.get('SELECT word2 FROM markov WHERE word1 = ? ORDER BY RANDOM() LIMIT 1', [last]);
        if (!newWord || !newWord.word2) {
          break;
        }
        last = newWord.word2;
        content += ' ' + last;
      }
      if (start == content) {
        await msg.reply('I\'m too dumb for this D:');
        return;
      }
      await msg.reply(content);
    } else if (command.startsWith('how')) {
      const metric = command.slice(3);
      const percentage = Math.round(Math.random() * 100);
      const subject = args || msg.author;
      if (['cringe', 'meta', 'simp', 'genius', 'based', 'lucky', 'real', 'drunk', 'sus', 'sharp'].includes(metric)) {
        await msg.reply({ content: `${subject} is **${percentage}%** ${metric}`, allowedMentions: { parse: [] } });
      }
    } else if (command == 'wife') {
      await msg.reply(
        `✨*how does it appear*✨
✨*my form in your eyes?*✨
✨*perhaps within the clockwork of time*✨
✨*the answer lies*✨`
      );
    } else if (command == 'uncache' && args && msg.author.id == '559226493553737740') {
      await rm('cache/' + args);
      await msg.react('<a:WDance:1132989381687382046>');
    } else {
      if (await handleGachaCommand(msg, command, args, db) &&
        supportsWiki) {
        if ((command == 'skill' || command == 'skills') && args) {
          await skill(msg, args, browser);
        } else if ((command == 'talents' || command == 'talent') && args) {
          await talents(msg, args, browser);
        } else if (command == 'info' && args) {
          await info(msg, args, browser);
        } else if ((command == 'desc' || command == 'description') && args) {
          await description(msg, args, browser);
        } else if (command == 'stats' && args) {
          await stats(msg, args, browser);
        } else if ((command == 'module' || command == 'mod') && args) {
          await module(msg, args, browser);
        } else if (command == 'map' && args) {
          await map(msg, args, browser);
        } else if (command == 'search' && args) {
          await search(msg, args);
        }
      }
    }
  } catch (err) {
    await msg.reply('It seems that something went wrong <:pozy_uhhh:1169454588886253689>');
    console.log(err);
  }
});

client.on(Events.InteractionCreate, async (inter) => {
  if (inter.isButton()) {
    try {
      await handleInteraction(inter, db);
    } catch (err) {
      await inter.reply('It seems that something went wrong <:pozy_uhhh:1169454588886253689>');
      console.log(err);
    }
  }
});

client.login(process.env.TOKEN);
