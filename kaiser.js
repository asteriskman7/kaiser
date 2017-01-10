'use strict';
var Discord = require("discord.js");
var bot = new Discord.Client();
var fs = require('fs');

function saveState() {
  let curTime = new Date();
  if ((Date.now() - lastSave) > 30000) {
    let saveString = JSON.stringify(state);
    fs.writeFile('./save', saveString);
    console.log('save complete @ ' + (new Date()));
    lastSave = Date.now();
  }
}

function loadState() {
  var stateFile = './save';
  console.log('loading state');
  var data;
  try {
    data = fs.readFileSync(stateFile, 'utf8');
    state = JSON.parse(data);
  } 
  catch (e) {
    console.log('ERROR: Unable to load save file');
  }
  console.log('done loading');
}

var prefix = '%';
var state;
var lastSave = 0;

bot.on("message", msg => {
  //ignore all messages from bots
  if (msg.author.bot) {return;}
  console.log('message: ' + msg.content);  

  var guildID;
  var curName;
  if (msg.guild !== null) {
    guildID = msg.guild.id;
    curName = msg.guild.member(msg.author.id).nickname;
    if (curName === null) {
      curName = msg.author.username;
    }
  } else {
    guildID = undefined;
    curName = msg.author.username;
  }
  
  var msgSrcType;
  var msgSrc;
  if (guildID === undefined) {
    msgSrcType = 'PM';
    msgSrc = msg.author;
    //msg.author.sendMessage('thanks for the PM ' + curName + '!');
  } else {
    msgSrcType = 'CHANNEL';
    msgSrc = msg.channel;
    //msg.channel.sendMessage('thanks for the message ' + curName + '!');
  }
  
  if (msg.content.startsWith(prefix)) {
    let cmd = msg.content.substr(1).split(' ');
    switch (cmd[0]) {       
      case 'help':
        msgSrc.sendMessage(`\`\`\`
kaiser handles roles.
Commands:
 ${prefix}help - Display this help text         
\`\`\``);         
        break;
      default:
        msgSrc.sendMessage('Unknown command');
    }
  }

  saveState();
});

bot.on('ready', () => {
  console.log('I am ready!');
});

bot.on('error', e => { console.error(e); });

loadState();
if (state.botToken !== undefined && state.botToken.length > 0) {
  bot.login(state.botToken);
} else {
  console.log('ERROR: state.botToken is undefined or empty');
}

//add bot to server and give read messages/send messages/manage roles permissions
//https://discordapp.com/oauth2/authorize?client_id=<CLIENTID>&scope=bot&permissions=268438528
