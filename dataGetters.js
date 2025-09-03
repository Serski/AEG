const char = require('./char');

class dataGetters {
    static async getCharFromNumericID(numericID) {
        const [idStr, charData] = await char.findPlayerData(numericID);
        return charData ? idStr : 'ERROR';
    }
}
module.exports = dataGetters;
