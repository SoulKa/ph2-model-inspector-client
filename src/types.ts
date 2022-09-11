export enum FileNodeType {
    DIRECTORY = 0,
    MODEL = 1
}

declare type FileNodeObjectBase = {
    name: string;
    type: FileNodeType
};

export type ModelObject = FileNodeObjectBase & {
    type: FileNodeType.MODEL;
    modelPath: string;
    texturePath?: string;
};

export type DirectoryObject = FileNodeObjectBase & {
    type: FileNodeType.DIRECTORY;
    path: string;
    children: ModelFolderObject;
};

export type FileNodeObject = ModelObject|DirectoryObject;
export type ModelFolderObject = FileNodeObject[];

export type DirectoryListingObject = { [name: string]: boolean };

export type PathDelimiter = "/"|"\\";
export type OsInfoObject = { delimiter: "/"|"\\"; homedir: string };

export type TextureConfigObject = { [modelFilepath: string]: string };