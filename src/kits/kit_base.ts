import { ActionRow, ActionRowBuilder, ButtonBuilder, ButtonComponent, ButtonInteraction, Message } from "discord.js";

export class Kit {
  default_hp: number;
  default_def: number;
  default_attack: number;
  res: number;
  speed: number;
  playable = false;

  async act(fight: Fight, team: Team) {
  }

  async handleEvent(eventType: string, eventData: Object, fight: Fight, team: Team) {
  }

  getCurrentInfo(fight: Fight, team: Team) {
  }
}

export class OperatorKit extends Kit {
  playable = true;

  createActionRows(): ActionRowBuilder<ButtonBuilder>[] {
    return [];
  };

  async handleAction(inter: ButtonInteraction) {
  }
};

export class Team {
  fieldUnit: Entity;
  support1: Entity;
  support2: Entity;
  support3: Entity;
}

export class Fight {
  message: Message;
  team1: Team;
  team2: Team;
  log = '';

  constructor(message: Message, team1: Team, team2: Team) {
    this.message = message;
    this.team1 = team1;
    this.team2 = team2;
  }

  async updateMessage(buttons: ActionRowBuilder<ButtonBuilder>[]) {
  }
}

export class Entity {
  kit: Kit;
  level: number;
  hp: number;
  def: number;
  attack: number;
  res: number;
  speed: number;
  playable: boolean;
  av = 0;
  team: Team;

  constructor(kit: Kit, level: number) {
    this.kit = kit;
    this.level = level;
    this.hp = Math.ceil(kit.default_hp * (level / 20));
    this.def = Math.ceil(kit.default_def * (level / 20));
    this.attack = Math.ceil(kit.default_attack * (level / 20));
    this.res = kit.res;
    this.speed = kit.speed;
    this.playable = kit.playable;
  }

  async act(fight: Fight, team: Team) {
    if (this.playable) {
      await fight.updateMessage((this.kit as OperatorKit).createActionRows());
    } else {
      await this.act(fight, team);
    }
  }
}
