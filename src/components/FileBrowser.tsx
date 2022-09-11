import { Dialog, Classes, Button, InputGroup } from "@blueprintjs/core";
import { useCallback, useEffect, useState } from "react";
import { handleError, showError } from "../classes/Toaster";
import { ApiManager } from "../manager/ApiManager";
import { FileBrowser as ChonkyFileBrowser, FileArray, FileData, FileNavbar, FileToolbar, FileContextMenu, FileList, ChonkyActions, ChonkyActionUnion, MapFileActionsToData } from "chonky";
import { OsInfoObject, PathDelimiter } from "../types";

const apiManager = ApiManager.instance;

declare type FileBrowserProps = {
    isOpen: boolean;
    directoriesOnly?: boolean;
    showHiddenFiles?: boolean;
    initialDirectory?: string;
    fileExtensions?: string[];
    onClose: () => void;
    onSubmit: (filepath: string) => void;
};


FileBrowser.defaultProps = { directoriesOnly: false, showHiddenFiles: false, fileExtensions: [] } as Partial<FileBrowserProps>;

function joinPath( delimiter: PathDelimiter, ...dirs: string[] ) {
    return dirs.map( d => d.endsWith(delimiter) ? d.slice(0, -1) : d ).join(delimiter);
}

function toChonkyFile( path: string, name: string, isDirectory: boolean ) {
    return { id: path, isDir: isDirectory, name: name } as FileData;
}

export default function FileBrowser( props: FileBrowserProps ) {
    
    const { isOpen, initialDirectory } = props;

    const [files, setFiles] = useState<FileArray<FileData>>();
    const [path, setPath] = useState<FileArray<FileData>>();
    const [selection, setSelection] = useState<string>();
    const cwd = (path === undefined || path.length === 0) ? undefined : path[path.length-1]?.id;

    // sets the given path as return value
    function select( filepath: string, isDir = true ) {
        if (isDir && props.fileExtensions!.length !== 0 && !props.fileExtensions!.some(v => v === "")) return;
        setSelection(filepath);
    }

    // sets the current directory
    function changeDirectory( directory: string ) {
        select(directory);
        setPath(directory.split(apiManager.osInfo.delimiter).map( (dirName, i, arr) => toChonkyFile(joinPath(apiManager.osInfo.delimiter, ...arr.slice(0, i), dirName), dirName, true) ));
    }

    // gets called when user does some file UI interaction
    function onFileAction( data: MapFileActionsToData<ChonkyActionUnion> ) {
        switch (data.id) {
            case "open_files":
                const target = data.payload.targetFile!;
                if (target.isDir) {
                    changeDirectory(target.id);
                } else if (!props.directoriesOnly) {
                    props.onSubmit(target.id);
                }
                break;

            case "mouse_click_file":
            case "keyboard_click_file":
                select(data.payload.file.id, data.payload.file.isDir);
                break;
        }
    }

    // load files on path changes
    useEffect(() => {

        // reset on closes
        if (!isOpen) {
            return;
        }

        if (path === undefined) {
            changeDirectory(initialDirectory||apiManager.osInfo.homedir);
        } else if (cwd !== undefined) {
            apiManager.listFiles(cwd).then( f => {
                const files = Object.entries(f)
                    .filter( ([name, isDir]) => {
                        if (props.directoriesOnly && !isDir) return false;
                        if (!props.showHiddenFiles && (name.startsWith(".") || name.startsWith("$"))) return false;
                        if (props.fileExtensions!.length !== 0 && (!isDir && !props.fileExtensions!.some( ext => name.endsWith(ext) ))) return false;
                        return true;
                    })
                    .map( ([name, isDir]) => toChonkyFile(joinPath(apiManager.osInfo.delimiter, cwd, name), name, isDir) );
                setFiles(files);
            }).catch(showError);
        }
    }, [isOpen, path, initialDirectory, cwd]);

    return (
        <Dialog
            isOpen={isOpen}
            icon="folder-open"
            title="Filebrowser"
            style={{ height: "80vh", display: "flex", width: "80vw" }}
            onClose={props.onClose}
        >
            <div className={Classes.DIALOG_BODY}>
                <ChonkyFileBrowser
                    files={files||[null]}
                    folderChain={path}
                    fileActions={[ChonkyActions.OpenFiles, ChonkyActions.EnableListView]}
                    onFileAction={onFileAction}
                    disableDragAndDrop
                    disableSelection
                    disableDefaultFileActions
                >
                    <FileNavbar />
                    <FileToolbar />
                    <FileList />
                </ChonkyFileBrowser>
            </div>
            <div className={Classes.DIALOG_FOOTER}>
                <div className={Classes.DIALOG_FOOTER_ACTIONS} style={{ display: "flex" }}>
                    <div style={{ flex: 1 }}><InputGroup value={selection} readOnly/></div>
                    <Button onClick={props.onClose}>Cancel</Button>
                    <Button intent="primary" disabled={selection === undefined} onClick={() => selection !== undefined && props.onSubmit(selection)}>{"Select " + (props.directoriesOnly ? "Folder" : "File")}</Button>
                </div>
            </div>
        </Dialog>
    );
}