const fs = require('node:fs');
const path = require('node:path');
const {
    Client,
    Collection,
    Events,
    GatewayIntentBits,
    MessageFlags,
    ActionRowBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    EmbedBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');
const { token } = require('./config.json');
require("./scheduler");

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});
client.commands = new Collection();

const SELECTOR_EXPIRE_MS = 5 * 60 * 1000;
const SELECTOR_TRIGGER_TEXT = 'リフペ';

const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);
for (const folder of commandFolders) {
    const commandsPath = path.join(foldersPath, folder);
    const commandFiles = fs.readdirSync(commandsPath).filter((file) => file.endsWith('.js'));
    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);
        if ('data' in command && 'execute' in command) {
            client.commands.set(command.data.name, command);
        }
    }
}

client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot) return;

    const normalizedText = message.content.trim().toLowerCase();
    if (normalizedText !== SELECTOR_TRIGGER_TEXT.toLowerCase()) return;

    const ownerId = message.author.id;
    const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`selector:recipe:${ownerId}`)
            .setLabel('レシピ検索')
            .setStyle(ButtonStyle.Secondary),

        new ButtonBuilder()
            .setCustomId(`selector:search:${ownerId}`)
            .setLabel('アイテムドロップ検索')
            .setStyle(ButtonStyle.Secondary),

        new ButtonBuilder()
            .setCustomId(`selector:monster:${ownerId}`)
            .setLabel('モンスター検索')
            .setStyle(ButtonStyle.Secondary),

        new ButtonBuilder()
            .setCustomId(`selector:attribute:${ownerId}`)
            .setLabel('属性計算')
            .setStyle(ButtonStyle.Secondary),

        new ButtonBuilder()
            .setCustomId(`selector:usedin:${ownerId}`)
            .setLabel('アイテム使用先検索')
            .setStyle(ButtonStyle.Secondary)
    );

    const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`selector:dungeon:${ownerId}`)
            .setLabel('ダンジョン情報')
            .setStyle(ButtonStyle.Secondary),

        new ButtonBuilder()
            .setCustomId(`selector:searcharmor:${ownerId}`)
            .setLabel('防具組み合わせ例')
            .setStyle(ButtonStyle.Secondary)
    );

    const embed = new EmbedBuilder()
        .setTitle('コマンド選択')
        .setDescription('実行したいコマンドを選択してください。');

    try {
        await message.channel.send({ embeds: [embed], components: [row1, row2] });
    } catch (error) {
        console.error(error);
    }
});

client.on(Events.InteractionCreate, async (interaction) => {
    if (interaction.isChatInputCommand()) {
        const command = interaction.client.commands.get(interaction.commandName);
        if (!command) return;

        try {
            await command.execute(interaction);
        } catch (error) {
            console.error(error);
            if (interaction.replied || interaction.deferred) {
                try {
                    await interaction.followUp({ content: 'There was an error while executing this command!', flags: MessageFlags.Ephemeral });
                } catch (followUpError) {
                    console.error(followUpError);
                }
            } else {
                try {
                    await interaction.reply({ content: 'There was an error while executing this command!', flags: MessageFlags.Ephemeral });
                } catch (replyError) {
                    console.error(replyError);
                }
            }
        }
        return;
    }

    if (interaction.isButton() && interaction.customId.startsWith('selector:')) {
        const parts = interaction.customId.split(':');
        const [, commandName, ownerId] = parts;
        const isOwner = !ownerId || interaction.user.id === ownerId;

        if (!isOwner) {
            await interaction.reply({ content: 'このボタンは送信者のみが使用できます。', flags: MessageFlags.Ephemeral });
            return;
        }

        const isExpired = Date.now() - interaction.message.createdTimestamp > SELECTOR_EXPIRE_MS;

        if (isExpired) {
            const expiredEmbed = new EmbedBuilder()
                .setTitle('コマンド選択')
                .setDescription('この選択画面は有効期限切れです。もう一度 /selector を実行してください。')
                .setColor(0xff5555);

            try {
                await interaction.message.edit({ embeds: [expiredEmbed], components: [] });
            } catch (error) {
                console.error(error);
            }

            await interaction.reply({ content: 'この選択画面は有効期限切れです。もう一度 /selector を実行してください。', flags: MessageFlags.Ephemeral });
            return;
        }

        if (commandName === "searcharmor") {

            const command = interaction.client.commands.get(commandName);

            if (!command) {
                await interaction.reply({
                    content: "対象コマンドが見つかりません。"
                });
                return;
            }

            const modal = new ModalBuilder()
                .setCustomId("selector-modal:searcharmor")
                .setTitle("防具組み合わせ検索");

            const slotInput = new TextInputBuilder()
                .setCustomId("slot")
                .setLabel("装備部位数（6または7）")
                .setStyle(TextInputStyle.Short)
                .setPlaceholder("7")
                .setRequired(true);

            const enemyInput = new TextInputBuilder()
                .setCustomId("enemy")
                .setLabel("敵属性")
                .setStyle(TextInputStyle.Short)
                .setPlaceholder("火火土")
                .setRequired(true);

            modal.addComponents(
                new ActionRowBuilder().addComponents(slotInput),
                new ActionRowBuilder().addComponents(enemyInput)
            );

            await interaction.showModal(modal);

        } else {

            const modal = new ModalBuilder()
                .setCustomId(`selector-modal:${commandName}`)
                .setTitle('検索キーワードを入力');

            const input = new TextInputBuilder()
                .setCustomId('keyword')
                .setLabel('検索したい内容')
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            modal.addComponents(
                new ActionRowBuilder().addComponents(input)
            );

            await interaction.showModal(modal);

        }

        try {
            await interaction.message.delete();
        } catch (error) {
            if (error?.code !== 10008) {
                console.error(error);
            }
        }
        return;
    }

    if (interaction.isModalSubmit() && interaction.customId.startsWith('selector-modal:')) {
        const [, commandName] = interaction.customId.split(':');
        const command = interaction.client.commands.get(commandName);

        if (!command) {
            await interaction.reply({ content: '対象コマンドが見つかりません。' });
            return;
        }

        if (commandName === "searcharmor") {

            const slot =
                parseInt(
                    interaction.fields.getTextInputValue("slot")
                );

            const enemy =
                interaction.fields.getTextInputValue("enemy");

            const fakeInteraction = {
                ...interaction,
                options: {
                    getInteger: (name) => {
                        if (name === "部位") return slot;
                        return null;
                    },
                    getString: (name) => {
                        if (name === "敵属性") return enemy;
                        return null;
                    }
                },
                reply: async payload => interaction.reply(payload),
                followUp: async payload => interaction.followUp(payload)
            };

            await command.execute(fakeInteraction);
            return;
        }

        const keyword = interaction.fields.getTextInputValue('keyword');

        const fakeInteraction = {
            ...interaction,
            options: {
                getString: (name) => {
                    if (name === 'item' || name === 'name' || name === '属性' || name === '螻樊ｧ') return keyword;
                    return keyword;
                },
                getFocused: () => keyword,
            },
            reply: async (payload) => interaction.reply(payload),
            followUp: async (payload) => interaction.followUp(payload)
        };

        try {
            await command.execute(fakeInteraction);
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: '実行中にエラーが発生しました。' });
        }
    }
});

client.once(Events.ClientReady, (readyClient) => {
    console.log(`Ready! Logged in as ${readyClient.user.tag}`);

    const activities = [
        'スプレッドシート自動読み取りに変更',
        '10分ごとにデータ更新',
        '間違った情報が表示された場合は連絡をお願いします'
    ];

    let i = 0;
    setInterval(() => {
        client.user.setPresence({
            activities: [{ name: activities[i], type: 4 }],
            status: 'online'
        });
        i = (i + 1) % activities.length;
    }, 10000);
});

client.on("debug", console.log);
client.on("warn", console.warn);

client.on("shardDisconnect", (event, id) => {
    console.log("Shard disconnected", id, event.code);
});

client.on("shardReconnect", id => {
    console.log("Shard reconnect", id);
});

client.on("shardResume", (id, replayed) => {
    console.log("Shard resumed", id, replayed);
});

client.on("error", console.error);

client.login(token);
