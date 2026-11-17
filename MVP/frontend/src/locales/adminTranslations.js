/**
 * UI Localization Dictionary for Admin Portal (Phase 1 to Phase 6)
 * Standardized Vietnamese strings for all Admin views, components, modals, and test suites.
 */

export const ADMIN_TRANSLATIONS = {
  // Navigation & Header
  brandTitle: 'Địa đạo Củ Chi',
  brandSubtitle: 'Quản trị',
  defaultAdminName: 'Quản trị viên',
  signOut: 'Đăng xuất',
  navAriaLabel: 'Điều hướng quản trị',

  // Navigation Links
  navPois: 'Điểm tham quan & Geofence',
  navTranslations: 'Dịch thuật & Thuyết minh',
  navAnalytics: 'Thống kê & Bản đồ nhiệt',
  navHealth: 'Tình trạng hệ thống',

  // Admin Login View
  loginTitle: 'Đăng nhập Quản trị viên',
  loginSubtitle: 'Quản lý hiện vật, thuyết minh đa ngôn ngữ và dữ liệu viễn trắc.',
  usernameOrEmail: 'Tên đăng nhập hoặc Email',
  password: 'Mật khẩu',
  signIn: 'Đăng nhập',
  signingIn: 'Đang đăng nhập...',
  accountLocked: 'Tài khoản đã bị khóa',
  usernameRequired: 'Vui lòng nhập tên đăng nhập hoặc email.',
  passwordRequired: 'Vui lòng nhập mật khẩu.',
  invalidCredentials: 'Tên đăng nhập hoặc mật khẩu không chính xác.',
  genericSignInError: 'Không thể đăng nhập vào lúc này. Vui lòng thử lại sau.',
  idleTimeoutNotice: 'Phiên làm việc đã hết hạn sau 30 phút không hoạt động. Vui lòng đăng nhập lại.',

  // Account Lockout Modal
  lockoutTitle: 'Tài khoản bị tạm khóa',
  lockoutDescription:
    'Phát hiện quá nhiều lần đăng nhập không thành công liên tiếp (giới hạn 5 lần). Để bảo vệ an toàn hệ thống khỏi tấn công brute-force, tài khoản này đã bị tạm khóa trong 15 phút.',
  lockoutCountdownLabel: 'Thời gian còn lại đến khi mở khóa',
  lockoutFooterNote:
    'Biểu mẫu đăng nhập đã bị khóa. Vui lòng chờ hết thời gian đếm ngược trước khi thử lại.',
  dismissNotice: 'Bỏ qua thông báo',
};
