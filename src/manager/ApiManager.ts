import { DirectoryListingObject, ModelFolderObject, ModelObject, OsInfoObject, TextureConfigObject } from "../types";
import { DisplayableError, HttpError } from "../classes/Error";
import { StorageManager } from "./StateManager";

export enum API_ENDPOINT {
    MAPS = "/api/maps",
    MAP_MODELS = "/api/maps/:map/models",
    MAP_MODEL = "/api/maps/:map/models/:model",
    MAP_IMAGE = "/api/maps/:map/preview.png",
    MODELS = "/api/models",
    MODELS_TEXTURES = "/api/models/textures",
    FILE = "/api/file",
    DIRECTORIES = "/api/directories",
    DIRECTORIES_INFO = "/api/directories/os-info",
}

export enum APP_ENDPOINT {
    MAP_SELECTION = "/",
    MODEL_BROWSER = "/browser"
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

    private _isInitialized = false;
    
    private _osInfo : OsInfoObject|undefined;

    get osInfo() { if (this._osInfo === undefined) throw new TypeError("OS info object is not set!"); return this._osInfo }

    static get instance() {
        if (this._instance === undefined) this._instance = new ApiManager();
        return this._instance;
    }

    private constructor() {}

    async initialize() {
        if (this._isInitialized) return;
        this._osInfo = Object.freeze(await this.fetch(API_ENDPOINT.DIRECTORIES_INFO));
        this._isInitialized = true;
    }

    /**
     * Executes a HTTP request on the local API
     * @param endpoint The API endpoint
     * @param options Partial options for the request
     * @returns The response JSON object if any
     */
    async fetch<T = any>( endpoint: API_ENDPOINT, options = {} as Partial<FechtOptions> ) {

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
        if (req.headers.get("Content-Type")?.startsWith("application/json")) return await req.json() as T;
    }

    async getMaps() {
        return await this.fetch(API_ENDPOINT.MAPS) as string[];
    }

    getMapImageUrl( map: string ) {
        return formatUrlParams(API_ENDPOINT.MAP_IMAGE, { map });
    }

    getFileUrl( filepath: string ) {
        return formatUrlQuery(API_ENDPOINT.FILE, { path: filepath });
    }

    async listFiles( directory: string ) {
        return await this.fetch(API_ENDPOINT.DIRECTORIES, { query: { path: directory } }) as DirectoryListingObject;
    }

    async getModels( directory: string ) {
        console.log("Loading model index...");
        return await this.fetch(API_ENDPOINT.MODELS, { query: { modelDirectory: directory } }) as ModelFolderObject;
    }

    async getMapModels( mapName: string ) {
        console.log("Loading map models...");
        return await this.fetch(API_ENDPOINT.MAP_MODELS, { params: { map: mapName } }) as ModelFolderObject;
    }

    async addModelToMap( mapName: string, model: ModelObject ) {
        console.log(`Adding model "${model.name}" to "${mapName}"...`);
        const modelDirectory = storageManager.getAppState("modelDirectory");
        if (modelDirectory === undefined) throw new DisplayableError("Must select a map directory first!");
        await this.fetch(API_ENDPOINT.MAP_MODELS, { method: "POST", body: model, params: { map: mapName }, query: { modelDirectory } });
    }

    async removeModelFromMap( mapName: string, modelName: string ) {
        console.log(`Removing model "${modelName}" from "${mapName}"...`);
        await this.fetch(API_ENDPOINT.MAP_MODEL, { method: "DELETE", params: { map: mapName, model: modelName } });
    }

    async getCustomTextures() {
        return await this.fetch(API_ENDPOINT.MODELS_TEXTURES) as TextureConfigObject;
    }

    async setCustomTexture( modelPath: string, texturePath: string ) {
        const modelDirectory = storageManager.getAppState("modelDirectory");
        if (modelDirectory === undefined) throw new DisplayableError("Must select a map directory first!");
        await this.fetch(API_ENDPOINT.MODELS_TEXTURES, { method: "POST", query: { modelDirectory, texturePath, modelPath } });
    }

}