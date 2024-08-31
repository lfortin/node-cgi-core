import { IncomingMessage, ServerResponse } from 'node:http';

export const defaultExtensions: Extensions;
export const defaultConfig: Config;

export function createHandler(configOptions?: Partial<Config>): (req: IncomingMessage, res: ServerResponse) => Promise<boolean>;

interface Extensions {
    [key: string]: Array<string>;
}

interface Config {
    urlPath: string;
    filePath: string;
    extensions: Extensions;
    indexExtension: string;
    debugOutput: boolean;
    logRequests: boolean;
    maxBuffer: number;
}