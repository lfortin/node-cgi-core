import { IncomingMessage, ServerResponse } from "node:http";

export const defaultExtensions: Readonly<Extensions>;
export const defaultConfig: Readonly<Config>;

export function createHandler(
  configOptions?: Partial<Config>
): (req: IncomingMessage, res: ServerResponse) => Promise<boolean>;

export interface Extensions {
  [key: string]: Array<string>;
}

export interface StatusPages {
  [key: number]: {
    content: string;
    contentType: string;
  };
}

export interface EnvVars {
  [key: string]: string | number | boolean;
}

export interface Config {
  urlPath: string;
  filePath: string;
  extensions: Extensions;
  indexExtension: string;
  debugOutput: boolean;
  logRequests: boolean;
  maxBuffer: number;
  requestChunkSize: number;
  responseChunkSize: number;
  statusPages: StatusPages;
  env: EnvVars | ((env: EnvVars, req: IncomingMessage) => EnvVars);
}
