require('dotenv').config();

// APIs
const Discord = require('discord.js');

// project imports
const Utils = require('./Utils');
const Music = require('./Music');

console.log('beep beep! ');

module.exports = class DiscordBot {
    constructor() {
        this.client = new Discord.Client();
        this.music = new Music.Music(this.client);
        this.prefix = '!bot';

        this.client.login(process.env.TOKEN);
        this.client.on('ready', this.readyDiscord.bind(this));
        this.client.on('message', this.gotMessage.bind(this));
        this.client.on('voiceStateUpdate', (oldMember, newMember) => this.voiceStateUpdate(oldMember, newMember));
    }

    readyDiscord() {
        console.log('its ready already!');
        this.client.user.setActivity('!bot help', {
            type: 'PLAYING'
        });
        this.music.setupSpotify();
    }

    async voiceStateUpdate(oldMember, newMember) {
        const oldVoice = oldMember.channelID;
        const newVoice = newMember.channelID;

        if (oldVoice !== newVoice && oldVoice === null && newMember.id === this.client.user.id) {
            console.log("Music bot joined!");
            const serverQueue = this.music.queue.get(newMember.guild.id);
            if (serverQueue && serverQueue.songs !== [] && serverQueue.connection !== null) {
                this.music.connectBot(newMember.guild.id, newMember.channel, serverQueue).then(conn => {
                    if (conn)
                        this.play(newMember.guild, serverQueue.songs[0]);
                });
            }
        }
    }

    async gotMessage(message) {
        console.log(message.content);
        const serverQueue = this.music.queue.get(message.guild.id);
        

        const messageSplit = message.content.split(' ');
        if (messageSplit[0] === this.prefix) {
            const messageNoPrefix = message.content.split(this.prefix + ' ').join('');

            if (messageSplit.length <= 1) {
                this.commandList(message);
            } else {
                switch (messageSplit[1]) {
                    case `play`:
                        this.music.playCommand(message, messageSplit, messageNoPrefix, serverQueue);
                        break;
                    case `playlist`:
                        if (messageSplit.length === 3 && messageSplit[2].startsWith('https://www.youtube.com/'))
                            this.music.youtubePlaylist(message, messageSplit[2]);
                        else if (messageSplit.length === 3 && messageSplit[2].startsWith('https://open.spotify.com/playlist/'))
                            this.music.spotifyPlayList(message, messageSplit[2]);
                        break;
                    case `skip`:
                        this.music.skipCommand(message, serverQueue);
                        break;
                    case `skipto`:
                        this.music.skipToCommand(message, messageSplit, serverQueue);
                        break;
                    case 'pause':
                        this.music.pause(message, serverQueue);
                        break;
                    case 'resume':
                        this.music.resume(message, serverQueue);
                        break;
                    case `clear`:
                        this.music.clearQueueCommand(message, serverQueue);
                        break;
                    case `queue`:
                        this.music.showQueueCommand(message, serverQueue);
                        break;
                    case 'delete':
                        this.music.deleteSongCommand(messageSplit, serverQueue);
                        break;
                    case 'loop':
                        serverQueue.loopState = Music.LoopState.LoopAll;
                        Utils.shortEmbedReply(message, 'We are looping now!');
                        break;
                    case 'loopone':
                        serverQueue.loopState = Music.LoopState.LoopOne;
                        Utils.shortEmbedReply(message, 'We are looping current song!');
                        break;
                    case 'loopnone':
                        serverQueue.loopState = Music.LoopState.LoopNone;
                        Utils.shortEmbedReply(message, 'We are not looping anymore.');
                        break;
                    case `help`:
                        this.commandList(message);
                        break;
                    case 'join':
                        message.member.voice.channel.join();
                        this.music.createQueue(message, message.member.voice.channel, null);
                        break;
                    case 'spotify':
                        this.music.spotifyPlayList(message);
                        break;
                    case 'lyrics':
                        this.music.findLyrics(message, serverQueue);
                        break;
                    default:
                        this.commandList(message);
                }
            }
        }
    }

    async commandList(message) {
        const reply = new Discord.MessageEmbed()
            .setAuthor('Available commands.. \n', this.client.user.avatarURL())
            .addField('Music 🎵', '!bot play [title or url] \n  !bot play [@nickname] [title or url] \n !bot playlist [url] \n !bot skip  \n !bot skipto [index] \n !bot pause \n !bot resume  \n !bot clear  \n !bot queue  \n !bot delete [index] \n !bot lyrics \n !bot loop \n !bot loopone \n !bot loopnone')
            .setColor(0xa62019)
            .addField('Others 🥓', ' !bot help \n');

        return message.channel.send(reply);
    }
};