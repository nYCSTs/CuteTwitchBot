const tmi = require('tmi.js');
require('dotenv').config();

let timer; // +ed timer
let startTime; // start operation time
const blankText = ' 󠀀󠀀󠀀󠀀󠀀󠀀'; // appended text when the previous message is the same
const latestBans = {}; // bans list
let lastSentMessage = '' // the last sent message by the bot
let timeSinceLastMessage;

const channels = [
  'ablacs',
  // 'forsen'
]

channels.map((ch) => latestBans[ch] = []);

const client = new tmi.Client({
  identity: {
    username: process.env.USERNAME,
    password: process.env.PASSWORD
  },
  channels
});

client.on('message', onMessageHandler);
client.on('connected', onConnectedHandler);
client.on('ban', onBanUserHandler);

client.connect();

function msToTime(duration) {
  let strTime = '';
  const seconds = Math.floor((duration / 1000) % 60);
  const minutes = Math.floor((duration / (1000 * 60)) % 60);
  const hours = Math.floor((duration / (1000 * 60 * 60)) % 24);

  if (hours === 0 && minutes === 0) {
    return `${seconds}s`;
  } else {
    if (hours !== 0) {
      strTime += `${hours}h`;
    }
    if (minutes !== 0) {
      strTime += `${minutes}m`;
    }
    return strTime;
  };
};

function startEDTimer(channel) {
  return setInterval(() => {
    client.say(channel, '+ed');
  }, [3600500]);
};

function onMessageHandler(channel, context, msg, self) {
  if (self || context['username'] === 'Supibot') { return; }

  let message;
  const userMessage = msg.replace('󠀀', '').trim().split(' ').filter((x) => x !== '');

  switch (userMessage.length) {
    case 1:
      // Ping
      if (userMessage[0] === '**ping') {
        message = `@${context['display-name']} Karen Kujou on duty AYAYA. (${msToTime(new Date() - startTime)}).`;
      }
      // Check current Channel
      else if (userMessage[0] === '**latest') {
        // Check if bans were registered
        if (latestBans[channel.slice(1).toLowerCase()].length) {
          message = `@${context['display-name']} the last banned users were: ${latestBans[channel.slice(1)].map((user) => `${user.username} (${msToTime(new Date() - user.time)} ago) `)}`
        } 
        message = `@${context['display-name']} No bans were registered.`
      }
      // AYAYA
      else if (userMessage[0] === 'AYAYA') {
        message = `@${context['display-name']} AYAYA`;
      }
      // nyanPls
      else if (userMessage[0] === 'nyanPls') {
        message = '✨ nyanPls 🌸  ';
      }
      // cute chat
      else if (userMessage[0] === '**cute') {
        message = '🌸 ✌ ️ AYAYA ✨ ⣰⠟⢷⡀⣿⠄⣿⠘⢻⡟⠃⣿⠛⠛⠄⠄⣰⠟⢷⡀⣿⠄⣿⠄⢠⣿⠄⠛⣿⠛ ⣿⠄⠄⠄⣿⠄⣿⠄⢸⡇⠄⣿⠶⠶⠄⠄⣿⠄⠄⠄⣿⠶⣿⠄⣼⣈⡇⠄⣿⠄ ⠹⣦⡾⠁⠻⣤⠟⠄⢸⡇⠄⣿⣤⣤⠄⠄⠹⣦⡾⠁⣿⠄⣿⢠⡏⠉⢻⠄⣿⠄'
      }
      // join raid
      else if (userMessage[0] === '**join') {
        message = '+join';
      }
      // force ed
      else if (userMessage[0] === '**fed' && context['display-name'] === process.env.BOTRUNNER) {
        client.say(channel, '+ed');
        if (timer) {
          clearInterval(timer);
        }
        timer = startEDTimer(channel);
        return;
      }
      break;
    case 2:
      // Registered bans on <CHANNEL>
      if (userMessage[0] === '**latest') {
        if (Object.keys(latestBans).indexOf(userMessage[1]) !== -1) {
          if (latestBans[userMessage[1]].length) {
            message = `@${context['display-name']} the last banned users in ${userMessage[1]} were: ${latestBans[userMessage[1]].map((user) => `${user.username} (${msToTime(new Date() - user.time)} ago)`)}`
            client.say(channel, `${blank ? message : message.concat(blankText)}`);
          } else {
            message = `@${context['display-name']} No bans registered in ${userMessage[1]} channel.`;
          }
        } else {
          message = `@${context['display-name']} This channel is not being monitored.`;
        }
      }
      break;
  };
  if (message) {
    // general spam protection
    if (!timeSinceLastMessage || (new Date() - timeSinceLastMessage) >= 2500) {
      timeSinceLastMessage = new Date();
      client.say(channel, `${lastSentMessage === message ? message += blankText : message}`);
      lastSentMessage = message;
      return;
    }
  }
}

function onBanUserHandler(channel, username, reason, userstate) {
  if (latestBans[channel.slice(1)].length === 5) {
    latestBans[channel.slice(1)][0] = {
      username,
      time: new Date(),
    };
    return;
  }
  latestBans[channel.slice(1)].push({
    username,
    time: new Date(),
  });
}

function onConnectedHandler(addr, port) {
  console.log(`* Connected to ${addr}:${port}`);
  startTime = new Date();
}

