export class HttpError extends Error {

    statusCode: number;

    constructor( message = "Unknown error", statusCode = 500 ) {
        super( message );
        this.statusCode = 500;
    }

}

export class DisplayableError extends Error {

    constructor( message = "Unknown error" ) {
        super(message);
    }
    
}