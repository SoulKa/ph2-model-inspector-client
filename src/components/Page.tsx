import { DetailedHTMLProps, HTMLAttributes, ReactNode } from "react";
import Header from "./Header";

export type PageProps = DetailedHTMLProps<HTMLAttributes<HTMLDivElement>, HTMLDivElement> & {
    headerComponents?: ReactNode;
    title: string;
};

export default function Page( props: PageProps ) {
    const _props = Object.assign({}, props);
    if (_props.className === undefined) _props.className = "";
    _props.className += " page";
    const { headerComponents } = _props;
    delete _props.headerComponents;

    return (
        <>
            <Header title={_props.title}>
                {headerComponents}
            </Header>
            <div {..._props}>

            </div>
        </>
    );
}