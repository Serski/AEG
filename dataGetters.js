const dbm = require('./database-manager');

class dataGetters {
    static async getCharFromNumericID(numericID) {
        const charData = await dbm.loadFile('characters', String(numericID));
        return charData ? String(numericID) : 'ERROR';
    }
}
module.exports = dataGetters;
