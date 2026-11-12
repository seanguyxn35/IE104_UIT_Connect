// Lỗi nghiệp vụ có chủ đích: mang sẵn mã HTTP và mã lỗi trả cho giao diện.
// Bộ xử lý lỗi trong server.js chuyển lỗi này thành { code, message }.
export class AppError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}
