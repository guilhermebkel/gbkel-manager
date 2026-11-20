export class InvalidAliasError extends Error {
  constructor(message: string, from?: string) {
    super(from === undefined ? message : `${from}: ${message}`);
    this.name = "InvalidAliasError";
  }
}
