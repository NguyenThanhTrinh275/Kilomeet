/** Lỗi nghiệp vụ: `message` (tiếng Việt) được FE hiện thẳng lên toast. */
export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const badRequest = (msg: string) => new AppError(400, msg);
export const unauthorized = (msg = 'Vui lòng đăng nhập lại') => new AppError(401, msg);
export const forbidden = (msg = 'Bạn không có quyền thực hiện thao tác này') => new AppError(403, msg);
export const notFound = (msg = 'Không tìm thấy dữ liệu') => new AppError(404, msg);
export const conflict = (msg: string) => new AppError(409, msg);
