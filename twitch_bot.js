const tmi = require('tmi.js');
const axios = require('axios');
require('dotenv').config();

let timer; // +ed timer
let startTime; // start operation time
const blankText = ' 󠀀󠀀󠀀󠀀󠀀󠀀'; // appended text when the previous message is the same
const latestBans = {}; // bans list
let lastSentMessage = '' // the last sent message by the bot
let timeSinceLastMessage;
let timeSinceWeebCheck;
let channelsList;

const channels = [
  'ablacs',
  'forsen'
]

channels.map((ch) => latestBans[ch] = []);

axios.default.get('https://logs.ivr.fi/channels')
  .then((r) => {
    channelsList = r.data;
  });

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
  const days = Math.floor((duration / (1000 * 60 * 60 * 24)));
  const years = Math.floor(days / 365);

  if (hours === 0 && minutes === 0) {
    return `${seconds}s`;
  } else if (years === 0) {
    if (days !== 0) {
      strTime += `${days}d`
    }
    if (hours !== 0) {
      strTime += `${hours}h`;
    }
    if (minutes !== 0) {
      strTime += `${minutes}m`;
    }
  } else {
    if (years !== 0) {
      strTime += `${years}y`
    }
    if (days !== 0) {
      strTime += `${days}d `
    }
  }
  return strTime;
};

function startEDTimer(channel) {
  return setInterval(() => {
    client.say(channel, '+ed');
  }, [3600500]);
};

function spamProtection(channel, message, time = 2500) {
  if (!timeSinceLastMessage || (new Date() - timeSinceLastMessage) >= time) {
    timeSinceLastMessage = new Date();
    client.say(channel, `${lastSentMessage === message ? message += blankText : message}`);
    lastSentMessage = message;
    return;
  }
};

function filterWeebMessages(messages, username) {
  return messages.filter((msg) => {
    msg = msg.substring(msg.indexOf(`${username}: `) + username.length + 2, msg.length);
    return (
      msg.includes('AYAYA')
      || msg.includes('nyanPls')
      || msg.includes('forsenPuke')
    );
  });
};

async function getUserMessages(channel, username) {
  channel = 'forsen';
  return await axios.default.get(`https://logs.ivr.fi/channel/${channel}/user/${username}`);
};

async function getAnimeInfo(title) {
  const query = `
    query ($id: Int, $search: String) {
      Media (id: $id, type: ANIME, search: $search) {
        id
        episodes
        description
        title {
          romaji
        }
      }
    }
  `
  const variables = {
    "search": title
  }

  return await axios.default.post('https://graphql.anilist.co/', {
    query: query,
    variables
  }).then((r) => r.data);
}

function onMessageHandler(channel, context, msg, self) {
  if (self || context['username'] === 'Supibot') { return; }

  let message;
  const userMessage = msg.replace('󠀀', '').trim().split(' ').filter((x) => x !== '');

  switch (userMessage.length) {
    case 1:
      // Ping
      if (userMessage[0] === '**ping') {
        message = `@${context['display-name']} Karen Kujou on duty AYAYA (${msToTime(new Date() - startTime)}).`;
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
        message = `${lastSentMessage === '+ed' ? '+ed'.concat(blankText) : '+ed'}`;
        client.say(channel, message);
        lastSentMessage = message;
        if (timer) {
          clearInterval(timer);
        }
        timer = startEDTimer(channel);
        return;
        // random weeb message
      } else if (userMessage[0] === '**rwm') {
        if (channel === '#ablacs' || channelsList.channels.some((ch) => ch.name === channel.slice(1))) {
          getUserMessages(channel.slice(1), context['display-name'])
            .then((r) => {
              const weebMessages = filterWeebMessages(r.data.split('\n'), context['display-name']);
              if (!weebMessages.length) {
                spamProtection(channel, `${context['display-name']} I couldn't find weeb emotes on your logs.`);
                return;
              }
              const rMessage = weebMessages[Math.floor(Math.random() * weebMessages.length)];
              spamProtection(channel, `(${msToTime(new Date() - new Date(rMessage.substring(1, rMessage.indexOf(' '))))} ago) ${rMessage.substring(rMessage.indexOf(context['display-name'].toLowerCase()))}`);
            });
        }
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
      // Check if user is a weeb
      else if (userMessage[0] === '**weeb' && (!timeSinceWeebCheck || (new Date() - timeSinceWeebCheck) >= 10000)) {
        getUserMessages(channel.slice(1), userMessage[1])
          .then((r) => {
            const weebMessages = filterWeebMessages(r.data.split('\n'), userMessage[1]);
            if (weebMessages.length) {
              message = `@${context['display-name']} I found ${weebMessages.length} messages with weeb emotes on ${userMessage[1]} logs. AYAYA`;
            } else {
              message = `@${context['display-name']} I didn't find weeb emotes on ${userMessage[1]} logs. 😢 `;
            }
            spamProtection(channel, message, 0);
          });
      }
      // Anime description
      else if (userMessage[0] === '**anime') {
        getAnimeInfo(userMessage[1])
          .then((r) => {
            const animeDescription = r.data.Media.description
              .slice(0, r.data.Media.description.indexOf('<br>'))
              .replace(/<[^>]*>?/gm, '')
              .replace('\n', '')
              .trim();
            message = `[${r.data.Media.episodes} EP] ${animeDescription.length > 180 ? animeDescription.slice(0, 180).concat('...') : animeDescription}`;
            spamProtection(channel, message);
          });
      }
      break;
  };
  if (message) {
    console.log(`${context['display-name']} [username]: ${userMessage} [usermessage] ${message} [output]`);
    spamProtection(channel, message);
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