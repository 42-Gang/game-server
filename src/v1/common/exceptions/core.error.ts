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
    super(400, message || '잘못된 요청');
  }
}

export class UnAuthorizedException extends HttpException {
  constructor(message: string) {
    super(401, message || '권한 없음');
  }
}

export class ForbiddenException extends HttpException {
  constructor(message: string) {
    super(403, message || '금지된 접근');
  }
}

export class NotFoundException extends HttpException {
  constructor(message: string) {
    super(404, message || '찾을 수 없음');
  }
}

export class ConflictException extends HttpException {
  constructor(message: string) {
    super(409, message || '충돌 발생');
  }
}

export class InternalServerException extends HttpException {
  constructor(message: string) {
    super(500, message || '서버 내부 오류');
  }
}

export class NotImplementedException extends HttpException {
  constructor(message: string) {
    super(501, message || '기능 미구현');
  }
}
