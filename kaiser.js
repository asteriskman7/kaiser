'use strict';
var Discord = require("discord.js");
var bot = new Discord.Client();
var fs = require('fs');

function saveState(force, callback) {
  let curTime = new Date();
  if ((Date.now() - lastSave) > 30000 || force === true) {
    let saveString = JSON.stringify(state);
    if (callback !== undefined) {
      fs.writeFile('./save', saveString, callback);
    } else {
      fs.writeFile('./save', saveString);
    }
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
    process.exit(1);
  }
  console.log('done loading');
}

var prefix = '%';
var state;
var lastSave = 0;
var muteRoleName = 'Muted';

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
    //TODO: design a more elegant way of adding new fields to exsisting saves
    if (state.guilds[guildID].timeouts === undefined) {
      state.guilds[guildID].timeouts = [];
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
    listGrantable: true,
    mute: true
  };
  var modOnlyCmds = {
    addGrantable: true,
    removeGrantable: true,
    mute: true
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
      case 'mute':
        //<@user> <minutes> <reason>
        let muteDuration = parseInt(cmd[2]);
        let unmuteTime = Date.now() + muteDuration * 60 * 1000;
        let muteReason = cmd.slice(3).join(' ');
        if (!isNaN(muteDuration) && muteReason.length > 0) {
          if (msg.mentions !== undefined && msg.mentions.users.size === 1) {
            let mentionedUser = msg.mentions.users.first();
            let mentionedUserName = getUsernameFromId(msg.guild, mentionedUser.id);
            let modName = getUsernameFromId(msg.guild, msg.author.id);
            role = msg.guild.roles.find('name', muteRoleName);
            if (role) {
              let muteGuildMember = msg.guild.member(mentionedUser.id);
              muteGuildMember.addRole(role).then((gm) => {
                //TODO: handle a user who already has a mute timeout by removing the previous timeout and adding a new one
                state.guilds[guildID].timeouts.push({
                  time: unmuteTime,
                  action: "REVOKE",
                  role: muteRoleName,
                  user: mentionedUser.id,
                  message: `${mentionedUserName}, your mute on ${msg.guild.name} for \`${muteReason}\` has now expired`
                });
                msgSrc.sendMessage(`Muting ${mentionedUserName} for ${muteDuration} minutes for \`${muteReason}\``);
                mentionedUser.sendMessage(`${mentionedUserName}, You have been muted for ${muteDuration} minutes in ${msg.guild.name} by ${modName} because \`${muteReason}\``);
              }).catch((e) => {
                msgSrc.sendMessage('Failed to add mute role to user. Already muted?');
                console.log(e);
              });
            } else {
              msgSrc.sendMessage('Unable to add mute role because it does not exist.');
            }
          } else {
            msgSrc.sendMessage('Error: No mentioned user found in command');
          }
        } else {
          msgSrc.sendMessage('Error: badly formatted command. Check help');
        }
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
 ${prefix}mute <@user> <integer duration in minutes> <reason message for user> - mute and automatically unmute user
   Sends reason message to user via PM.
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

function getUsernameFromId(guild, userID) {
  var user = guild.members.find('id', userID);
  if (user.nickname !== null) {
    return user.nickname;
  } else {
    return user.user.username;
  }
}

bot.on('ready', () => {
  console.log('I am ready!');
  setInterval(handleTimeouts, 1000);
});

bot.on('error', e => { console.error(e); });

bot.on('disconnect', handleDisconnect);

function handleDisconnect() {
  let disconnectTime = (new Date()).toString();
  console.log('Received disconnect at', disconnectTime);
  saveState(true, () => {process.exit(1);});
}

function handleTimeouts() {
  Object.keys(state.guilds).forEach(guildID => {
    let guild = state.guilds[guildID];
    let guildObj = bot.guilds.find('id', guildID);

    if (guild.timeouts === undefined) {
      guild.timeouts = [];
    }
    guild.timeouts = guild.timeouts.filter(timeout => {
      /*each timeout is an object like this:
        {time: <time to invoke the action>,
         action: <either "GRANT" or "REVOKE">,
         role: <role name to be granted or revoked>,
         user: <user id to act on>,
         message: <optional message to PM to the user when the action occurs>
        }
      */
      if (Date.now() >= timeout.time) {
        console.log('servicing timeout', JSON.stringify(timeout));
        let role = guildObj.roles.find('name', timeout.role);
        if (role) {
          let guildMember = guildObj.member(timeout.user);
          guildMember.removeRole(role).then((gm) => {
            guildMember.sendMessage(timeout.message);
          }).catch((e) => {
            console.log('failed to remove role during timeout', JSON.stringify(timeout), e);
          });
        } else {
          console.log('timeout role', timeout.role, 'does not exist');
        }
        return false; //return false so the filter will discard this timeout
      } else {
        //console.log('skipping timeout', JSON.stringify(timeout));
        return true; //return true so the filter will retain this timeout
      }
    });
  });
}

loadState();
if (state.botToken !== undefined && state.botToken.length > 0) {
  bot.login(state.botToken);
} else {
  console.log('ERROR: state.botToken is undefined or empty');
}

//add bot to server and give read messages/send messages/manage roles permissions
//https://discordapp.com/oauth2/authorize?client_id=<CLIENTID>&scope=bot
