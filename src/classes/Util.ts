export function crawl<T>( nodes: T[], cb: (node: T) => T[] ) {
    if (nodes.length === 0) return;
    nodes.forEach( node => crawl(cb(node), cb));
}