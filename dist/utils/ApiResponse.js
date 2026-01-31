class ApiResponse extends Response {
    constructor(statuscode, data, message = 'Success') {
        super(statuscode);
        this.statuscode = statuscode;
        this.data = data;
        this.message = message;
        this.success = statuscode < 400;
    }
}
export { ApiResponse };
