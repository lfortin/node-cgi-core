"use strict";
// Copyright (c) 2024-2025 lfortin
//
// Permission is hereby granted, free of charge, to any person obtaining
// a copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to
// permit persons to whom the Software is furnished to do so, subject to
// the following conditions:
//
// The above copyright notice and this permission notice shall be
// included in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
// EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
// NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
// LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
// OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
// WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

Object.defineProperty(exports, "__esModule", { value: true });

// --- URL and Path Related Constants ---
const DEFAULT_URL_BASE = "http://example.com";
const FILE_PATH_SPLIT_REGEX = /(?<=\.[a-zA-Z]+)(\/)/;
const SANITIZE_PATH_REGEX = /(\.\.)+|[\r\n\x00-\x1F\x7F]/g;

// --- CGI Environment Variables Related Constants ---
const GATEWAY_INTERFACE = "CGI/1.1";
const PATH_INFO_SPLIT_REGEX = /(?<=\.[a-zA-Z]+)(\/)/;

// --- Request and Response Handling Constants ---
const HEADER_BODY_SEPARATOR_LF = Buffer.from([0x0a, 0x0a]); // "\n\n"
const HEADER_BODY_SEPARATOR_CRLF = Buffer.from([0x0d, 0x0a, 0x0d, 0x0a]); // "\r\n\r\n"

// --- Logging Constants ---
const REQUEST_LOG_MAX_SIZE = 1000;

// --- Configuration Constants ---
const IS_WINDOWS = process.platform === "win32";

const DEFAULT_EXTENSIONS_WIN = {
  perl: ["pl", "cgi"],
  python: ["py"],
  node: ["js", "node"],
};

const DEFAULT_EXTENSIONS_POSIX = {
  "/usr/bin/perl": ["pl", "cgi"],
  "/usr/bin/python": ["py"],
  "/usr/local/bin/node": ["js", "node"],
};

const DEFAULT_EXTENSIONS = IS_WINDOWS
  ? DEFAULT_EXTENSIONS_WIN
  : DEFAULT_EXTENSIONS_POSIX;

const DEFAULT_CONFIG = {
  urlPath: "/cgi-bin",
  filePath: process.cwd(),
  extensions: DEFAULT_EXTENSIONS,
  indexExtension: "js",
  debugOutput: false,
  logRequests: false,
  maxBuffer: 2 * 1024 ** 2,
  requestChunkSize: 32 * 1024,
  responseChunkSize: 32 * 1024,
  requestTimeout: 30000,
  forceKillDelay: 1000,
  requireExecBit: false,
  statusPages: {},
  env: {},
};

const NUMERIC_CONFIG_KEYS = [
  "maxBuffer",
  "requestChunkSize",
  "responseChunkSize",
  "requestTimeout",
  "forceKillDelay",
];

module.exports = {
  DEFAULT_URL_BASE,
  FILE_PATH_SPLIT_REGEX,
  SANITIZE_PATH_REGEX,
  GATEWAY_INTERFACE,
  PATH_INFO_SPLIT_REGEX,
  HEADER_BODY_SEPARATOR_LF,
  HEADER_BODY_SEPARATOR_CRLF,
  REQUEST_LOG_MAX_SIZE,
  IS_WINDOWS,
  DEFAULT_EXTENSIONS,
  DEFAULT_CONFIG,
  NUMERIC_CONFIG_KEYS,
};
