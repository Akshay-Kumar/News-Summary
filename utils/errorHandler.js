// errorHandler.js

const handleError = (statusCode, customMessage = '') => {
    switch (statusCode) {
        case 200:
            return {
                success: true,
                message: 'The request was successful.'
            };

        case 400:
            return {
                success: false,
                message: 'The request was malformed or invalid.'
            };

        case 401:
            return {
                success: false,
                message: 'Authentication failed or was not provided.'
            };

        case 403:
            return {
                success: false,
                message: 'Access forbidden. If you recently created a new key, it may take time to propagate. If this persists, please contact support via Billing & Help in your dashboard.'
            };

        case 429:
            return {
                success: false,
                message: 'Rate limit exceeded. Please try again later.'
            };

        case 500:
            return {
                success: false,
                message: 'An error occurred on the server. Please try again later.'
            };

        default:
            return {
                success: false,
                message: customMessage || 'An unknown error occurred.',
                statusCode: statusCode
            };
    }
};

module.exports = {
    handleError
};
