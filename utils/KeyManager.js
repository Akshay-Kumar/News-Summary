// utils/KeyManager.js
let apiKeys = process.env.WORLDNEWS_API_KEYS.split(',').map(k => k.trim());
let apiKeyIndex = 0;

class KeyManager {
    static getActiveApiKey() {
        return apiKeys[apiKeyIndex];
    }

    static rotateApiKey() {
        apiKeyIndex = (apiKeyIndex + 1) % apiKeys.length;
        console.log(`[KeyManager] Rotated to key index ${apiKeyIndex}`);
        return KeyManager.getActiveApiKey();
    }

    static markKeyExhausted() {
        console.warn(`[KeyManager] Key index ${apiKeyIndex} exhausted/quota 0.`);
        return KeyManager.rotateApiKey();
    }

    static allKeysExhausted(api_quota_left) {
        return apiKeyIndex === apiKeys.length - 1 && api_quota_left <= 0;
    }
}

module.exports = KeyManager;
