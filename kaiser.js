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
  var jsonState;
  try {
    data = fs.readFileSync(stateFile, 'utf8');
    jsonState = JSON.parse(data);
    state = {
      botToken: '',
      guilds: {}
    };
    
    //allow anything in jsonState to overwrite the contents of state
    Object.assign(state, jsonState);
    
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

  var guildID;
  var curName;
  var authorCanRunModCmds;
  var guildMember;
  if (msg.guild !== null) {
    guildID = msg.guild.id;
    if (state.guilds[guildID] === undefined) {
      state.guilds[guildID] = {};
      state.guilds[guildID].grantableRoles = [];
    }
    guildMember = msg.guild.member(msg.author.id);
    curName = guildMember.nickname;
    if (curName === null) {
      curName = msg.author.username;
    }
    authorCanRunModCmds = guildMember.hasPermission('MANAGE_ROLES_OR_PERMISSIONS');
  } else {
    guildID = undefined;
    curName = msg.author.username;
    authorCanRunModCmds = false;
  }  
  
  var msgSrcType;
  var msgSrc;
  if (guildID === undefined) {
    msgSrcType = 'PM';
    msgSrc = msg.author;
  } else {
    msgSrcType = 'CHANNEL';
    msgSrc = msg.channel;
  }
  
  var roleName;
  var role;
  var guildOnlyCmds = {
    grantRole: true,
    revokeRole: true,
    addGrantable: true,
    removeGrantable: true,
    listGrantable: true
  };
  var modOnlyCmds = {
    addGrantable: true,
    removeGrantable: true
  };
  if (msg.content.startsWith(prefix)) {
    console.log('message: ' + msg.content);  
    let cmd = msg.content.substr(1).split(' ');
    if (modOnlyCmds[cmd[0]] && !authorCanRunModCmds) {
      msgSrc.sendMessage('You are not authorized to run that command.');
      return;
    }
    if (guildOnlyCmds[cmd[0]] && guildID === undefined) {
      msgSrc.sendMessage('That command does not work via direct message.');
      return;
    }
    //at this point the user is in the right place with the right permissions to run the cmd
    var findIndex;
    switch (cmd[0]) {
      case 'grantRole':
        roleName = cmd[1];
        if (state.guilds[guildID].grantableRoles.indexOf(roleName) === -1) {
          msgSrc.sendMessage('Role is not grantable');
        } else {
          role = msg.guild.roles.find('name', roleName);        
          if (role) {
            guildMember.addRole(role).then((gm) => {
              msgSrc.sendMessage('Role added');
            }).catch((e) => {
              msgSrc.sendMessage('Failed to add role');
              console.log(e);
            });
          } else {
            msgSrc.sendMessage('Role does not exist. (check capitalization)');
          }
        }
        break;
      case 'revokeRole':
        roleName = cmd[1];
        if (state.guilds[guildID].grantableRoles.indexOf(roleName) === -1) {
          msgSrc.sendMessage('Role is not revokable');
        } else {
          role = msg.guild.roles.find('name', roleName);
          if (role) {
            guildMember.removeRole(role).then((gm) => {
              msgSrc.sendMessage('Role removed');
            }).catch((e) => {
              msgSrc.sendMessage('Failed to remove role');
              console.log(e);
            });
          } else {
            msgSrc.sendMessage('Role does not exist. (check capitalization)');
          }
        }
        break;
      case 'addGrantable':
        roleName = cmd[1];
        role = msg.guild.roles.find('name', roleName);
        if (role) {
          if (state.guilds[guildID].grantableRoles.indexOf(roleName) === -1) {
            state.guilds[guildID].grantableRoles.push(roleName);
          }
          msgSrc.sendMessage('Role added');
          console.log('added', roleName, 'and now list is', state.guilds[guildID].grantableRoles);
        } else {
          msgSrc.sendMessage('Role does not exist. (check capitalization)');
        }
        break;
      case 'removeGrantable':
        roleName = cmd[1];
        //role = msg.guild.roles.find('name', roleName);
        //if (role) {
          findIndex = state.guilds[guildID].grantableRoles.indexOf(roleName);
          if (findIndex !== -1) {
            state.guilds[guildID].grantableRoles.splice(findIndex, 1);
          }
          msgSrc.sendMessage('Role removed');
        //} else {
        //  msgSrc.sendMessage('Role does not exist. (check capitalization)');
        //}
        break;
      case 'listGrantable':        
        state.guilds[guildID].grantableRoles.sort();
        msgSrc.sendMessage('Grantable roles:\n```\n' + state.guilds[guildID].grantableRoles.join('\n') + '\n```');
        break;      
      case 'help':
        var modStatusMsg;
        if (authorCanRunModCmds) {
          modStatusMsg = 'You can run moderator commands because you have MANAGE_ROLES permission.';
        } else {
          modStatusMsg = 'You can NOT run moderator commands because you don\'t have MANAGE_ROLES permission.';
        }
        msgSrc.sendMessage(`\`\`\`
kaiser manages roles.

(${modStatusMsg})
General commands:
 ${prefix}help - Display this help text
 ${prefix}grantRole <roleName> - add role <roleName> to issuer
 ${prefix}revokeRole <roleName> - remove role <roleName> from issuer
 ${prefix}listGrantable - list roles that can be granted/revoked
Moderator commands:
 ${prefix}addGrantable <roleName> - add role <roleName> to list of grantable/revokable roles
 ${prefix}removeGrantable <roleName> - remove role <roleName> from list of grantable/revokable roles
\`\`\`
Visit https://github.com/asteriskman7/kaiser for more information.
`);         
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
//https://discordapp.com/oauth2/authorize?client_id=<CLIENTID>&scope=bot
