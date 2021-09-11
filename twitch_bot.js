const tmi = require('tmi.js');
require('dotenv').config();

let startTime;
let blank = false;
const latestBans = {};
const blankText = ' 󠀀󠀀󠀀󠀀󠀀󠀀';
const channels = []

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
  }, [3600100]);
};

function onMessageHandler(channel, context, msg, self) {
  if (self || context['username'] === 'Supibot') { return; }

  const userMessage = msg.replace('󠀀', '').trim().split(' ').filter((x) => x !== '');

  setTimeout(() => {
    switch (userMessage.length) {
      case 1:
        // Ping
        if (userMessage[0] === '*ping') {
          const message = `@${context['display-name']} running for ${msToTime(new Date() - startTime)}.`;
          client.say(channel, `${blank ? message : message.concat(blankText)}`);
          blank = !blank;
          return;
        }
        // Check current Channel
        if (userMessage[0] === '*latest') {
          // Check if bans were registered
          if (latestBans[channel.slice(1).toLowerCase()].length) {
            client.say(
              channel,
              `@${context['display-name']} the last banned users were: ${latestBans[channel.slice(1)].map((user) => `${user.username} (${msToTime(new Date() - user.time)} ago) `)}`
            );
            return;
          }
          client.say(channel, `@${context['display-name']} No bans were registered.`);
          return;
        }
        // AYAYA
        if (userMessage[0] === 'AYAYA') {
          const message = 'AYAYA';
          client.say(channel, `@${context['display-name']} ${blank ? message : message.concat(blankText)}`);
          blank = !blank;
          return;
        }
        // nyanPls
        if (userMessage[0] === 'nyanPls') {
          const message = '✨ nyanPls 🌸  ';
          client.say(channel, `${blank ? message : message.concat(blankText)}`);
          blank = !blank;
          return;
        }
        // cute chat
        if (userMessage[0] === '*cute') {
          const message = '🌸 ✌ ️ AYAYA ✨ ⣰⠟⢷⡀⣿⠄⣿⠘⢻⡟⠃⣿⠛⠛⠄⠄⣰⠟⢷⡀⣿⠄⣿⠄⢠⣿⠄⠛⣿⠛ ⣿⠄⠄⠄⣿⠄⣿⠄⢸⡇⠄⣿⠶⠶⠄⠄⣿⠄⠄⠄⣿⠶⣿⠄⣼⣈⡇⠄⣿⠄ ⠹⣦⡾⠁⠻⣤⠟⠄⢸⡇⠄⣿⣤⣤⠄⠄⠹⣦⡾⠁⣿⠄⣿⢠⡏⠉⢻⠄⣿⠄'
          client.say(channel, `${blank ? message : message.concat(blankText)}`);
          blank = !blank;
          return;
        }
        // paag
        if (userMessage[0] === '*pag') {
          const message = 'PagMan 🤘 ⣿⣯⣷⢈⣹⣿⠿⡟⢛⡛⢿⡟⠛⣿⣿⡟⠛⣿⣿⠟⠻⣿⡟⢛⡛⢿⡿⢛⡛⢿ ⣉⣛⠛⠉⠁⠄⠄⡇⢈⣁⣼⠁⠇⠸⡿⠠⠇⢹⡟⠰⠆⢻⠄⢿⡉⢹⡀⢾⡉⢹ ⡿⠌⠛⠢⣄⣀⣠⣧⣼⣿⣧⣼⣿⣤⣧⣼⣿⣤⣥⣾⣧⣬⣷⣬⣥⣼⣷⣤⣤⣼ '
          client.say(channel, `${blank ? message : message.concat(blankText)}`);
          blank = !blank;
          return;
        }
        // join raid
        if (userMessage[0] === '*join') {
          console.log(channel);
          client.say(channel, '+join');
          return;
        }
        // force ed
        if (userMessage[0] === '*fed' && context['display-name'] === process.env.USER) {
          let timer;
          clearInterval(timer);
          client.say(channel, '+ed');
          timer = startEDTimer(channel);
        }
        break;
      case 2:
        // Registered bans on <CHANNEL>
        if (userMessage[0] === '*latest') {
          if (Object.keys(latestBans).indexOf(userMessage[1]) !== -1) {
            if (latestBans[userMessage[1]].length) {
              const message = `@${context['display-name']} the last banned users in ${userMessage[1]} were: ${latestBans[userMessage[1]].map((user) => `${user.username} (${msToTime(new Date() - user.time)} ago)`)}`
              client.say(channel, `${blank ? message : message.concat(blankText)}`);
              blank = !blank;
              return;
            }
            client.say(channel, `@${context['display-name']} No bans registered in ${userMessage[1]} channel.`);
            return;
          }
          client.say(channel, `@${context['display-name']} This channel is not being monitored.`);
          break;
        }
        break;
    }
  }, 1000);
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
