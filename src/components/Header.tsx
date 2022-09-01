import { Icon, Navbar } from "@blueprintjs/core";
import { PropsWithChildren } from "react";
import { Link, useNavigate } from "react-router-dom";

export type HeaderProps = {
    title: string;
};

export default function Header( props: PropsWithChildren<HeaderProps> ) {

    const navigate = useNavigate();
    let backIcon = null as JSX.Element|null;
    if (window.location.pathname.length > 1) backIcon = <Link to="../"><Icon icon="arrow-left" onClick={() => navigate("../")} style={{ marginRight: "1em" }} size={25} /></Link>;

    return (
        <Navbar fixedToTop>
            <Navbar.Group>
                {backIcon}
                <Navbar.Heading>{props.title}</Navbar.Heading>
                <Navbar.Divider />
                {props.children}
            </Navbar.Group>
        </Navbar>
    );
}