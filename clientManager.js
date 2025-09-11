class clientManager {
    // simple in-memory raid session store
    static raidSessions = new Map();
    // simple in-memory mine session store
    static mineSessions = new Map();
    // simple in-memory harvest session store
    static harvestSessions = new Map();

    static getRaidSession(userID) {
        const session = this.raidSessions.get(userID);
        if (session && session.expiresAt > Date.now()) {
            return session;
        }
        this.raidSessions.delete(userID);
        return null;
    }

    static setRaidSession(userID, data) {
        const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes
        this.raidSessions.set(userID, { ...data, expiresAt });
    }

    static clearRaidSession(userID) {
        this.raidSessions.delete(userID);
    }

    static getMineSession(userID) {
        const session = this.mineSessions.get(userID);
        if (session && session.expiresAt > Date.now()) {
            return session;
        }
        this.mineSessions.delete(userID);
        return null;
    }

    static setMineSession(userID, data) {
        const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes
        this.mineSessions.set(userID, { ...data, expiresAt });
    }

    static clearMineSession(userID) {
        this.mineSessions.delete(userID);
    }

    static getHarvestSession(userID) {
        const s = this.harvestSessions.get(userID);
        if (s && s.expiresAt > Date.now()) return s;
        this.harvestSessions.delete(userID);
        return null;
    }

    static setHarvestSession(userID, data) {
        const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes
        this.harvestSessions.set(userID, { ...data, expiresAt });
    }

    static clearHarvestSession(userID) {
        this.harvestSessions.delete(userID);
    }
    static getEmoji(emojiName) {
        const bot = require('./bot');

        //Remove spaces
        emojiName = emojiName.replace(/\s/g, '');
        const client = bot.getClient();
        const guildID = bot.getGuildID();
        if (!client) {
            if (process.env.DEBUG) console.log("Client not found")
            return null;
        }
        const guild = client.guilds.cache.get(guildID);
        if (!guild) {
            if (process.env.DEBUG) console.log("Guild not found")
            return null;
        }
        const foundEmoji = guild.emojis.cache?.find(emoji => emoji.name.toLowerCase() === emojiName.toLowerCase());
        if (!foundEmoji) {
            if (process.env.DEBUG) console.log("Emoji not found")
            return null;
        }
        return `<:${foundEmoji.name}:${foundEmoji.id}>`;
    }

    static async getUser(userID) {
        const bot = require('./bot');
        const client = bot.getClient();
        const guildID = bot.getGuildID();
        const guild = client.guilds.cache.get(guildID);
        if (!guild) {
            if (process.env.DEBUG) console.log("Guild not found")
            return null;
        }
        const foundUser = await guild.members.fetch(userID);
        if (!foundUser) {
            if (process.env.DEBUG) console.log("User not found")
            return null;
        }
        return foundUser;
    }

}
module.exports = clientManager;
