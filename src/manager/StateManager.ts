declare type AppState = {
    mapName: string;
    modelDirectory: string;
};

const APP_STATE_KEY = "ph2-mi-app-state";

export class StorageManager {

    private static _instance : StorageManager|undefined;

    private _appState : Partial<AppState>;

    static get instance() {
        if (this._instance === undefined) this._instance = new StorageManager();
        return this._instance;
    }

    private constructor() {
        try {
            this._appState = JSON.parse(window.sessionStorage.getItem(APP_STATE_KEY)||"{}");
        } catch(e) {
            this._appState = {};
        }
    }

    getAppState() : Partial<AppState>;
    getAppState( key: keyof AppState ) : Partial<AppState>[keyof AppState];
    getAppState( key?: keyof AppState ) {
        if (key !== undefined) return this._appState[key];
        return this._appState;
    }

    updateAppState( key: keyof AppState, value: AppState[keyof AppState] ) {
        this._appState[key] = value;
        window.sessionStorage.setItem(APP_STATE_KEY, JSON.stringify(this._appState));
    }

}