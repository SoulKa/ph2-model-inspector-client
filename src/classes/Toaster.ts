import { IconName, Intent, Toaster } from "@blueprintjs/core";
import { DisplayableError, HttpError } from "./Error";

export const TOASTER = Toaster.create({ position: "top-right" });

export function showMessage( message: string, intent = "none" as Intent, icon?: IconName|JSX.Element ) {
    return TOASTER.show({
        message,
        intent,
        icon
    });
}

export function showError( message: string, icon = "warning-sign" as IconName|JSX.Element ) {
    return showMessage(message, "danger", icon);
}

export function handleError( error: any ) {
    console.error(error);
    let _error : DisplayableError|undefined;
    if (error instanceof DisplayableError) _error = error;
    else if (error instanceof HttpError) _error = new DisplayableError(`Network request failed [${error.statusCode}]: ${error.message}`);
    else if (error instanceof Error) _error = new DisplayableError("Internal error: " + error.message);
    else _error = new DisplayableError("Uncatched error!");
    showError(_error.message, _error.icon);
}