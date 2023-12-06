import dotenv from 'dotenv';
import { ActivityType, Client as BaseClient, Events, GatewayIntentBits, TextChannel } from 'discord.js';
import { Shoukaku, Connectors, Track } from 'shoukaku';
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
import voice from './voice';
import description from './description';

dotenv.config();

let browser: Browser;
let reportChannel: TextChannel;
export const supportsVoice = process.env.VOICE == 'true';
export const supportsWiki = process.env.WIKI == 'true';

export class Client extends BaseClient {
  shoukaku: Shoukaku;
}

const intents = GatewayIntentBits.Guilds | GatewayIntentBits.GuildMessages | GatewayIntentBits.MessageContent | GatewayIntentBits.GuildVoiceStates;
const client = new Client({ intents });
let shoukaku: Shoukaku;

client.on(Events.Error, async (err) => { console.log(err) });

client.once(Events.ClientReady, async (c) => {
  c.user.setActivity({ name: "0 sanity doctor", type: ActivityType.Streaming, url: "https://twitch.tv/kyostinv" });
  console.log(`Logged in as ${c.user.username}#${c.user.discriminator}`);
  if (supportsWiki) {
    browser = await puppeteer.launch({ headless: 'new' });
  }
  reportChannel = client.channels.cache.get('1172549728437796924') as TextChannel;
});

client.on(Events.MessageCreate, async (msg) => {
  if (!msg.content.startsWith('e!') || msg.author.id == client.user.id) return;
  const parts = msg.content.replace('e!', '').split(' ');
  const [command, args] = [parts.shift(), parts.join(' ').trim()];
  try {
    if (command == 'ping') {
      await msg.reply('<a:WDance:1132989381687382046>');
    } else if (command == 'help') {
      await msg.reply(`\`\`\`
# Command list

## Misc

ping                                 pongs
kill <thing>                         kills something
ban <thing>                          bans something (real)
howcringe, howmeta, howsimp
howreal howbased, howgenius
howlucky, howdrunk                   haha spam xddd

## Info

info <operator>                      info about an operator
stats <operator>                     info about an operator's stats
skill <operator> [skill index=1]     info about an operator's skill
talents <operator>                   info about an operator's talents (and base skills)
module <operator> <module=X|Y|Z>     info about an operator's module
user <username> [lv(level)]          info about an in-game user, optionally filters by level
map <map code> [story|easy|hard]     info about a map

## Voice

play <video>                         plays a video from youtube
leave                                leaves the voice channel
queue                                shows the current video queue
skip                                 skips the current song
\`\`\``
      );
    } else if (command == 'user' && args) {
      await user(msg, args);
    } else if (command == 'report') {
      let originalMessage = await msg.fetchReference().catch(() => undefined);
      if (originalMessage && originalMessage.author.id == client.user.id) {
        reportChannel.send(`<@559226493553737740> ${originalMessage.url} ${args}\n${msg.url} ${msg.author}`)
        await msg.react('<a:WDance:1132989381687382046>');
      } else {
        await msg.reply('You have to reply to a message that I sent to make a report');
      }
    } else if (command == 'hug') {
      await msg.reply('https://media.discordapp.net/attachments/676672353178222605/1172189444292489277/2931CA0CEEABB6EEACEB890511E84370302E89DA.png');
    } else if (command == 'committaxfraud') {
      await msg.reply('ok, done');
    } else if (command == 'kill' && args) {
      await msg.reply({ content: `Successfully killed ${args}`, allowedMentions: { parse: [] } });
    } else if (command == 'ban' && args) {
      await msg.reply({ content: `Successfully banned ${args}`, allowedMentions: { parse: [] } });
    } else if (command.startsWith('how')) {
      const metric = command.slice(3);
      const percentage = Math.round(Math.random() * 100);
      const subject = args || msg.author;
      if (['cringe', 'meta', 'simp', 'genius', 'based', 'lucky', 'real', 'drunk'].includes(metric)) {
        await msg.reply({ content: `${subject} is **${percentage}%** ${metric}`, allowedMentions: { parse: [] } });
      }
    } else if (command == 'uncache' && args && msg.author.id == '559226493553737740') {
      await rm('cache/' + args);
      await msg.react('<a:WDance:1132989381687382046>');
    } else {
      if (supportsVoice) {
        await voice(client, msg, command, args);
      }
      if (supportsWiki) {
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
        }
      }
    }
  } catch (err) {
    await msg.reply('It seems that something went wrong <:pozy_uhhh:1169454588886253689>');
    console.log(err);
  }
});

if (supportsVoice) {
  const Nodes = [{
    name: 'Localhost',
    url: 'localhost:2333',
    auth: 'youshallnotpass'
  }];

  shoukaku = new Shoukaku(new Connectors.DiscordJS(client), Nodes);

  shoukaku.on('error', (_, error) => console.error(error));
  client.shoukaku = shoukaku;
}

client.login(process.env.TOKEN);
