import type { Client } from '../index.js';
import { Message, TextChannel } from "discord.js";
import { LoadType, Track } from 'shoukaku';

const queues: Map<string, { songs: { track: Track, msg: Message }[], timeout: NodeJS.Timeout | undefined, channel: string }> = new Map();

export default async (client: Client, msg: Message, command: string, args: string | undefined) => {
  try {
    if (command == 'play' && args) {
      if (!msg.member.voice.channelId) {
        await msg.reply('You must be in a voice channel');
        return;
      }
      let queue = queues.get(msg.guildId);
      if (queue && queue.channel != msg.member.voice.channelId) {
        await msg.reply('I am already in a voice channel smh <:charged_punch:1164892088547147877>');
        return;
      }
      let player = client.shoukaku.players.get(msg.guildId);
      if (!player) {
        player = await client.shoukaku.joinVoiceChannel({
          guildId: msg.guildId,
          channelId: msg.member.voice.channelId,
          shardId: 0,
          deaf: true,
        });
        queue = { songs: [], timeout: undefined, channel: msg.member.voice.channelId }
        queues.set(msg.guildId, queue);
        player.on('closed', async () => {
          await client.shoukaku.leaveVoiceChannel(msg.guildId);
        });
        player.on('end', async () => {
          const queue = queues.get(msg.guildId);
          queue.songs.shift();
          if (queue.songs.length) {
            let song = queue.songs[0];
            await player.playTrack({ track: song.track.encoded });
            const length = song.track.info.length / 1000 / 60;
            await song.msg.channel.send({
              embeds: [{
                author: {
                  icon_url: song.msg.member.displayAvatarURL(),
                  url: song.track.info.uri,
                  name: 'YouTube URL',
                },
                thumbnail: {
                  url: song.msg.guild.iconURL(),
                },
                title: `Playing ${song.track.info.title}`,
                image: { url: song.track.info.artworkUrl },
                description: `By ${song.track.info.author} - ${Math.floor(length)}:${String(Math.floor((length % 1) * 60 - 1)).padStart(2, '0')}`,
                color: 0x202A44,
              }]
            });
          } else {
            await msg.channel.send('No more songs to play :/');
            queue.timeout = setTimeout(() => {
              client.shoukaku.leaveVoiceChannel(msg.guildId);
            }, 600000);
          }
        });
      }
      const videoId = Array.from(args.matchAll(/https:\/\/youtu\.be\/([a-zA-Z0-9_-]+)|https:\/\/www\.youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)/g)).map((s => s[2]))[0];
      const result = await player.node.rest.resolve(videoId || `ytsearch:${args}`);
      let track: Track;
      if (result.loadType == LoadType.EMPTY) {
        await msg.reply(`Couldn't find a video using ${args} D:`);
        return;
      } else if (result.loadType == LoadType.TRACK) {
        track = result.data;
      } else if (result.loadType == LoadType.SEARCH) {
        track = result.data[0];
      } else {
        await msg.reply(`Uhhhhhh hhhhhhhhhhhhh uhhhhhhhhhhhhh uhhhhhhhh oops no workie xd`);
        return;
      }
      queue.songs.push({ track, msg });
      const length = track.info.length / 1000 / 60;
      if (queue.songs.length == 1) {
        clearTimeout(queue.timeout);
        await player.playTrack({ track: track.encoded });
        await msg.reply({
          embeds: [{
            author: {
              icon_url: msg.member.displayAvatarURL(),
              url: track.info.uri,
              name: 'YouTube URL',
            },
            thumbnail: {
              url: msg.guild.iconURL(),
            },
            title: `Playing ${track.info.title}`,
            image: { url: track.info.artworkUrl },
            description: `By ${track.info.author} - ${Math.floor(length)}:${String(Math.floor((length % 1) * 60 - 1)).padStart(2, '0')}`,
            color: 0x202A44,
          }]
        });
      } else {
        await msg.reply({
          embeds: [{
            author: {
              icon_url: msg.member.displayAvatarURL(),
              url: track.info.uri,
              name: 'YouTube URL',
            },
            thumbnail: {
              url: msg.guild.iconURL(),
            },
            title: `Added ${track.info.title} to queue`,
            image: { url: track.info.artworkUrl },
            description: `By ${track.info.author} - ${Math.floor(length)}:${String(Math.floor((length % 1) * 60 - 1)).padStart(2, '0')}`,
            color: 0x202A44,
          }]
        });
      }
    } else if (command == 'skip') {
      if (!msg.member.voice.channelId) {
        await msg.reply('You must be in a voice channel');
        return;
      }
      const queue = queues.get(msg.guildId);
      if (!queue.songs.length) {
        await msg.reply('Nothing is currently playing <:skadi_wut:1165320621278896178>');
        return;
      }
      let player = client.shoukaku.players.get(msg.guildId);
      player?.stopTrack();
    } else if (command == 'queue') {
      const queue = queues.get(msg.guildId);
      if (!queue || !queue.songs.length) {
        await msg.reply('I cannot find a queue here :/');
        return;
      }
      let songList = queue.songs.map((s, i) => `${i + 1}. **${s.track.info.title}** - ${s.msg.author} ${i == 0 ? '(Current)' : ''}`).join('\n');
      await msg.reply({
        content: '# Queue\n' + songList,
        allowedMentions: { parse: [] },
      })
    } else if (command == 'leave') {
      if (!msg.member.voice.channelId) {
        await msg.reply('You must be in a voice channel');
        return;
      }
      await client.shoukaku.leaveVoiceChannel(msg.guildId);
      queues.delete(msg.guildId);
      await msg.reply("*poof*");
    }
  } catch (err) {
    await msg.reply('It seems that something went wrong <:pozy_uhhh:1169454588886253689>');
    console.log(err);
  }
}
