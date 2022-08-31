import { DetailedHTMLProps, HTMLAttributes } from "react";

export type PageProps = DetailedHTMLProps<HTMLAttributes<HTMLDivElement>, HTMLDivElement>;

export default function Page( props: PageProps ) {
    const _props = Object.assign({}, props);
    if (_props.className === undefined) _props.className = "";
    _props.className += " page";

    return (
        <div {..._props}>

        </div>
    );
}