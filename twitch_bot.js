const tmi = require('tmi.js');
const axios = require('axios');
const cheerio = require('cheerio');
require('dotenv').config();

let timer;                    // +ED TIME
let startTime;                // BOT START TIME
const blankText = ' 󠀀󠀀󠀀󠀀󠀀󠀀';        // BLANK TEXT
const latestBans = {};        // BAN LIST
let lastSentMessage = ''      // LAST MESSAGE SENT
let timeSinceLastMessage;     // TIME SINCE LAST MESSAGE. SPAM CONTROL
const channelsList = [];      // CHANNELS THAT ARE MONITORED BY justlog
const helpURL = 'www (dot) pastebin (dot) com/NEfnPtbT'

const channels = [
  'ablacs',
  'forsen'
]

channels.map((ch) => latestBans[ch] = []);

axios.default.get('https://logs.ivr.fi/channels').then((r) => r.data.channels.map((ch) => channelsList.push(ch.name)));

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

  if (duration < 60000) {
    strTime = `${seconds}s`;
  } else if (hours === 0) {
    strTime += `${hours}m`;
    strTime += `${seconds}s`;
  } else if (days === 0) {
    strTime += `${hours}h`;
    strTime += `${minutes}m`;
  } else if (years == 0) {
    strTime += `${days}d`;
    strTime += `${hours}h`;
  } else {
    strTime += `${years}y`;
    strTime += `${days}d`;
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
  // while testing
  if (channel === 'ablacs') {
    channel = 'forsen';
  }
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

  try {
    const animeData = await axios.default.post('https://graphql.anilist.co/', {
      query: query,
      variables
    }).then((r) => r.data);
    return animeData;
  } catch (err) {
    return err.response;
  };
};

async function getRandomPasta() {
  let pasta;
  await axios.default.get('https://www.twitchquotes.com/random').then((r) => {
    const html = r.data;
    const $ = cheerio.load(html);
    $('div', '.custom-scroll').each((i, elm) => {
      pasta = $(elm).children().text();
    });
  });
  return pasta;
}

function onMessageHandler(channel, context, msg, self) {
  if (self || RUNNING_BOT == 'false' || (new Date().getHours() >= 14 && new Date().getHours() < 20) || context['display-name'] === 'Supibot') { return; }

  const userMessage = msg
    .replace('󠀀', '')
    .trim()
    .split(/ (.+)/)
    .filter((x) => x !== '');

  switch (userMessage.length) {
    case 1:
      if (userMessage[0] === 'AYAYA') {
        spamProtection(channel, `@${context['display-name']} AYAYA`);
        return;
      } else if (userMessage[0] === 'nyanPls') {
        spamProtection(channel, '✨ nyanPls 🌸  ');
        return;
      } else if (userMessage[0] === '**ping') {
        spamProtection(
          channel,
          `@${context['display-name']} Karen Kujou on duty AYAYA (${msToTime(new Date() - startTime)}).`
        );
        return;
      } else if (userMessage[0] === '**cute') {
        spamProtection(
          channel,
          '🌸 ✌ ️ AYAYA ✨ ⣰⠟⢷⡀⣿⠄⣿⠘⢻⡟⠃⣿⠛⠛⠄⠄⣰⠟⢷⡀⣿⠄⣿⠄⢠⣿⠄⠛⣿⠛ ⣿⠄⠄⠄⣿⠄⣿⠄⢸⡇⠄⣿⠶⠶⠄⠄⣿⠄⠄⠄⣿⠶⣿⠄⣼⣈⡇⠄⣿⠄ ⠹⣦⡾⠁⠻⣤⠟⠄⢸⡇⠄⣿⣤⣤⠄⠄⠹⣦⡾⠁⣿⠄⣿⢠⡏⠉⢻⠄⣿⠄'
        );
        return;
      } else if (userMessage[0] === '**fed' && context['display-name'] === process.env.BOTRUNNER) {
        spamProtection(channel, '+ed', 0);
        if (timer) {
          clearInterval(timer);
        }
        timer = startEDTimer(channel);
        return;
      } else if (userMessage[0] === '**join') {
        spamProtection(channel, '+join');
        return;
      } else if (userMessage[0] === '**rwm' && (channelsList.some((ch) => ch === channel.slice(1)) || channel === '#ablacs')) {
        let message;
        getUserMessages(channel.slice(1), context['display-name'])
          .then((r) => {
            const weebMessages = filterWeebMessages(r.data.split('\n'), context['display-name']);
            if (!weebMessages.length) {
              message = `${context['display-name']} I couldn't find weeb emotes on your logs.`;
            } else {
              const rMessage = weebMessages[Math.floor(Math.random() * weebMessages.length)];
              message = `(${msToTime(new Date() - new Date(rMessage.substring(1, rMessage.indexOf(' '))))} ago) ${rMessage.substring(rMessage.indexOf(context['display-name'].toLowerCase()))}`;
            }
            spamProtection(channel, message, 5000);
          });
        return;
      } else if (userMessage[0] === '**help') {
        spamProtection(channel, helpURL);
        return
      } else if (userMessage[0] === '**pasta') {
        getRandomPasta()
        .then((pasta) => {
          pasta = pasta.trim().replace('twitchquotes:', '');
          if (pasta !== 'show copypasta [NSFW]') {
            spamProtection(channel, pasta.length > 177 ? pasta.slice(0, 177).concat('...') : pasta);
            return;
          }
        });
      }
      return;
    case 2:
      if (userMessage[0] === '**weeb' && (channelsList.some((ch) => ch === channel.slice(1)) || channel === '#ablacs')) {
        let message;
        getUserMessages(channel.slice(1), userMessage[1])
          .then((r) => {
            const weebMessages = filterWeebMessages(r.data.split('\n'), userMessage[1]);
            if (weebMessages.length) {
              message = `@${context['display-name']} I found ${weebMessages.length} messages with weeb emotes on ${userMessage[1]} logs. AYAYA`;
            } else {
              message = `@${context['display-name']} I didn't find weeb emotes on ${userMessage[1]} logs. 😢 `;
            }
            spamProtection(channel, message, 5000);
          });
        return;
      } else if (userMessage[0] === '**anime') {
        getAnimeInfo(userMessage[1])
          .then((r) => {
            if (r.status) {
              spamProtection(channel, `@${context['display-name']} Anime not found`);
              return;
            }
            const animeDescription = r.data.Media.description
              .slice(0, r.data.Media.description.indexOf('<br>'))
              .replace(/<[^>]*>?/gm, '')
              .replace('\n', '')
              .trim();
            spamProtection(
              channel,
              `[${r.data.Media.episodes} EP] ${animeDescription.length > 180 ? animeDescription.slice(0, 180).concat('...') : animeDescription}`,
              5000
            );
          });
        return;
      } else if (userMessage[0] === '**latest') {
        let message;
        if (channels.some((ch) => ch === userMessage[1])) {
          if (latestBans[userMessage[1]].length) {
            message = `@${context['display-name']} the last banned users in ${userMessage[1]} were: ${latestBans[userMessage[1]].map((user) => `${user.username} (${msToTime(new Date() - user.time)} ago)`)}`
          } else {
            message = `@${context['display-name']} No bans registered in ${userMessage[1]} channel.`;
          }
        } else {
          message = `@${context['display-name']} This channel is not being monitored.`;
        }
        spamProtection(channel, message)
      } else if (userMessage[0] === '**draw') {

      }
      return;
  }
}

function onBanUserHandler(channel, username) {
  const bannedUser = {
    username,
    time: new Date(),
  };
  if (latestBans[channel.slice(1)].length === 5) {
    latestBans[channel.slice(1)][0] = bannedUser;
    return;
  }
  latestBans[channel.slice(1)].push(bannedUser);
};

function onConnectedHandler(addr, port) {
  console.log(`* Connected to ${addr}:${port}`);
  startTime = new Date();
};