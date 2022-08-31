import { PropsWithChildren } from "react";

export type FlexContainerProps = {
    flexDirection?: "column"|"row"
}

export default function FlexContainer( props : PropsWithChildren<FlexContainerProps> ) {
    return <div className="flex-container" style={{ flexDirection: props.flexDirection||"column" }}>{props.children}</div>;
}