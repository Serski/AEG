const { getCharModule } = require('./charModule');

class dataGetters {
    static async getCharFromNumericID(numericID) {
        // Lazily require to avoid circular dependency with char.js.
        // Character helpers should import char inside function bodies.
        const char = getCharModule();
        const [idStr, charData] = await char.findPlayerData(numericID);
        return charData ? idStr : 'ERROR';
    }
}
module.exports = dataGetters;
