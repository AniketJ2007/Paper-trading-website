class ApiError extends Error {
    constructor(statuscode, message = 'Something went wrong', errors = [], stacke = '') {
        super(message);
        this.message = message;
        this.statuscode = statuscode;
        this.errors = errors;
        if (stacke) {
            this.stacke = stacke;
        }
        else {
            Error.captureStackTrace(this, this.constructor);
        }
    }
}
export { ApiError };
