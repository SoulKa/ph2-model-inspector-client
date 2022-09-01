import { IconName } from "@blueprintjs/core";

export class HttpError extends Error {

    statusCode: number;

    constructor( message = "Unknown error", statusCode = 500 ) {
        super( message );
        this.statusCode = 500;
    }

}

export class DisplayableError extends Error {

    icon: IconName|JSX.Element;

    constructor( message = "Unknown error", icon = "warning-sign" as IconName|JSX.Element ) {
        super(message);
        this.icon = icon;
    }

}