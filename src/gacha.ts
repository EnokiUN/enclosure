import { Database } from "sqlite";
import sqlite3 from "sqlite3";
import { readFileSync } from 'fs';
import { ActionRowBuilder, ButtonBuilder, ButtonInteraction, ButtonStyle, Interaction, Message, MessagePayloadOption, User } from "discord.js";
import aliases from "./aliases";
import { Kits } from "./kits";

type DB = Database<sqlite3.Database, sqlite3.Statement>;

const rarityEmojis = ['<:3star:1255606348977274981>', '<:4star:1255606520478175353>', '<:5star:1255606638547828786>', '<:6star:1255606724363288577>'];
const eliteEmojis = ['<:elite0:1255617673476313119>', '<:elite1:1255617756431257720>', '<:elite2:1255617822915166208>'];
const rateUps = [["char_4133_logos", "char_4082_qiubai"], ["char_4016_kazema", "char_107_liskam", "char_4137_udflow"]];

const skinLines = ['Test Colection', 'Epoque', 'Made by 0011', 'Tempest', 'Coral Coast', 'Marthe', 'Witch Fest', 'Cambrian Series', 'Icefield Messenger', 'Vitafield', 'Pioneer', 'Striker', 'Bloodline of Combat', 'Rhodes Kitchen', 'Dreambind Castle', 'Whistlewind', 'Ambience Synesthesia', 'Crossover', 'Shining Steps', 'Achievement Star', 'Yun', 'Liberation Provident', 'Unveiling of Devotion'];
const nations = ['Dublinn', 'Minos', 'Siesta', 'Yan', 'Rhine Labs', 'Glasgow Gang', 'Sargon', 'Sweep', 'Pinus Sylvestris', 'Laterano', 'Victoria', 'Yan Lungmen', 'RI Elite Operators', 'Leithanien', 'Sui', 'Columbia', 'Babel', 'Penguin Logistics', 'Ursus', 'Ægir', 'Blacksteel', 'Rim Billiton', 'Bolivar', 'Karlan Trade', 'Sami', 'Higashi', 'Rhodes Island', 'LGD', 'Kjerag', 'Siracusa', 'Kazimierz', 'Iberia', 'Abyssal Hunters']

let cooldowns: { [name: string]: { work: number, grind: number, pulling: boolean, } } = {};
let rpsGamers = [];
let rpsGames: { [name: string]: { amount: number, user1: User, user2: User, user1Pick: string, user2Pick: string } } = {};

let chars: { [name: string]: { name: string, rarity: number } } = JSON.parse(readFileSync('simple_character_data.json').toString());
let charsByRarity = { 6: {}, 5: {}, 4: {}, 3: {}, 2: {}, 1: {} };
let charsByName: { [name: string]: string } = {};
Object.entries(chars).forEach(([id, c]) => { charsByRarity[c.rarity][id] = c; charsByName[c.name] = id; });

const getOrundum = async (userId: string, db: DB): Promise<number> => {
  let orundum = (await db.get('SELECT orundum FROM users WHERE id = ?', [userId]))?.orundum;
  if (orundum == undefined) {
    await db.run('INSERT INTO users(id) VALUES(?)', [userId]);
    await db.run('INSERT INTO teams(user_id) VALUES(?)', [userId]);
    orundum = 0;
  }
  return orundum;
}

export interface Operator {
  id: number;
  charId: string;
  userId: string;
  name: string;
  rarity: number;
  level: number;
  xp: number;
  rank: number;
  favourited: number;
};

const getOperator = async (operatorId: number, db: DB): Promise<Operator> => {
  let operator = await db.get('SELECT * FROM operators WHERE id = ?', [operatorId]);
  let charData = chars[operator.char_id];
  return {
    id: operatorId,
    charId: operator.char_id,
    userId: operator.user_id,
    name: charData.name,
    rarity: charData.rarity,
    level: operator.level,
    xp: operator.xp,
    rank: operator.rank,
    favourited: operator.favourited,
  };
}

const xpForLevel = (level: number): number => {
  return Math.floor((5 / 6 * level * (2 * level * level + 27 * level + 91)) / 30);
}

const addOperator = async (userId: string, charId: string, db: DB): Promise<boolean> => {
  await getOrundum(userId, db); // creating their "account"
  let id = (await db.get('SELECT id FROM operators WHERE user_id = ? AND char_id = ?', [userId, charId]))?.id;
  if (!id) {
    await db.run('INSERT INTO operators(user_id, char_id) VALUES(?, ?)', [userId, charId]);
    return true;
  }
  return false;
}

let workLines = [
  'opName saw you walking down the street and decided to say hi which somehow lead to them giving you newOrun, how nice of them',
  'You caught opName slacking while you were on patrol, they decided to give you newOrun to keep you silent',
  'You decided to run annihilation and managed to get newOrun out of it',
  'opName\'s new event just released, you decided to play it and got newOrun out of it',
  'opName tripped right in front of you and fell on their face, they dropped newOrun which you decided to take as a fee for helping them up',
  'You stole opName\'s wallet and found newOrun in it, shhhh',
  'You got into a fight with an internet stranger about how Arknights is better than other games and Haimao decided to give you newOrun for your effort',
  'You woke up and found that ~~opName~~ the tooth fairy put newOrun under your pillow',
  'opName received a good amount of orundum as their reward after a mission. They shared newOrun with you',
  'While you were being a sneaky sneaker and were stalking a new operator, opName appeared out of nowhere and snap you into unconscious. When you wake up, you found a small crack on the wall due to the collision, where newOrun were found inside (don\'t ask who hid it in the walls, it\'s better this way)',
  'After a battle in the mines, you found that a hidden Originium Ore melted from opName\'s arts. newOrun was mined from it',
  'You and opName played a game of chess. opName lost and you got newOrun as reward',
  'You went to help opName train to be the very best, that no one ever was. newOrun were given to you as compensation',
  'opName and opName alter were arguing on who\'ll take this pile of newOrun. You decided to take the chance and nab them then immediately ran as fast as you could',
  'opName is too rich and they\'re thinking on how to deal with the huge pile of orundum. You suggested they give some to you, and they somehow listened and gave you newOrun',
  'You found a map with a marked location and asked opName for an adventure. A pile of Orundums was found from there, and you took newOrun from it',
  'While you were eating, you accidentally bite on something hard, and when you look at it, it\'s an originium prime that can be converted to newOrun (though who put those inside???)',
  'opName suddenly pays you a visit, and newOrun were given as a gift, and just when you\'re about to get emotional, they\'re already gone (money laundering 100%)',
  'You and opName saw a group of criminals, and obviously they\'re faced with your "merciful" judgement. Turns out they had a newOrun bounty on their heads, yippee',
  'When you opened the door of opName\'s door, you found that they were asleep. As a good friend and responsible person, you decide to take newOrun from their wallet to teach them never to forget to close their doors while they\'re asleep',
  'You entered an instant noodle eating contest and as the doctor of Rhodes Island and the ghost of Babel you used your perfected techniques and managed to win newOrun',
  'opName broke into your office and wished you a happy birthday (it\'s not your birthday), they gave you newOrun as a gift tho :D',
  'opName was very bored so they decided to sell their kidney and give you newOrun from their profits (guildmarm suggested this)',
];

const getOperatorPage = async (user: User, args: string, db: DB) => {
  let operators = await db.all('SELECT id, char_id, level, xp, rank, favourited FROM operators WHERE user_id = ?', [user.id]);
  let opCount = operators.length;
  let maxPages = Math.ceil(opCount / 20)
  let page = Number.parseInt(args);
  if (isNaN(page)) {
    page = 1;
  }
  let end = Math.max(page, 1) * 20;
  operators = operators.sort((o1, o2) => {
    let charData1 = chars[o1.char_id];
    let charData2 = chars[o2.char_id];
    return charData2.rarity - charData1.rarity;
  }).sort((o1, o2) => {
    return o2.favourited - o1.favourited;
  })
    .slice(end - 20, end);
  let nextButton = new ButtonBuilder().setCustomId(`ops:${page + 1}`).setEmoji('➡️').setStyle(ButtonStyle.Primary).setDisabled(page * 20 > opCount);
  let previousButton = new ButtonBuilder().setCustomId(`ops:${page - 1}`).setEmoji('⬅').setStyle(ButtonStyle.Primary).setDisabled(page == 1);
  let row = new ActionRowBuilder<ButtonBuilder>().addComponents(previousButton, nextButton);
  if (operators.length) {
    return {
      embeds: [{
        description: operators.map((o) => {
          let charData = chars[o.char_id];
          let charName = o.favourited ? `__${charData.name}__` : charData.name;
          return `${rarityEmojis[charData.rarity - 3]}**\`${('#' + o.id.toString()).padStart(5)}\` ${charName}** ${eliteEmojis[o.rank]} Level **${o.level}**`;
        }).join('\n'),
        thumbnail: {
          url:
            `https://raw.githubusercontent.com/yuanyan3060/ArknightsGameResource/main/avatar/${operators[0].char_id}.png`
        },
        author: { icon_url: user.avatarURL(), name: user.displayName },
        footer: { text: `${opCount} operators - page ${page} out of ${maxPages}` },
      }],
      components: [row]
    };
  }
  else {
    return { content: 'You don\'t have any operators in this page yet, try pulling for some first' };
  }
}

export const handleInteraction = async (inter: ButtonInteraction, db: DB) => {
  let buttonData = inter.customId.split(':');
  let buttonType = buttonData.shift();
  if (buttonType == 'ops') {
    if ((await inter.message.fetchReference())?.author != inter.user) {
      await inter.reply({ content: "nuh-uh not for you >:(", ephemeral: true });
      return;
    }
    await inter.update(await getOperatorPage(inter.user, buttonData[0], db));
  } else if (buttonType == 'rps') {
    let game = rpsGames[inter.message.id];
    if (!game) {
      await inter.deferUpdate();
      return;
    }
    let user: User;
    let index = 0;
    if (inter.user.id == game.user1.id) {
      user = game.user1;
      index = 1;
    } else if (inter.user.id == game.user2.id) {
      user = game.user2;
      index = 2;
    } else {
      await inter.reply({ content: "nuh-uh not for you >:(", ephemeral: true });
      return;
    }
    if (buttonData[0] == "abort") {
      rpsGames[inter.message.id] = null;
      rpsGamers = rpsGamers.filter(function(item) {
        return item !== game.user1.id && item !== game.user2.id
      })
      await inter.message.delete();
      await inter.reply('Aborted match');
      return;
    }
    if (index == 1) {
      if (game.user1Pick) {
        await inter.reply({ content: "too late to change now", ephemeral: true });
        return;
      }
      game.user1Pick = buttonData[0];
      await inter.reply({ content: `Picked ${buttonData[0]}`, ephemeral: true });
    }
    if (index == 2) {
      if (game.user2Pick) {
        await inter.reply({ content: "too late to change now", ephemeral: true });
        return;
      }
      game.user2Pick = buttonData[0];
      await inter.reply({ content: `Picked ${buttonData[0]}`, ephemeral: true });
    }
    if (game.user1Pick && game.user2Pick && inter.replied) {
      if (game.user1Pick == game.user2Pick) {
        await inter.channel.send('Tie');
      } else if (wonRPS(game.user1Pick, game.user2Pick)) {
        await inter.channel.send(`${game.user1} won **__${game.amount}__** <:orundum:1256240415275749416>`);
        await db.run('UPDATE users SET orundum = orundum + ? WHERE id = ?', [game.amount, game.user1.id]);
        await db.run('UPDATE users SET orundum = orundum - ? WHERE id = ?', [game.amount, game.user2.id]);
      } else {
        await inter.channel.send(`${game.user2} won **__${game.amount}__** <:orundum:1256240415275749416>`);
        await db.run('UPDATE users SET orundum = orundum + ? WHERE id = ?', [game.amount, game.user2.id]);
        await db.run('UPDATE users SET orundum = orundum - ? WHERE id = ?', [game.amount, game.user1.id]);
      }
      rpsGames[inter.message.id] = null;
      rpsGamers = rpsGamers.filter(function(item) {
        return item !== game.user1.id && item !== game.user2.id
      })
      await inter.message.delete();
    }
  }
}

const wonRPS = (pick1: string, pick2: string) => {
  if ((pick1 == 'scissors' && pick2 == 'paper') || (pick1 == 'paper' && pick2 == 'rock') || (pick1 == 'rock' && pick2 == 'sciccors')) return true;
  return false;
}

const displayTeamOperator = (operator: Operator): string => {
  let operatorName = operator.favourited ? `__${operator.name}__` : operator.name;
  return `${rarityEmojis[operator.rarity - 3]} **${operatorName}** ${eliteEmojis[operator.rank]} Level **${operator.level}**`;
}

export const handleGachaCommand = async (msg: Message, command: string, args: string, db: DB) => {
  if (!cooldowns[msg.author.id]) {
    cooldowns[msg.author.id] = { work: 0, grind: 0, pulling: false };
  }
  if (command == 'balance' || command == 'bal' || command == 'profile') {
    let orundum = await getOrundum(msg.author.id, db);
    let data = await db.get('SELECT level, xp, chips, xp_cards FROM users WHERE id = ?', [msg.author.id]);
    let topOp = (await db.get('SELECT char_id FROM operators WHERE user_id = ? AND favourited = 1 LIMIT 1', [msg.author.id]))?.char_id;
    let name = msg.author.displayName;
    if (msg.author.id == '256133489454350345') {
      name = name + ' (central bank)';
    }
    await msg.reply(
      {
        embeds: [{
          title: `Level ${data.level} ${name}`,
          description:
            `Level Progress: **${Math.max(data.xp - xpForLevel(data.level), 0)}**xp/**${xpForLevel(data.level + 1) - xpForLevel(data.level)}**xp\nOrundum: **${orundum}** <:orundum:1256240415275749416>\nChips: **${data.chips}** <:chip:1256247209301774418>\nXP Cards: **${data.xp_cards}** <:xp_card:1256247602987405414>`,
          author: { icon_url: msg.author.avatarURL(), name: msg.author.displayName },
          thumbnail: topOp ? {
            url:
              `https://raw.githubusercontent.com/yuanyan3060/ArknightsGameResource/main/avatar/${topOp}.png`
          } : undefined,
        }]
      }
    )
  } else if (command == 'operators' || command == 'ops') {
    await msg.reply(await getOperatorPage(msg.author, args, db));
  } else if (command == 'gameinfo') {
    const name = aliases[args.toLowerCase()] ?? args;
    let operatorId = charsByName[name];
    await msg.reply(Kits[operatorId].info);
  } else if (command == 'favourite') {
    let op = await db.get('SELECT char_id, favourited FROM operators WHERE user_id = ? AND id = ?', [msg.author.id, args]);
    if (!op) {
      await msg.reply('The operator you tried to favourite is not one that you own, please obtain them or stop fucking around <:kk:980418492211810334>');
      return;
    }
    await db.run('UPDATE operators SET favourited = not favourited WHERE id = ?', [args]);
    let charData = chars[op.char_id];
    await msg.reply(`Successfully ${op.favourited ? 'unfavourited' : 'favourited'} ${charData.name}`);
  } if (command == 'banner') {
    let pity = (await db.get('SELECT pity FROM users WHERE id = ?', [msg.author.id]))?.pity ?? 0;
    await msg.reply(`## Rateups:
:star::star::star::star::star::star: 6* ${chars[rateUps[0][0]].name}, ${chars[rateUps[0][1]].name}
:star::star::star::star::star: 5* ${chars[rateUps[1][0]].name}, ${chars[rateUps[1][1]].name}, ${chars[rateUps[1][2]].name}

### Pity Rules:
At 50 pity, you are guaranteed to pull a 6:star: operator.
At 40+ pity, 6:star: odds 2% -> 7%, 5:star: odds 8% -> 13%, 4:star: odds 50% -> 55%.

You currently have **${pity}** pity.
  `)
  } else if (command == 'team' && args.startsWith('set')) {
    let parts = args.split(' ');
    parts.shift();
    let operator = parts.pop();
    let position = parts.join('').toLowerCase();
    if (!['field', 'support1', 'support2', 'support3'].includes(position)) {
      await msg.reply('Please specify what you\'re setting from `field`, `support1`, `support2` and `support3`')
      return;
    }
    if (position == 'field') {
      position = 'field_unit';
    }
    if (operator == 'none') {
      await db.run(`UPDATE teams SET ${position} = NULL WHERE user_id = ?`, [msg.author.id]);
      await msg.reply('Succesfully updated your team lineup');
      return;
    }
    let operatorId = Number.parseInt(operator);
    if (isNaN(operatorId)) {
      await msg.reply('Please supply a valid operator ID :/')
      return;
    }
    let operatorData = await getOperator(operatorId, db);
    if (!operatorData || operatorData.userId != msg.author.id) {
      await msg.reply('The operator you tried to add is not one that you own, please obtain them or stop fucking around <:kk:980418492211810334>');
      return
    }
    if (!Kits[operatorData.charId]) {
      await msg.reply(`Unfortunately, ${operatorData.name} doesn't have a bot kit yet and as such cannot be a part of your team. Sorry for the inconvenience.`);
      return;
    }
    let team = await db.get('SELECT field_unit, support1, support2, support3 FROM teams WHERE user_id = ?', [msg.author.id]);
    Object.entries(team).forEach(([pos, op]) => {
      if (op == operatorId) {
        team[pos] = team[position];
      }
    })
    team[position] = operatorId;
    await db.run(`UPDATE teams SET field_unit = ?, support1 = ?, support2 = ?, support3 = ? WHERE user_id = ?`, [team.field_unit, team.support1, team.support2, team.support3, msg.author.id]);
    let fieldUnit = team.field_unit ? await getOperator(team.field_unit, db) : undefined;
    let support1 = team.support1 ? await getOperator(team.support1, db) : undefined;
    let support2 = team.support2 ? await getOperator(team.support2, db) : undefined;
    let support3 = team.support3 ? await getOperator(team.support3, db) : undefined;
    await msg.reply({
      content: 'Succesfully updated your team lineup',
      embeds: [{
        title:
          `${msg.author.displayName}'s Team`, description:
          `Field Unit: ${fieldUnit ? displayTeamOperator(fieldUnit) : 'None'}
Support 1: ${support1 ? displayTeamOperator(support1) : 'None'}
Support 2: ${support2 ? displayTeamOperator(support2) : 'None'}
Support 3: ${support3 ? displayTeamOperator(support3) : 'None'}`
      }]
    });
  } else if (command == 'team') {
    await getOrundum(msg.author.id, db);
    let team = await db.get('SELECT field_unit, support1, support2, support3 FROM teams WHERE user_id = ?', [msg.author.id]);
    let fieldUnit = team.field_unit ? await getOperator(team.field_unit, db) : undefined;
    let support1 = team.support1 ? await getOperator(team.support1, db) : undefined;
    let support2 = team.support2 ? await getOperator(team.support2, db) : undefined;
    let support3 = team.support3 ? await getOperator(team.support3, db) : undefined;
    await msg.reply({
      embeds: [{
        title:
          `${msg.author.displayName}'s Team`, description:
          `Field Unit: ${fieldUnit ? displayTeamOperator(fieldUnit) : 'None'}
Support 1: ${support1 ? displayTeamOperator(support1) : 'None'}
Support 2: ${support2 ? displayTeamOperator(support2) : 'None'}
Support 3: ${support3 ? displayTeamOperator(support3) : 'None'}`
      }]
    });
  } else if (command == 'fight') {
    let team = await db.get('SELECT field_unit, support1, support2, support3 FROM teams WHERE user_id = ?', [msg.author.id]);
    let fieldUnit = team.field_unit ? await getOperator(team.field_unit, db) : undefined;
    let support1 = team.support1 ? await getOperator(team.support1, db) : undefined;
    let support2 = team.support2 ? await getOperator(team.support2, db) : undefined;
    let support3 = team.support3 ? await getOperator(team.support3, db) : undefined;
    if (!fieldUnit) {
      await msg.reply('Your team must have at least a field unit, how are you gonna fight otherwise duh');
      return;
    }
    await msg.reply({
      embeds: [{
        title: 'Level 1000 Punching Bag',
        thumbnail: { url: 'https://arknights.wiki.gg/images/0/01/Patriot_sprite.png' },
        image: {
          url:
            `https://raw.githubusercontent.com/yuanyan3060/ArknightsGameResource/main/skin/${fieldUnit.charId}_${Math.max(fieldUnit.rank, 1)}b.png`
        },
      }],
      components: (new Kits[fieldUnit.charId].kit).createActionRows(),
    })
  } else if (command == 'work') {
    let now = Date.now();
    let remainingCD = now - (cooldowns[msg.author.id].work ?? 0);
    if (remainingCD < 600000) {
      await msg.reply(`You are currently under cooldown for another **__${Math.round((600000 - remainingCD) / 60000)} minutes__ ** <:pozy_uhhh:1169454588886253689>`);
      return;
    }
    let orundum = await getOrundum(msg.author.id, db);
    let amount = 300 + Math.ceil(Math.random() * 600);
    await db.run('UPDATE users SET orundum = orundum + ? WHERE id = ?', [amount, msg.author.id]);

    let data = await db.get('SELECT level, xp FROM users WHERE id = ?', [msg.author.id]);
    let level = data.level;
    let xp = data.xp;
    let xpGained = Math.ceil(level * 0.75 / 4);

    let keys = Object.keys(chars);
    let operatorId = keys[keys.length * Math.random() << 0];
    let operator = chars[operatorId];
    let workLine = workLines[Math.floor(Math.random() * workLines.length)];
    await msg.reply(workLine.replace(/opName/g, operator.name).replace(/newOrun/g, `**__${amount}__** <:orundum:1256240415275749416>`) + ` - You now have **__${orundum + amount}__** <:orundum:1256240415275749416>`);

    if (xp + xpGained >= xpForLevel(level + 1)) {
      await db.run('UPDATE users SET xp = ?, level = level + 1 WHERE id = ?', [xp + xpGained, msg.author.id]);
      await msg.reply(`## Congratulations, you leveled up! :confetti_ball: \nYou are now level **__${level + 1}__**!`)
    } else {
      await db.run('UPDATE users SET xp = ? WHERE id = ?', [xp + xpGained, msg.author.id]);
    }
    cooldowns[msg.author.id].work = now;
  } else if ((command == 'grind' || command == 'farm') && ['chips', 'xp'].includes(args)) {
    let now = Date.now();
    let remainingCD = now - (cooldowns[msg.author.id].grind ?? 0);
    if (remainingCD < 1800000) {
      await msg.reply(`You are currently under cooldown for another **__${Math.round((1800000 - remainingCD) / 60000)} minutes__ ** <:pozy_uhhh:1169454588886253689>`);
      return;
    }
    await getOrundum(msg.author.id, db);
    let data = await db.get('SELECT level, xp FROM users WHERE id = ?', [msg.author.id]);
    let level = data.level;
    let xp = data.xp;
    let worldLevel = Math.min(Math.ceil(level / 10), 6);
    let xpGained = Math.ceil(level * 0.75);
    if (args == 'xp') {
      let amount = 3 ** worldLevel + Math.ceil(Math.random() * worldLevel * 3);
      await db.run('UPDATE users SET xp_cards = xp_cards + ? WHERE id = ?', [amount, msg.author.id]);
      await msg.reply(`After grinding <:xp_card:1256247602987405414> for a while, you managed to nab **__${amount}__** <:xp_card:1256247602987405414> and got **${xpGained}** xp, such cool much experience.`);
    } else if (args == 'chips') {
      let amount = 2 ** worldLevel + Math.ceil(Math.random() * worldLevel * 2);
      await db.run('UPDATE users SET chips = chips + ? WHERE id = ?', [amount, msg.author.id]);
      await msg.reply(`After grinding <:chip:1256247209301774418> for a while, you managed to nab **__${amount}__** <:chip:1256247209301774418> and got **${xpGained}** xp, how technological.`);
    }
    if (xp + xpGained >= xpForLevel(level + 1)) {
      await db.run('UPDATE users SET xp = xp + ?, level = level + 1 WHERE id = ?', [xpGained, msg.author.id]);
      await msg.reply(`## Congratulations, you leveled up! :confetti_ball: \nYou are now level **__${level + 1}__**!`)
    } else {
      await db.run('UPDATE users SET xp = xp + ? WHERE id = ?', [xpGained, msg.author.id]);
    }
    cooldowns[msg.author.id].grind = now;
  } else if (command == 'rps' && args) {
    let parts = args.split(' ');
    let amount = Number.parseInt(parts.pop());
    if (isNaN(amount) || amount < 500) {
      await msg.reply('Please provide a proper amount starting from **__500__** <:orundum:1256240415275749416>')
      return;
    }
    let user = msg.mentions.users.at(0);
    if (!user && args) {
      let name = parts.join(' ');
      user = msg.guild.members.cache.find(user => user.displayName == name || user.user.username == name)?.user;
    }
    if (msg.author.id == user.id) {
      await msg.reply('Are you really so sad that you\'d play against yourself? :sob:');
      return;
    }
    let user1Orundum = await getOrundum(msg.author.id, db);
    let user2Orundum = await getOrundum(user.id, db);
    if (user1Orundum < amount) {
      await msg.reply('Oi you don\'t even have enough orundum for this smfh');
      return;
    }
    if (user2Orundum < amount) {
      await msg.reply('Sadly the person you want to challenge is fucking poor and doesn\'t have enough orundum for this');
      return;
    }
    if (rpsGamers.includes(msg.author.id)) {
      await msg.reply('You\'re already in a game of this');
      return;
    }
    if (rpsGamers.includes(user.id)) {
      await msg.reply('They\'re already in a game of this, be a bit patient smh');
      return;
    }
    rpsGamers.push(msg.author.id);
    rpsGamers.push(user.id);
    let rockButton = new ButtonBuilder().setCustomId(`rps:rock`).setEmoji('🪨').setStyle(ButtonStyle.Primary);
    let paperButton = new ButtonBuilder().setCustomId(`rps:paper`).setEmoji('📜').setStyle(ButtonStyle.Success);
    let scissorsButton = new ButtonBuilder().setCustomId(`rps:scissors`).setEmoji('✂').setStyle(ButtonStyle.Danger);
    let abortButton = new ButtonBuilder().setCustomId(`rps:abort`).setEmoji('⚠').setStyle(ButtonStyle.Secondary);
    let row = new ActionRowBuilder<ButtonBuilder>().addComponents(rockButton, paperButton, scissorsButton, abortButton);
    let reply = await msg.reply({ embeds: [{ description: `Insane duel over  **__${amount * 2}__** <:orundum:1256240415275749416>`, color: 0xaa1111 }], components: [row] });
    rpsGames[reply.id] = { amount, user1: msg.author, user2: user, user1Pick: undefined, user2Pick: undefined };
  } else if (command == 'pull10' || (command == 'pull' && args == '10')) {
    if (cooldowns[msg.author.id].pulling) {
      await msg.reply('You are already pulling smh, wait a bit <:harold:980419145508204574>');
      return;
    }
    if (rpsGamers.includes(msg.author.id)) {
      await msg.reply('no gambling while playing rock papper scissors >:(');
      return;
    }
    cooldowns[msg.author.id].pulling = true;
    let orundum = await getOrundum(msg.author.id, db);
    if (orundum < 6000) {
      msg.reply(`You don't have enough <:orundum:1256240415275749416>, you need **__6000__** <:orundum:1256240415275749416> but only have **__${orundum}__** <:orundum:1256240415275749416>. Consider working a bit smh <:pozy_uhhh:1169454588886253689>`);
      cooldowns[msg.author.id].pulling = false;
      return
    }
    await db.run('UPDATE users SET orundum = orundum - 6000 WHERE id = ?', [msg.author.id]);
    let pity = (await db.get('SELECT pity FROM users WHERE id = ?', [msg.author.id])).pity;
    let reply = await msg.reply('Pulling 10 times...');
    let ops = '';
    let refund = 0;
    let highestRarity = 0;
    let lastSixStar = null;
    for (let i = 0; i < 10; i++) {
      let rarity = Math.random() * 100;
      let rateUp = Math.random() <= 0.5;
      let pulledRarity = 3;
      pity += 1;
      if (pity > 40) {
        rarity = Math.max(rarity - 5, 0);
      }
      if (rarity <= 2) {
        pulledRarity = 6;
      } else if (rarity <= 10) {
        pulledRarity = 5;
      } else if (rarity <= 60) {
        pulledRarity = 4;
      }
      if (pity == 50) {
        pulledRarity = 6;
      }
      if (pulledRarity == 6) {
        pity = 0;
      }
      let operatorId: string;
      let operator: { name: string, rarity: number };
      if (pulledRarity < 5 || !rateUp) {
        let keys = Object.keys(charsByRarity[pulledRarity]);
        operatorId = keys[keys.length * Math.random() << 0];
        operator = chars[operatorId];
      } else {
        operatorId = rateUps[6 - pulledRarity][rateUps[6 - pulledRarity].length * Math.random() << 0];
        operator = chars[operatorId];
      }
      if (pulledRarity > highestRarity) {
        highestRarity = pulledRarity;
      }
      if (pulledRarity == 6) {
        lastSixStar = operatorId;
      }
      let newOp = await addOperator(msg.author.id, operatorId, db);
      if (!newOp) {
        refund += [0, 100, 1200, 3000][pulledRarity - 3];
      }
      ops += `${':star:'.repeat(pulledRarity)} ${operator.name} ${newOp ? '**NEW**' : ''}\n`;
    }
    await db.run('UPDATE users SET orundum = orundum + ? WHERE id = ?', [refund, msg.author.id]);
    await db.run('UPDATE users SET pity = ? WHERE id = ?', [pity, msg.author.id]);
    await reply.edit({
      content: refund > 0 ? `Duplicate operators refunded **__${refund}__** <:orundum:1256240415275749416>` : '',
      embeds: [
        {
          title: `10 Pull`,
          description: ops,
          color: [0x00b2f6, 0xdbb1db, 0xffae00, 0xff6600][highestRarity - 3],
          image: lastSixStar ? {
            url:
              `https://raw.githubusercontent.com/yuanyan3060/ArknightsGameResource/main/portrait/${lastSixStar}_1.png`
          } : undefined,
          author: { icon_url: msg.author.avatarURL(), name: msg.author.displayName },
          footer: { text: `You are at ${pity} pity` },
        }
      ]
    });
    cooldowns[msg.author.id].pulling = false;
  } else if (command == 'pull') {
    if (cooldowns[msg.author.id].pulling) {
      await msg.reply('You are a already pulling smh, wait a bit <:harold:980419145508204574>');
      return;
    }
    if (rpsGamers.includes(msg.author.id)) {
      await msg.reply('no gambling while playing rock papper scissors >:(');
      return;
    }
    cooldowns[msg.author.id].pulling = true;
    let orundum = await getOrundum(msg.author.id, db);
    if (orundum < 600) {
      msg.reply(`You don't have enough <:orundum:1256240415275749416>, you need **__600__** <:orundum:1256240415275749416> but only have **__${orundum}__** <:orundum:1256240415275749416>. Consider working a bit smh <:pozy_uhhh:1169454588886253689>`);
      cooldowns[msg.author.id].pulling = false;
      return
    }
    await db.run('UPDATE users SET orundum = orundum - 600 WHERE id = ?', [msg.author.id]);
    let pity = (await db.get('SELECT pity FROM users WHERE id = ?', [msg.author.id])).pity;
    let rarity = Math.random() * 100;
    let rateUp = Math.random() <= 0.5;
    let pulledRarity = 3;
    pity += 1;
    if (pity > 40) {
      rarity = Math.max(rarity - 5, 0);
    }
    if (rarity <= 2) {
      pulledRarity = 6;
    } else if (rarity <= 10) {
      pulledRarity = 5;
    } else if (rarity <= 60) {
      pulledRarity = 4;
    }
    if (pity == 50) {
      pulledRarity = 6;
    }
    if (pulledRarity == 6) {
      pity = 0;
    }
    let operatorId: string;
    let operator: { name: string, rarity: number };
    if (pulledRarity < 5 || !rateUp) {
      let keys = Object.keys(charsByRarity[pulledRarity]);
      operatorId = keys[keys.length * Math.random() << 0];
      operator = chars[operatorId];
    } else {
      operatorId = rateUps[6 - pulledRarity][rateUps[6 - pulledRarity].length * Math.random() << 0];
      operator = chars[operatorId];
    }
    let newOp = await addOperator(msg.author.id, operatorId, db);
    let refund = 0;
    if (!newOp) {
      refund = [0, 100, 1200, 3000][pulledRarity - 3];
      await db.run('UPDATE users SET orundum = orundum + ? WHERE id = ?', [refund, msg.author.id]);
    }
    await db.run('UPDATE users SET pity = ? WHERE id = ?', [pity, msg.author.id]);
    await msg.reply({
      content: refund ? `Duplicate operator, **__+${refund}__** <:orundum:1256240415275749416>` : '',
      embeds: [
        {
          title: `You got ${':star:'.repeat(pulledRarity)} ${operator.name}`,
          image: { url: `https://raw.githubusercontent.com/yuanyan3060/ArknightsGameResource/main/portrait/${operatorId}_1.png` },
          color: [0x00b2f6, 0xdbb1db, 0xffae00, 0xff6600][pulledRarity - 3],
          author: { icon_url: msg.author.avatarURL(), name: msg.author.displayName },
          footer: { text: `You are at ${pity} pity` },
        }
      ]
    });
    cooldowns[msg.author.id].pulling = false;
  } else if (command == 'shaine') {
    let thing = Math.ceil(Math.random() * 3);
    if (thing == 1) {
      let keys = Object.keys(chars);
      let operatorId = keys[keys.length * Math.random() << 0];
      let operator = chars[operatorId];
      await msg.reply(`I manifest ${operator.name} ${Math.ceil(Math.log2(Math.ceil(Math.random() * 64)))}* alter`);
    } else if (thing == 2) {
      let keys = Object.keys(chars);
      let operatorId = keys[keys.length * Math.random() << 0];
      let operator = chars[operatorId];

      let skinKeys = Object.keys(skinLines);
      let skinLine = skinKeys[skinKeys.length * Math.random() << 0];

      await msg.reply(`I manifest ${operator.name} ${skinLines[skinLine]} skin`);
    } else if (thing == 3) {
      let nationKeys = Object.keys(nations);
      let nation = nationKeys[nationKeys.length * Math.random() << 0];
      await msg.reply(`I manifest ${nations[nation]} event`);
    }
  }


  return true;
}
