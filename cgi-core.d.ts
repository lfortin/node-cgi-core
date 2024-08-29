declare const defaultExtensions: Extensions;
declare const defaultConfig: Config;
declare function createHandler(configOptions?: Partial<Config>): (req: IncomingMessage, res: ServerResponse) => Promise<boolean>;
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
