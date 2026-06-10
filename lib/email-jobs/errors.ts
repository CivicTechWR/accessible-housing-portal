/**
 * Thrown by a job handler when a job should stop without sending and without
 * retrying, e.g. because the underlying entity was accepted, superseded, or
 * expired. The job ends up canceled, not failed.
 */
export class EmailJobCanceledError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EmailJobCanceledError";
  }
}
