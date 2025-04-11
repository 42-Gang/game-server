export class HttpException extends Error {
  public readonly statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.name = new.target.name;
    this.statusCode = statusCode;
  }
}

export class BadRequestException extends HttpException {
  constructor(message: string) {
    super(400, message || 'Bad Request');
  }
}

export class UnAuthorizedException extends HttpException {
  constructor(message: string) {
    super(401, message || 'Unauthorized');
  }
}

export class ForbiddenException extends HttpException {
  constructor(message: string) {
    super(403, message || 'Forbidden');
  }
}

export class NotFoundException extends HttpException {
  constructor(message: string) {
    super(404, message || 'Not Found');
  }
}

export class ConflictException extends HttpException {
  constructor(message: string) {
    super(409, message || 'Conflict');
  }
}

export class InternalServerException extends HttpException {
  constructor(message: string) {
    super(500, message || 'Internal Server Error');
  }
}

export class NotImplementedException extends HttpException {
  constructor(message: string) {
    super(501, message || 'Not Implemented');
  }
}
