import { ActionRow, ActionRowBuilder, ButtonBuilder, ButtonComponent, ButtonStyle } from "discord.js";
import { OperatorKit } from "./kit_base";

export default {
  info: {
    embeds: [
      {
        title: 'Executor the Ex Foedere',
        description: `## Attack :dagger:

If unit has **Judgement Time**, use Damnatus Ex Foedere instead.

Deals damage equal to **100%** of attack.

Restore 20 SP.
## Damnatus Ex Foedere :crossed_swords:

Increases defence ignore by passive 2 to 3x.

Gains one stack of **Condemnation**.

Deals damage equal to 200% of attack.

If at 4 stacks of **Condemnation**, deal damage equal to 400% of attack then set **Condemnation** stacks to 0 and remove **Judgement Time** from self.

**[Condemnation]**: Increases passive 2 activation chance by 20% and increases attack by 20%.

## Exact Testament :comet:
Costs 100 SP to use.

Inflicts **Judgement Time** on self and immediately act again.

**[Judgement Time]**: Reduces this unit's speed by 20%, this unit can't gain SP with this status active.
## Guard :shield:
Costs 20 SP to use.

Reduces damage taken this turn by 40%.
`,
        image: { url: 'https://raw.githubusercontent.com/yuanyan3060/ArknightsGameResource/main/skin/char_1032_excu2_2b.png' },
        fields: [
          { name: 'Reverend Executor', value: 'Can\'t be healed by allies.', inline: true },
          { name: 'The Chosen One (E1)', value: 'Attacks have a 20% chance to deal damage a second time, ignoring 10% of the target\'s defence.', inline: true },
          { name: 'Empathy By Shotgun (E2)', value: 'Restores 10 SP when receiving healing from any source.', inline: true },
          { name: '(Support Active) Execution Requested', value: 'Costs 100 SP, gains 10 SP every time the on-field unit hits an enemy.\nCauses next hit to ignore 10% of the enemy\'s defence and follows up by dealing damage equal to 300% of personal attack', inline: true },
          { name: '(Support Passive) Evildoer Prosecution (E2)', value: 'Grants the on-field unit a 5% chance to ignore 10% of the enemy\'s defence.\nRestores 5 SP to them every time they receive healing (up to 4 times / turn).', inline: true },
        ],
        thumbnail: { url: 'https://raw.githubusercontent.com/yuanyan3060/ArknightsGameResource/main/avatar/char_1032_excu2_2.png' },
      },
    ]
  },
  kit: class Executor2Kit extends OperatorKit {
    default_hp = 700;
    default_def = 100;
    default_attack = 200;
    res = 0;
    speed = 70;

    createActionRows(): ActionRowBuilder<ButtonBuilder>[] {
      let attack = new ButtonBuilder()
        .setCustomId('fight:0:attack')
        .setLabel('Attack')
        .setEmoji('🗡️')
        .setStyle(ButtonStyle.Primary);
      let skill = new ButtonBuilder()
        .setCustomId('fight:0:skill')
        .setLabel('Damnatus Ex Foedere (0/100SP)')
        .setEmoji('⚔️')
        .setStyle(ButtonStyle.Danger)
        .setDisabled(true);
      let guard = new ButtonBuilder()
        .setCustomId('fight:0:guard')
        .setLabel('Guard (0/20SP)')
        .setEmoji('🛡️')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true);
      let row = new ActionRowBuilder<ButtonBuilder>().addComponents(attack, skill, guard);
      return [row];
    };
  }
};
