import { Dialog, Classes, Button, InputGroup } from "@blueprintjs/core";
import { useCallback, useEffect, useState } from "react";
import { handleError, showError } from "../classes/Toaster";
import { ApiManager } from "../manager/ApiManager";
import { FileBrowser as ChonkyFileBrowser, FileArray, FileData, FileNavbar, FileToolbar, FileContextMenu, FileList, ChonkyActions, ChonkyActionUnion, MapFileActionsToData } from "chonky";

const apiManager = ApiManager.instance;

declare type FileBrowserProps = {
    isOpen: boolean;
    initialDirectory: string;
    onClose: () => void;
    onSubmit: (filepath: string) => void;
};

declare type PathDelimiter = "/"|"\\";

function joinPath( delimiter: PathDelimiter, ...dirs: string[] ) {
    return dirs.map( d => d.endsWith(delimiter) ? d.slice(0, -1) : d ).join(delimiter);
}

function toChonkyFile( path: string, name: string, isDirectory: boolean ) {
    return { id: path, isDir: isDirectory, name: name } as FileData;
}

export default function FileBrowser( props: FileBrowserProps ) {
    
    const { isOpen, initialDirectory } = props;

    const [delimiter, setDelimiter] = useState<PathDelimiter>();
    const [files, setFiles] = useState<FileArray<FileData>>();
    const [path, setPath] = useState<FileArray<FileData>>();
    const [selection, setSelection] = useState(initialDirectory);
    const cwd = (path === undefined || path.length === 0) ? undefined : path[path.length-1]?.id;

    // sets the current directory
    function changeDirectory( directory: string ) {
        if (delimiter === undefined) return;
        setPath(directory.split(delimiter).map( (dirName, i, arr) => toChonkyFile(joinPath(delimiter, ...arr.slice(0, i), dirName), dirName, true) ));
    }

    // gets called when user does some file UI interaction
    function onFileAction( data: MapFileActionsToData<ChonkyActionUnion> ) {
        switch (data.id) {
            case "open_files":
                changeDirectory(data.payload.targetFile!.id);
                break;

            case "mouse_click_file":
            case "keyboard_click_file":
                setSelection(data.payload.file.id);
                break;
        }
    }

    // load delimiter once
    useEffect(() => {
        if (delimiter === undefined) apiManager.getPathDelimiter().then(setDelimiter).catch(handleError);
    }, [delimiter]);
    
    // load files on path changes
    useEffect(() => {
        if (delimiter === undefined) return;
        if (path === undefined) {
            changeDirectory(initialDirectory);
        } else if (cwd !== undefined) {
            apiManager.listFiles(cwd).then(f=> setFiles(Object.entries(f).map( ([name, isDir]) => toChonkyFile(joinPath(delimiter, cwd, name), name, isDir) ))).catch(showError);
        }
    }, [path, delimiter, initialDirectory, cwd]);

    // check if all is loaded
    if (delimiter === undefined) return null;

    return (
        <Dialog
            isOpen={isOpen}
            icon="folder-open"
            title="Select a directory"
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
                    <Button intent="primary" onClick={() => props.onSubmit(selection)}>Select Folder</Button>
                </div>
            </div>
        </Dialog>
    );
}