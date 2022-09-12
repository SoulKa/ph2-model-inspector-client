import { DisplayableError } from "../classes/Error";
import { crawl } from "../classes/Util";
import { FileNodeObject, FileNodeType, ModelObject } from "../types";
import { ApiManager } from "./ApiManager";
import { StorageManager } from "./StateManager";

const apiManager = ApiManager.instance;
const storageManager = StorageManager.instance;

function modelArrayToMap( models: FileNodeObject[] ) {
    const m = new Map<string, FileNodeObject>();
    crawl(
        models,
        n => {
            switch (n.type) {
                case FileNodeType.DIRECTORY: m.set(n.path, n); return n.children;
                case FileNodeType.MODEL: m.set(n.path, n); return [];
                default: throw new TypeError("Unknown file node type!");
            }
        }
    );
    return m;
}

export class ModelManager {

    private static _instance : ModelManager|undefined;

    /** Links to all models */
    private _modelsMap : Map<string, FileNodeObject> = new Map();
    
    /** Hierarchy of all models that are used in the currently selected map */
    private _mapModels = [] as FileNodeObject[];
    
    /** Hierarchy of all models that lie inside the current model directory */
    private _models = [] as FileNodeObject[];

    private _loadingModels = false;

    private _loadingMapModels = false;

    /** The (unique) name of the currently selected map. Throws if none selected */
    get currentMap() {
        const mapName = storageManager.getAppState("mapName");
        if (mapName === undefined) throw new DisplayableError("Must select a map first!");
        return mapName;
    };

    static get instance() {
        if (this._instance === undefined) this._instance = new ModelManager();
        return this._instance;
    }

    static extractTexturePath( model: ModelObject ) {
        if (model.texturePath !== undefined) return model.texturePath;
        let { parent, customTexturePath } = model;
        while (customTexturePath === undefined && parent !== undefined) {
            customTexturePath = parent.customTexturePath;
            parent = parent.parent;
        }
        return customTexturePath;
    }

    private updateModelsMap() {
        this._modelsMap = new Map(modelArrayToMap(this._models.concat(this._mapModels)));
    }

    async loadModels( directory?: string ) {
        if (this._loadingModels) return false;
        this._loadingModels = true;
        try {
            if ((directory = (directory || storageManager.getAppState("modelDirectory"))) === undefined) throw new DisplayableError("Must select a directory first!");
            this._models = await apiManager.getModels(directory);
            storageManager.updateAppState("modelDirectory", directory);
            this.updateModelsMap();
            return true;
        } finally {
            this._loadingModels = false;
        }
    }
    
    async loadMapModels() {
        if (this._loadingMapModels) return false;
        this._loadingMapModels = true;
        try {
            this._mapModels = await apiManager.getMapModels(this.currentMap);
            this.updateModelsMap();
            return true;
        } finally {
            this._loadingMapModels = false;
        }
    }

    getModels() {
        return this._models;
    }

    getMapModels() {
        return this._mapModels;
    }

    getModel( modelId: string ) {
        const model = this._modelsMap.get(modelId);
        if (model === undefined) return;
        if (model.type !== FileNodeType.MODEL) throw new TypeError("Is not a model!");
        return model;
    }

    getNode( nodeId: string ) {
        return this._modelsMap.get(nodeId);
    }

    async removeModelFromMap( modelId: string ) {
        const model = this.getModel(modelId);
        if (model === undefined) return;
        await apiManager.removeModelFromMap(this.currentMap, model.name);
        this._modelsMap.delete(modelId);
        this._mapModels.splice(this._mapModels.findIndex(m => m.path === modelId), 1);
    }

    async addModelToMap( modelId: string ) {
        const model = this.getModel(modelId);
        if (model === undefined) throw new Error("Cannot find model!");
        if (model.type !== FileNodeType.MODEL) throw new TypeError("Is not a model!");

        const modelPaths = await apiManager.addModelToMap(this.currentMap, { modelPath: model.path, texturePath: ModelManager.extractTexturePath(model) });
        let _model = this._mapModels.find(m => m.path === modelPaths.modelPath) as ModelObject;
        if (_model === undefined) {
            _model = { ...model };
            _model.path = modelPaths.modelPath;
            _model.customTexturePath = undefined;
            _model.parent = undefined;
            this._mapModels.push(_model);
            this._modelsMap.set(_model.path, _model);
        }
        _model.texturePath = modelPaths.texturePath;
    }

    async setTexture( nodeId: string, texturePath: string ) {
        const node = this.getNode(nodeId);
        if (node === undefined) throw new Error("Cannot find node!");
        await apiManager.setCustomTexture(node.path, texturePath);
        node.customTexturePath = texturePath;
    }

    async removeTexture( nodeId: string ) {
        const node = this.getNode(nodeId);
        if (node === undefined) throw new Error("Cannot find node!");
        await apiManager.removeCustomTexture(node.path);
        node.customTexturePath = undefined;
    }

}