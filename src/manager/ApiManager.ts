import { ModelFolderObject } from "../../types";
import { DisplayableError, HttpError } from "../classes/Error";
import { StorageManager } from "./StateManager";

export enum API_ENDPOINT {
    MAPS = "/api/maps",
    MAP_MODELS = "/api/maps/:map/models",
    MAP_IMAGE = "/api/maps/:map/preview.png",
    MODELS = "/api/models",
    MODEL_MESH = "/api/models/mesh",
    MODEL_TEXTURE = "/api/models/texture"
}

declare type ParamsObject = { [key: string]: number|string };

export type FechtOptions = {
    method: "GET"|"POST"|"PUT"|"DELETE",
    query: ParamsObject,
    params: ParamsObject,
    body: object
}

function formatUrlParams( url: string, params: ParamsObject ) {
    for (const [key, value] of Object.entries(params)) url = url.replace(":"+key, value.toString());
    return url;
}

function formatUrlQuery( url: string, params: ParamsObject ) {
    return url+"?"+Array.from(Object.entries(params)).map( ([key, value]) => key+"="+value ).join("&");
}

const storageManager = StorageManager.instance;

export class ApiManager {

    private static _instance : ApiManager|undefined;

    modelDirectory : string|undefined;

    static get instance() {
        if (this._instance === undefined) this._instance = new ApiManager();
        return this._instance;
    }

    private constructor() {}

    /**
     * Executes a HTTP request on the local API
     * @param endpoint The API endpoint
     * @param options Partial options for the request
     * @returns The response JSON object if any
     */
    async fetch( endpoint: API_ENDPOINT, options = {} as Partial<FechtOptions> ) {

        // prepare URL
        let url = endpoint as string;
        if (options.params) url = formatUrlParams(url, options.params);
        if (options.query) url = formatUrlQuery(url, options.query);

        // prepare header and body
        const headers = new Headers();
        let body : string|undefined;
        if (options.body) {
            body = JSON.stringify(options.body);
            headers.set("Content-Type", "application/json");
        }
        
        // execute request
        const req = await fetch(
            url,
            {
                method: options.method || "GET",
                headers: headers,
                body: body
            }
        );
        if (!req.ok) throw new HttpError(await req.text(), req.status);
        if (req.headers.get("Content-Type")?.startsWith("application/json")) return await req.json();
    
    }

    async getMaps() {
        return await this.fetch(API_ENDPOINT.MAPS) as string[];
    }

    getMapImageUrl( map: string ) {
        return formatUrlParams(API_ENDPOINT.MAP_IMAGE, { map });
    }

    getModelUrl( type : "mesh"|"texture", modelPath: string ) {
        const modelDirectory = storageManager.getAppState("modelDirectory");
        if (modelDirectory === undefined) throw new DisplayableError("Must select a map directory first!");
        return formatUrlQuery(type === "mesh" ? API_ENDPOINT.MODEL_MESH : API_ENDPOINT.MODEL_TEXTURE, { modelDirectory, modelPath });
    }

    async getModels( directory: string ) {
        console.log("Loading model index...");
        return await this.fetch(API_ENDPOINT.MODELS, { query: { modelDirectory: directory } }) as ModelFolderObject;
    }

}