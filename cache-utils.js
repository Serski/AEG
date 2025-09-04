const { clearShopCache: clearShopCacheInternal, charCache } = require('./shared/shop-char-utils');

function clearShopCache() {
  clearShopCacheInternal();
}

function clearCharCache() {
  charCache.clear();
}

module.exports = {
  clearShopCache,
  clearCharCache,
};
