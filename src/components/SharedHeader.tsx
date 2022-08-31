import { Navbar } from "@blueprintjs/core";

export type SharedHeaderProps = {
    
};

export default function SharedHeader() {
    return (
        <Navbar>
            <Navbar.Group>
            <Navbar.Heading>Current Map:</Navbar.Heading>
            </Navbar.Group>
        </Navbar>
    );
}