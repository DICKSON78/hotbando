/**
 * API Response Standardization Utility
 * Ensures all API responses follow consistent format
 */

class APIResponse {
    /**
     * Success response
     */
    static success(data = {}, message = null) {
        return {
            success: true,
            message: message,
            ...data
        };
    }

    /**
     * Error response
     */
    static error(message, statusCode = 400, details = null) {
        return {
            success: false,
            error: message,
            statusCode: statusCode,
            details: details
        };
    }

    /**
     * Paginated response
     */
    static paginated(data, pagination) {
        return {
            success: true,
            data: data,
            pagination: {
                page: pagination.page || 1,
                perPage: pagination.perPage || 20,
                total: pagination.total || 0,
                totalPages: Math.ceil((pagination.total || 0) / (pagination.perPage || 20))
            }
        };
    }

    /**
     * Validation error response
     */
    static validationError(errors) {
        return {
            success: false,
            error: 'Validation failed',
            errors: errors
        };
    }
}

module.exports = APIResponse;
