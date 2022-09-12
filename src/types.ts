export enum FileNodeType {
    DIRECTORY = 0,
    MODEL = 1
}

declare type FileNodeObjectBase = {
    name: string;
    type: FileNodeType;
    customTexturePath?: string;
    parent?: FileNodeObject;
    path: string;
};

export type ModelObject = FileNodeObjectBase & {
    type: FileNodeType.MODEL;
    texturePath?: string;
};

export type DirectoryObject = FileNodeObjectBase & {
    type: FileNodeType.DIRECTORY;
    children: FileNodeObject[];
};

export type FileNodeObject = ModelObject|DirectoryObject;
export type ModelPathInfoObject = {
    modelPath: string;
    texturePath?: string;
}

export type DirectoryListingObject = { [name: string]: boolean };

export type PathDelimiter = "/"|"\\";
export type OsInfoObject = { delimiter: "/"|"\\"; homedir: string };

export type TextureConfigObject = { [modelFilepath: string]: string };