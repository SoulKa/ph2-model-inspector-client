export class HttpError extends Error {

    message: string;
    statusCode: number;

    constructor( message = "Unknown error", statusCode = 500 ) {
        super( message );
        this.statusCode = 500;
        this.message = message;
    }

}