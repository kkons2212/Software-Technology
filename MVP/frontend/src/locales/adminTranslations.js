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

  // --- Phase 2: POI & Geofence Catalog ---
  poiCatalogTitle: 'Danh mục Điểm tham quan & Geofence',
  poiCatalogSubtitle: 'Hiện vật lịch sử số hóa, tọa độ thực địa và bán kính kích hoạt thuyết minh tự động.',
  searchPoisPlaceholder: 'Tìm kiếm điểm tham quan theo tên...',
  searchPoisAriaLabel: 'Tìm kiếm điểm tham quan',
  newExhibitButton: '+ Tạo điểm mới',
  loadingExhibits: 'Đang tải danh mục điểm tham quan...',
  noExhibitsFound: 'Chưa có điểm tham quan nào. Nhấn "+ Tạo điểm mới" để số hóa điểm di tích đầu tiên.',
  showingExhibitsCount: 'Hiển thị {count} trên tổng số {total} điểm di tích',

  // POI Table Columns & Badges
  colThumbnail: 'Ảnh đại diện',
  colTitleOverview: 'Tên điểm & Giới thiệu',
  colStatus: 'Trạng thái',
  colTriggerRadius: 'Bán kính kích hoạt',
  colCoordinates: 'Tọa độ (WGS84)',
  colLanguageStatus: 'Trạng thái đa ngôn ngữ AI',
  colActions: 'Thao tác',
  noPhoto: 'Không có ảnh',
  statusActive: 'Hoạt động',
  statusHidden: 'Đã ẩn',
  btnEdit: 'Chỉnh sửa',
  btnHide: 'Ẩn',
  btnShow: 'Hiện',

  // POI Form Modal (Create & Edit)
  createExhibitTitle: 'Tạo hồ sơ điểm tham quan số hóa',
  createExhibitSubtitle: 'Nhập thông tin lịch sử, tọa độ trong ranh giới Củ Chi và tải ảnh bìa đại diện.',
  editExhibitTitle: 'Chỉnh sửa thông tin điểm tham quan & Geofence',
  fieldTitle: 'Tên điểm tham quan (Tiếng Việt) *',
  fieldTitlePlaceholder: 'ví dụ: Bếp Hoàng Cầm, Địa đạo Bến Dược',
  fieldShortDesc: 'Tóm tắt giới thiệu (Hiển thị miễn phí cho khách trước khi mở khóa)',
  fieldShortDescPlaceholder: 'Tóm tắt ngắn gọn hiển thị trên thẻ xem trước bản đồ...',
  fieldFullDesc: 'Bài thuyết minh lịch sử chi tiết (Mở khóa sau khi mua vé)',
  fieldFullDescPlaceholder: 'Toàn bộ nội dung lịch sử dùng để dịch AI và tổng hợp giọng đọc thuyết minh...',
  editNarrativeNotice: 'Lưu ý: Chỉnh sửa nội dung thuyết minh sẽ tự động đánh dấu các bản dịch ngoại ngữ liên kết là "Cần cập nhật".',
  interactiveGeofenceTitle: 'Hiệu chỉnh Geofence tương tác (Kéo ghim & Bán kính: 10m–50m)',
  fieldCoverPhoto: 'Ảnh bìa (JPG, PNG, WebP < 5MB)',
  currentCoverPhoto: 'Ảnh bìa hiện tại',
  btnCancel: 'Hủy',
  btnSaveAndDigitize: 'Lưu & Số hóa',
  btnCreating: 'Đang tạo...',
  btnSaveChanges: 'Lưu thay đổi',
  btnSaving: 'Đang lưu...',
  errorTitleRequired: 'Vui lòng nhập tên điểm tham quan.',
  errorInvalidCoordinates: 'Tọa độ không hợp lệ (Vĩ độ: [-90, 90], Kinh độ: [-180, 180]).',
  errorImageTooLarge: 'Dung lượng ảnh vượt quá giới hạn tối đa 5MB.',
  errorCreatePoiFailed: 'Không thể tạo hồ sơ điểm tham quan.',
  errorUpdatePoiFailed: 'Không thể cập nhật hồ sơ điểm tham quan.',
  errorLoadCatalogFailed: 'Không thể tải danh mục điểm tham quan.',
  successUpdatePoi: 'Cập nhật điểm tham quan thành công!',

  // Deactivate Confirm Modal
  hideExhibitModalTitle: 'Ẩn điểm tham quan khỏi bản đồ du khách',
  reactivateExhibitModalTitle: 'Kích hoạt lại điểm tham quan',
  hideExhibitConfirmDesc:
    'Bạn có chắc chắn muốn ẩn "{title}"? Điểm này sẽ ngay lập tức bị ẩn khỏi bản đồ du khách, không kích hoạt âm thanh tự động và không xuất hiện trên lộ trình tham quan. Toàn bộ bản dịch, file âm thanh và nhật ký viễn trắc vẫn được lưu giữ an toàn trong cơ sở dữ liệu.',
  reactivateExhibitConfirmDesc:
    'Kích hoạt lại "{title}"? Điểm tham quan sẽ lập tức xuất hiện trở lại trên bản đồ du khách và tiếp tục phát thuyết minh tự động khi du khách đến gần.',
  btnConfirmHide: 'Ẩn điểm tham quan',
  btnConfirmReactivate: 'Kích hoạt lại điểm',
  btnProcessing: 'Đang xử lý...',
  successHiddenMsg: 'Đã ẩn điểm tham quan "{title}" khỏi bản đồ du khách.',
  successReactivatedMsg: 'Điểm tham quan "{title}" đã được kích hoạt lại và hiển thị trên bản đồ du khách.',

  // Geofence Calibration Page
  geofenceCalibTitle: 'Căn chỉnh tọa độ Geofence',
  geofenceCalibSubtitle: 'Kéo ghim đến vị trí chính xác của điểm tham quan và căn chỉnh bán kính kích hoạt tự động.',
  selectExhibitPrompt: 'Chọn một điểm tham quan',
  selectExhibitHint: 'Chọn một điểm tham quan để ghim vị trí và căn chỉnh bán kính Geofence.',
  labelExhibitSelect: 'Điểm tham quan',
  geofenceSavedSuccess: 'Đã lưu căn chỉnh Geofence.',
  geofenceSaveError: 'Không thể lưu thay đổi vào lúc này.',
  geofenceLoadError: 'Không thể tải danh sách điểm tham quan vào lúc này.',

  // Admin Map Picker
  latitude: 'Vĩ độ (WGS84) *',
  longitude: 'Kinh độ (WGS84) *',
  triggerRadius: 'Bán kính kích hoạt Geofence',
  radiusRangeHint: 'Bán kính kích hoạt (10m – 50m)',
  invalidCharCoordError: 'Tọa độ không hợp lệ: Vui lòng chỉ nhập số thực (ví dụ: 11.1432), không được nhập chữ cái hoặc ký tự đặc biệt.',
  invalidRadiusError: 'Bán kính kích hoạt không hợp lệ (vui lòng chỉ nhập số nguyên từ 10m đến 50m, không nhập số thập phân).',
  outOfBoundsError: 'Cảnh báo: Tọa độ không hợp lệ (Vĩ độ: [-90, 90], Kinh độ: [-180, 180]).',
};
