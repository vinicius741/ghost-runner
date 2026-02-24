import { app } from 'electron';
import path from 'path';
import fs from 'fs';

export function toUniquePaths(paths: Array<string | null | undefined>): string[] {
    const seen = new Set<string>();
    const unique: string[] = [];

    for (const candidate of paths) {
        if (!candidate) {
            continue;
        }

        const resolved = path.resolve(candidate);
        if (seen.has(resolved)) {
            continue;
        }

        seen.add(resolved);
        unique.push(resolved);
    }

    return unique;
}

export function getServerRootCandidates(): string[] {
    return toUniquePaths([
        process.env.GHOST_RUNNER_APP_ROOT,
        app.getAppPath(),
        path.resolve(__dirname, '..', '..'), // dist-electron -> project root
        path.resolve(__dirname, '..', '..', '..'),
        process.resourcesPath ? path.join(process.resourcesPath, 'app.asar') : null,
        process.resourcesPath ? path.join(process.resourcesPath, 'app.asar.unpacked') : null,
        process.cwd(),
    ]);
}

export function resolveServerModuleLocation(): { appRoot: string; serverEntry: string } {
    const candidates = getServerRootCandidates();

    for (const appRoot of candidates) {
        const serverEntry = path.join(appRoot, 'dist', 'src', 'server', 'index.js');
        if (fs.existsSync(serverEntry)) {
            return { appRoot, serverEntry };
        }
    }

    throw new Error(
        `Server entry not found. Checked:\n${candidates.map((candidate) => `- ${candidate}`).join('\n')}`
    );
}

export function resolveTrayIconPath(): string | null {
    const candidates = toUniquePaths(
        getServerRootCandidates().flatMap((root) => [
            path.join(root, 'build', 'icon.png'),
            path.join(root, 'frontend', 'dist', 'favicon.png'),
            path.join(root, 'src', 'server', 'public', 'favicon.png'),
        ])
    );

    return candidates.find((candidate) => fs.existsSync(candidate)) ?? null;
}
