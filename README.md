# kaiser
Kaiser is a discord bot for managing roles.

Kaiser does not do a million other things.

Kaiser commands start with a percent sign %.

Kaiser can only manage roles lower than its highest role.

You can see the list of commands and their usage with %help.

Kaiser is built on [discord.js](https://github.com/hydrabolt/discord.js/).

To add to channel:

1. Create bot using instructions [here](https://github.com/Chikachi/DiscordIntegration/wiki/How-to-get-a-token-and-channel-ID-for-Discord)
 1. Note the client ID and bot token for future steps
2. Create initial save file named ./save with bot's token from previous step
  1. {"botToken":"INSERT TOKEN HERE"}
3. Add bot to server
  1. `https://discordapp.com/oauth2/authorize?client_id=CLIENTID&scope=bot`
4. Give bot a role with the 'Manage Roles' permission
