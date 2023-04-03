const botConfig = require("../utils/botconfig.js");
const Logger = require('../utils/Logger');
const logger = new Logger({ debug: true });
const { MessageEmbed, MessageButton, MessageActionRow } = require('discord.js');
const Levels = require("discord.js-leveling");

const generateVerifyCode = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let code = "";
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
};

const MemesSchema = require("../models/memes.js");
const FanArtSchema = require("../models/fanart.js");

const memeChannel = "1091917541548490762";
const fanartChannel = "1091917731852464210";

module.exports = {
    name: 'messageCreate',
    async execute(message) {
        const prefix = "c.";

        if (message.author.bot) return;

        if (!message.content.startsWith(prefix)) {

            const randomAmountOfXp = Math.floor(Math.random() * 29) + 1; // Min 1, Max 30
            const hasLeveledUp = await Levels.appendXp(message.author.id, message.guild.id, randomAmountOfXp);

            if (hasLeveledUp) {

                if (message.guild.id != "1091905976619249724") return;
                const level_channel = message.guild.channels.cache.get("1091917864350519337")

                const user = await Levels.fetch(message.author.id, message.guild.id);

                const levelEmbed = new MessageEmbed()
                    .setTitle('New Level!')
                    .setDescription(`**GG** ${message.author}, you just leveled up to level **${user.level}**!`)

                const s = await level_channel.send({ embeds: [levelEmbed], content: `<@!${message.author.id}>` })

                s.react('🎉');
            }

            if (message.channel.id === memeChannel) {

                const attachment = message.attachments.first();

                if (!attachment) return;

 
                message.react('<:upvote:1092176040996126740>');
                message.react('<:downvote:1092176072453402665>');
                

                const attachmentId = attachment.id;

                await MemesSchema.findOne({ Id: attachmentId }).then(async (result) => {
                    if (!result) {
                        const newMeme = new MemesSchema({
                            attachment: attachment.url,
                            mid: message.id,
                            user: message.author.id,
                        })

                        await newMeme.save();

                        logger.log(`New meme added to the database!`, "meme client");
                    }
                    else {
                        logger.log(`Meme already exists in the database!`, "meme client");

                    }
                })

                

            }

            if (message.channel.id === fanartChannel) {
                const attachment = message.attachments.first();
                if (!attachment) return;

                message.react('<:upvote:1092176040996126740>');
                message.react('<:downvote:1092176072453402665>');

                const attachmentId = attachment.id;

                await FanArtSchema.findOne({ Id: attachmentId }).then(async (result) => {
                    if (!result) {
                        const newFanArt = new FanArtSchema({
                            attachment: attachment.url,
                            mid: message.id,
                            user: message.author.id,
                        })

                        await newFanArt.save();

                        logger.log(`New fanart added to the database!`, "fanart client");
                    }
                    else {
                        logger.log(`Fanart already exists in the database!`, "fanart client");

                    }
                })
            }

        }

        const args = message.content.slice(prefix.length).trim().split(/ +/);

        const command = args.shift().toLowerCase();

        if (command === "verify") {
            if (message.channel.id != botConfig.verifyChannel) return;

            if (message.member.roles.cache.has(botConfig.memberRole)) return;

            // Check if there are any args
            if (args.length) return message.reply({ content: "Please do not provide any arguments!" }).then(msg => { setTimeout(() => msg.delete(), 5000) });

            const verifyCode = generateVerifyCode();

            message.reply({ content: `Please type \`${verifyCode}\` in the chat to verify yourself!` })

            const filter = m => m.author.id === message.author.id;

            const collector = message.channel.createMessageCollector(filter, { time: 60000 });
            collector.on("collect", async m => {
                if (m.author.id !== message.author.id) return;
                if (m.content !== verifyCode) return message.reply({ content: "Invalid code!" }).then(msg => { setTimeout(() => msg.delete(), 5000) });
                if (m.content === verifyCode) {
                    message.member.roles.add(botConfig.memberRole);
                    message.reply({ content: "You have been verified!" }).then(msg => { setTimeout(() => msg.delete(), 5000) });
                    logger.log(`User ${message.author.tag} has been verified!`, "verify client");
                    collector.stop();
                }
            });
            collector.on("end", collected => {
                if (collected.size === 0) {
                    message.reply({ content: "Verification timed out!" }).then(msg => { setTimeout(() => msg.delete(), 5000) });
                }
            });
        }

        if (command === "purge") {
            const amount = parseInt(args[0]);
            if (message.member.roles.cache.has("1091909117829984336")) {
                if (!amount) return message.reply({ content: "Please provide a valid number! [AMOUNT]" }).then(msg => { setTimeout(() => msg.delete(), 5000) });

                if (isNaN(amount)) return message.reply({ content: "Please provide a valid number! [AMOUNT_NOT_NUMBER]" }).then(msg => { setTimeout(() => msg.delete(), 5000) });

                if (amount <= 0) return message.reply({ content: "Please provide a valid number! [AMOUNT_LESS_ZERO]" }).then(msg => { setTimeout(() => msg.delete(), 5000) });

                const fetched = await message.channel.messages.fetch({ limit: amount });
                message.channel.bulkDelete(fetched);
            }
            else {
                message.reply({ content: "You do not have permission to use this command!" }).then(msg => { setTimeout(() => msg.delete(), 5000) });
            }
        }

        if (command === "meme") {
            if (message.member.roles.cache.has("1091909117829984336")) {
                await MemesSchema.find({}).then(async (result) => {
                    if (result.length === 0) {
                        message.reply({ content: "There are no memes in the database!" }).then(msg => { setTimeout(() => msg.delete(), 5000) });
                        return;
                    }
                    else {
                        // Find the most upvoted meme
                        const mostUpvoted = result.sort((a, b) => b.upvotes - a.upvotes)[0];
                        
                        const memeOfTheWeek = "1091915847850790985";

                        const message2 = "@everyone, we have a new meme of the week!\nAuthor: <@!" + mostUpvoted.user + ">\n";

                        

                        const embed = new MessageEmbed()
                          .setImage(mostUpvoted.attachment)
                          .setDescription(`**Upvotes:** ${mostUpvoted.upvotes}\n**Downvotes:** ${mostUpvoted.downvotes}`)
                          .setAuthor(
                            {
                                name: message.client.getUser(mostUpvoted.user).tag,
                                iconURL: message.client.getUser(mostUpvoted.user).displayAvatarURL()
                            }
                          )

                          await message.client.channels.cache.get(memeOfTheWeek).send({ embeds: [embed], content: message2 });

                        //   Delete everything
                        await MemesSchema.deleteMany({});

                        logger.log(`Memes have been deleted!`, "meme client");

                    }
                })
            }
            else {
                message.reply({ content: "You do not have permission to use this command!" }).then(msg => { setTimeout(() => msg.delete(), 5000) });
            }
        }

        if (command === "fanart") {
            if (message.member.roles.cache.has("1091909117829984336")) {
                await FanArtSchema.find({}).then(async (result) => {
                    if (result.length === 0) {
                        message.reply({ content: "There are no fanart in the database!" }).then(msg => { setTimeout(() => msg.delete(), 5000) });
                        return;
                    }
                    else {
                        const mostUpvoted = result.sort((a, b) => b.upvotes - a.upvotes)[0];
                        
                        const fanartOfTheWeek = "1091915883514961950";

                        const message2 = "@everyone, we have a new fanart of the week!\nAuthor: <@!" + mostUpvoted.user + ">\n";

                        

                        const embed = new MessageEmbed()
                          .setImage(mostUpvoted.attachment)
                          .setDescription(`**Upvotes:** ${mostUpvoted.upvotes}\n**Downvotes:** ${mostUpvoted.downvotes}`)
                          .setAuthor(
                            {
                                name: message.client.getUser(mostUpvoted.user).tag,
                                iconURL: message.client.getUser(mostUpvoted.user).displayAvatarURL()
                            }
                          )

                          await message.client.channels.cache.get(fanartOfTheWeek).send({ embeds: [embed], content: message2 });

                        //   Delete everything
                        await FanArtSchema.deleteMany({});

                       logger.log(`Fanarts have been deleted!`, "fanart client");

                    }
                })
            }
            else {
                message.reply({ content: "You do not have permission to use this command!" }).then(msg => { setTimeout(() => msg.delete(), 5000) });
            }
        }
        
    }
};