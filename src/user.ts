import { Message } from "discord.js";

export default async (msg: Message, args: string) => {
  let searchLevel: undefined | number = undefined;
  args = args.replace(/(?:lv|lvl|level) ?(\d+)/i, (_, p1) => { searchLevel = Number.parseInt(p1); return ''; }).trim();
  await msg.react('<a:WDance:1132989381687382046>');
  const resp = await fetch(
    `https://arkprts.ashlen.gay/api/search?nickname=${encodeURIComponent(args)}&server=en`,
  );
  const users: any[] = await resp.json();
  let data: any;
  if (searchLevel) {
    data = users.find((u) => u.level == searchLevel);
  } else {
    data = users[0];
  }
  if (!data) {
    await msg.reply("I couldn't find a user like that (they don't exist)");
    return;
  }
  let fields = [];
  data.supports.forEach((s: any) => {
    const selectedSkillIndex = s.skills.selected;
    let value = '';
    if (selectedSkillIndex !== null) {
      let selectedSkill = s.skills.skills[selectedSkillIndex];
      let skillLevel = selectedSkill.mastery > 0 ? `M${selectedSkill.mastery}` : `L${selectedSkill.level}`;
      value += `S${selectedSkillIndex + 1}${skillLevel}`;
    }
    if (s.modules.selected) {
      let selectedModule = s.modules.modules[s.modules.selected];
      value += ` | ${selectedModule.type.name} Stage ${selectedModule.level}`;
    }
    fields.push({
      name: `${s.name} E${s.elite}L${s.level}` + (s.potential ? ` Pot${s.potential + 1}` : ''),
      value,
    });
  });
  await msg.reply({
    content: `[More info](<https://arkprts.ashlen.gay/search?nickname=${data.uid}&server=en>)`,
    embeds: [{
      title: `${data.nickname}#${data.nicknumber} LV${data.level}`,
      thumbnail: { url: data.avatar.asset || data.assistant.skin.asset },
      description: `*${data.bio}*\n\nPlaying since: ${new Date(data.registration).toDateString()}\nCurrent stage: ${data.progression.code || 'Completed'}\nCharacters: ${data.characters}`,
      color: 0x202A44,
      fields,
    }]
  });
}
