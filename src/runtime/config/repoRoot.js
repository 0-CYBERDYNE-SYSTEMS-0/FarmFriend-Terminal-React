import fs from "node:fs";
import path from "node:path";
export function findRepoRoot(startDir = process.cwd()) {
    let cur = path.resolve(startDir);
    for (let i = 0; i < 12; i += 1) {
        const pythonRef = path.join(cur, "reference source code python ver");
        if (fs.existsSync(pythonRef) && fs.statSync(pythonRef).isDirectory())
            return cur;
        const packet = path.join(cur, "ff_terminal_port_packet 2");
        if (fs.existsSync(packet) && fs.statSync(packet).isDirectory())
            return cur;
        const localPacket = path.join(cur, "packet");
        if (fs.existsSync(localPacket) && fs.statSync(localPacket).isDirectory())
            return cur;
        const parent = path.dirname(cur);
        if (parent === cur)
            break;
        cur = parent;
    }
    return path.resolve(startDir);
}
