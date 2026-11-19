/**
 * UI Localization Dictionary for Admin Portal (Phase 1 to Phase 6)
 * Standardized Vietnamese strings for all Admin views, components, modals, and test suites.
 */

export const ADMIN_TRANSLATIONS = {
  // Navigation & Header
  verifyingSession: 'Đang xác thực phiên làm việc quản trị viên...',
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
  closeModal: 'Đóng cửa sổ',
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

  // --- Phase 3: Multilingual Translation Audit & Audio Publishing ---
  translationAuditTitle: 'Kiểm duyệt Dịch thuật & Hiệu chỉnh Thuật ngữ Lịch sử',
  translationAuditSubtitle:
    'So sánh bản dịch ngoại ngữ đối chiếu tiếng Việt gốc, nghe thử thuyết minh và tạo lại âm thanh để đảm bảo đồng bộ hoàn hảo.',
  filterPoiLabel: '1. Điểm tham quan (POI)',
  filterPoiAll: 'Tất cả điểm tham quan (POIs)',
  filterLanguageLabel: '2. Ngôn ngữ mục tiêu',
  filterLanguageAll: 'Tất cả ngôn ngữ mục tiêu',
  filterStatusLabel: '3. Trạng thái kiểm duyệt',
  statusAllReview: 'Tất cả trạng thái kiểm duyệt',
  statusDraft: 'Bản nháp',
  statusNeedsUpdate: 'Cần cập nhật âm thanh',
  statusPublished: 'Đã xuất bản',
  statusPending: 'Chờ xử lý',
  statusAudioInSync: 'Đã đồng bộ âm thanh',
  statusAudioFailed: 'Tạo âm thanh thất bại',
  loadingTranslations: 'Đang tải danh sách bản dịch kiểm duyệt...',
  noTranslationsFound: 'Không có bản dịch nào khớp với tiêu chí lựa chọn.',
  failedLoadTranslations: 'Không thể tải danh sách bản dịch kiểm duyệt.',
  colSourceVietnamese: 'Bản gốc (Tiếng Việt)',
  colTargetLanguage: 'Bản dịch ({lang})',
  colReadOnly: 'Chỉ đọc',
  colUnsavedEdits: 'Thay đổi chưa lưu',
  fieldTranslatedTitle: 'Tiêu đề bản dịch',
  fieldSummaryShortDesc: 'Tóm tắt (Mô tả ngắn)',
  fieldDetailedNarration: 'Thuyết minh lịch sử chi tiết',
  fieldSourceTitle: 'Tiêu đề',
  fieldSourceShortDesc: 'Tóm tắt (Mô tả ngắn)',
  fieldSourceDetailedNarration: 'Thuyết minh chi tiết',
  btnSaveDraft: 'Lưu bản nháp',
  btnSavingDraft: 'Đang lưu...',
  btnApproveAndPublish: 'Phê duyệt & Xuất bản',
  btnPublishing: 'Đang xuất bản...',
  btnPublishLocked: '🔒 Khóa xuất bản',
  tooltipPublishLocked:
    'Khóa xuất bản: File âm thanh thuyết minh cần được tạo lại sau khi chỉnh sửa văn bản.',
  tooltipPublishLive: 'Phê duyệt và xuất bản bản dịch cho du khách',
  publishLockIndicator: 'Khóa xuất bản',
  publishLockIndicatorTooltip: 'Khóa xuất bản cho đến khi file âm thanh được tạo lại',
  btnRegenerateAudio: 'Tạo lại âm thanh',
  btnGeneratingAudio: 'Đang tạo âm thanh...',
  audioMissingMessage: 'Chưa tạo file âm thanh thuyết minh.',
  audioPlayPreview: 'Nghe thử âm thanh',
  audioPausePreview: 'Tạm dừng âm thanh',
  audioProgress: 'Tiến trình âm thanh',
  audioUnableToPlay: 'Không thể phát file âm thanh này.',
  audioUnableToLoad: 'Không thể tải file âm thanh này.',
  audioRegenerateError: 'Không thể tạo âm thanh thuyết minh, vui lòng thử lại sau.',
  notificationSavedDraft: "Đã lưu '{title}'. Trạng thái cập nhật thành 'Cần cập nhật âm thanh'.",
  notificationRegeneratedSuccess:
    'Tạo lại âm thanh thuyết minh thành công. Bản dịch đã sẵn sàng kiểm duyệt.',
  notificationPublishedSuccess:
    "Đã xuất bản '{title}' thành công. Đang hiển thị trực tiếp cho du khách.",
  notificationSaveError: 'Không thể lưu bản dịch.',
  notificationPublishError: 'Không thể xuất bản bản dịch.',

  // --- Phase 4: Analytics Dashboard & Visitor Heatmap ---
  analyticsTitle: 'Thống kê Du khách & Hiệu quả Trưng bày',
  analyticsSubtitle:
    'Chỉ số KPI tổng hợp, bảng xếp hạng 10 điểm nổi bật, thời lượng tham quan trung bình, bản đồ nhiệt mật độ không gian, xuất báo cáo và cơ cấu ngôn ngữ.',
  reportingPeriodAriaLabel: 'Khoảng thời gian báo cáo',
  rangeToday: 'Hôm nay',
  rangeLast7Days: '7 ngày qua',
  rangeLast30Days: '30 ngày qua',
  loadingAnalytics: 'Đang tải dữ liệu thống kê du khách...',
  loadAnalyticsError:
    'Không thể tải dữ liệu thống kê du khách. Vui lòng kiểm tra kết nối và thử lại.',
  btnRetry: 'Thử lại',
  kpiTotalVisitors: 'Tổng lượt du khách',
  kpiTotalAudioPlays: 'Lượt phát thuyết minh',
  kpiTopExhibit: 'Điểm tham quan hàng đầu',
  kpiAverageTourDuration: 'Thời lượng tour trung bình',
  unitMinutes: 'phút',
  topExhibitsHeading: 'Top 10 Điểm tham quan theo Lượt kích hoạt',
  noExhibitsTriggers: 'Chưa có lượt kích hoạt nào được ghi nhận trong khoảng thời gian này.',
  languageDistributionHeading: 'Cơ cấu Ngôn ngữ Du khách',
  noLanguageRecorded: 'Chưa có dữ liệu ngôn ngữ du khách trong khoảng thời gian này.',

  // Analytics Heatmap
  heatmapTitle: 'Bản đồ nhiệt Mật độ Du khách Thời gian thực',
  liveTelemetryBadge: 'Viễn trắc Trực tiếp',
  heatmapSubtitle: 'Giám sát cảnh báo ùn tắc không gian trong toàn bộ khu di tích Địa đạo Củ Chi.',
  heatmapReportingWindowAriaLabel: 'Khoảng thời gian bản đồ nhiệt',
  congestionAlertTitle: 'Cảnh báo ùn tắc:',
  congestionAlertDescription:
    'Mật độ du khách cao tại {poi} ({count} lượt kích hoạt, {density}% mật độ tương đối). Cân nhắc điều phối nhân viên hướng dẫn để phân luồng du khách.',
  heatmapCanvasAriaLabel: 'Bản đồ nhiệt mật độ du khách',
  loadingHeatmapTelemetry: 'Đang tổng hợp dữ liệu GPS viễn trắc...',
  loadHeatmapError: 'Không thể tải dữ liệu bản đồ nhiệt. Vui lòng kiểm tra kết nối và thử lại.',
  heatmapEmptyState:
    'Chưa có lượt kích hoạt điểm nào trong khoảng thời gian này. Bản đồ nhiệt sẽ hiển thị khi có du khách tham quan.',
  densityScale: 'Thang đo Mật độ',
  densityLow: 'Thấp (0 - 40%)',
  densityModerate: 'Vừa phải (40 - 70%)',
  densityCongestion: 'Ùn tắc (> 70%)',
  densityZero: 'Chưa có khách (0)',
  heatRadiusLabel: 'Bán kính nhiệt:',
  blurOpacityLabel: 'Độ mờ tản:',
  totalExhibitsMonitored: 'Tổng số điểm giám sát:',

  // --- Phase 5: System Health & Storage Monitoring ---
  healthTitle: 'Tình trạng Hệ thống & Giám sát Bộ nhớ',
  healthSubtitle:
    'Viễn trắc máy chủ thời gian thực, cảnh báo ngưỡng dung lượng cache (85%/95%) và dọn dẹp file âm thanh & hình ảnh dư.',
  btnRefreshTelemetry: 'Làm mới viễn trắc',
  btnRefreshingTelemetry: 'Đang làm mới...',
  btnCleanOrphanedAudio: 'Dọn dẹp tệp rác (Audio & Ảnh)',
  btnDismiss: 'Bỏ qua',
  loadHealthError: 'Không thể tải dữ liệu viễn trắc hệ thống.',
  cleanSuccessToast:
    'Dọn dẹp thành công {count} tệp rác (giải phóng {mb} MB).',
  dbConnectivityHeading: 'Kết nối Cơ sở dữ liệu Quan hệ',
  mySqlDatabase: 'Cơ sở dữ liệu MySQL',
  pingRoundtripLatency: 'Độ trễ Ping Khứ hồi:',
  dbStatusConnected: 'Đã kết nối',
  dbStatusDisconnected: 'Mất kết nối',
  externalServicesHeading: 'Tích hợp Dịch vụ Bên ngoài',
  statusOperational: 'Hoạt động bình thường',
  servicesNeuralTTSAndPayment: 'Giọng đọc AI & Cổng thanh toán',
  apiServerState: 'Trạng thái Máy chủ API:',

  // Storage Health Banner
  alertWarningTitle: 'Cảnh báo:',
  alertCriticalTitle: 'Cảnh báo nguy cấp:',
  storageWarningMsg:
    'Dung lượng bộ nhớ đệm đã vượt quá 85%. Vui lòng dọn dẹp các tệp rác dư thừa.',
  storageCriticalMsg:
    'Dung lượng bộ nhớ đệm đã vượt quá 95%. Vui lòng dọn dẹp các tệp rác trước khi tạo audio mới hoặc tải ảnh lên.',
  audioCacheDiskUsage: 'Dung lượng Ổ đĩa Cache Âm thanh & Media',
  audioCacheProgressAriaLabel: 'Dung lượng sử dụng ổ đĩa cache âm thanh và media',
  labelUsed: 'Đã dùng: {used}',
  labelTotal: 'Tổng: {total}',
  labelFreeSpace: 'Còn trống',
  labelAudioCacheSize: 'Dung lượng Cache Audio',
  labelAudioCacheFiles: 'Số file Cache Audio',
  filesUnit: 'file',
  labelThresholdAlert: 'Mức cảnh báo ngưỡng',
  thresholdCritical: 'Nguy cấp (≥95%)',
  thresholdWarning: 'Cảnh báo (≥85%)',
  thresholdHealthy: 'Bình thường (<85%)',

  // Clean Orphans Modal
  cleanOrphansModalTitle: 'Dọn dẹp tệp rác mồ côi (Audio & Ảnh)',
  cleanOrphansModalDesc:
    'Thao tác này quét dung lượng ổ đĩa tại /static/audio và /static/images, xác định toàn bộ các file MP3 và hình ảnh bìa không còn liên kết với bất kỳ điểm tham quan hoặc bản dịch nào và xóa vĩnh viễn để giải phóng bộ nhớ.',
  btnConfirmPrune: 'Xác nhận & Dọn dẹp',
  btnCleaningPrune: 'Đang dọn dẹp...',
  cleanOrphansError: 'Không thể dọn dẹp các file âm thanh dư.',
};
