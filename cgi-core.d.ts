import { IncomingMessage, ServerResponse } from "node:http";

export const defaultExtensions: Readonly<Extensions>;
export const defaultConfig: Readonly<Config>;

export interface Handler {
  (req: IncomingMessage, res: ServerResponse): Promise<boolean>;
}

export function createHandler(configOptions?: Partial<Config>): Handler;

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

export interface EnvUpdaterFunction {
  (env: EnvVars, req: IncomingMessage): EnvVars;
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
  requestTimeout: number;
  forceKillDelay: number;
  requireExecBit: boolean;
  statusPages: StatusPages;
  env: EnvVars | EnvUpdaterFunction;
}
