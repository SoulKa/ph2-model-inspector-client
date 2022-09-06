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

    const [osInfo, setOsInfo] = useState<OsInfoObject>();
    const [files, setFiles] = useState<FileArray<FileData>>();
    const [path, setPath] = useState<FileArray<FileData>>();
    const [selection, setSelection] = useState(initialDirectory);
    const cwd = (path === undefined || path.length === 0) ? undefined : path[path.length-1]?.id;

    // sets the current directory
    function changeDirectory( directory: string ) {
        if (osInfo === undefined) return;
        setSelection(directory);
        setPath(directory.split(osInfo.delimiter).map( (dirName, i, arr) => toChonkyFile(joinPath(osInfo.delimiter, ...arr.slice(0, i), dirName), dirName, true) ));
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
                setSelection(data.payload.file.id);
                break;
        }
    }

    // load delimiter once
    useEffect(() => {
        if (osInfo === undefined) apiManager.getOsInfo()
            .then( osInfo => {
                if (selection === undefined) setSelection(osInfo.homedir);
                setOsInfo(osInfo);
            })
            .catch(handleError);
    }, [osInfo]);
    
    // load files on path changes
    useEffect(() => {
        if (osInfo === undefined) return;
        if (path === undefined) {
            changeDirectory(initialDirectory||osInfo.homedir);
        } else if (cwd !== undefined) {
            apiManager.listFiles(cwd).then( f => {
                const files = Object.entries(f)
                    .filter( ([name, isDir]) => {
                        if (props.directoriesOnly && !isDir) return false;
                        if (!props.showHiddenFiles && (name.startsWith(".") || name.startsWith("$"))) return false;
                        if (props.fileExtensions!.length !== 0 && !props.fileExtensions!.some( ext => name.endsWith(ext) )) return false;
                        return true;
                    })
                    .map( ([name, isDir]) => toChonkyFile(joinPath(osInfo.delimiter, cwd, name), name, isDir) );
                setFiles(files);
            }).catch(showError);
        }
    }, [path, osInfo, initialDirectory, cwd]);

    // check if all is loaded
    if (osInfo === undefined) return null;

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
                    <Button intent="primary" onClick={() => selection !== undefined && props.onSubmit(selection)}>{"Select " + (props.directoriesOnly ? "Folder" : "File")}</Button>
                </div>
            </div>
        </Dialog>
    );
}