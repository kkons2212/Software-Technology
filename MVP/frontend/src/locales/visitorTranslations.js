/**
 * UI Localization Dictionary for Visitor Web App (US 01.1 & US 04.4)
 * Provides comprehensive translations for all visitor buttons, labels, and modals.
 * Admin Portal remains 100% Vietnamese.
 */

export const VISITOR_TRANSLATIONS = {
  vi: {
    // Header
    brandTitle: 'Cu Chi Tunnels',
    brandSubtitle: 'Thuyết minh âm thanh thông minh',
    chooseLanguage: 'Chọn ngôn ngữ',
    noLanguages: 'Không có ngôn ngữ khả dụng',
    restorePass: 'Khôi phục',
    restorePassTitle: 'Khôi phục phiên đã mua',
    unlockAudio: 'Mở khóa',
    clearSession: 'Đặt lại phiên',
    sessionRemaining: 'còn lại',

    // POI Preview Card & Directions
    directions: 'Chỉ đường',
    clearRoute: 'Hủy lộ trình',
    playNarration: 'Nghe thuyết minh',
    replay: 'Nghe lại',
    distanceUnavailable: 'Không xác định khoảng cách',
    distanceKmAway: '{dist} km',
    distanceMAway: '{dist} m',
    closeExhibitPreview: 'Đóng xem trước điểm tham quan',
    noPreviewSummary: 'Chưa có mô tả tóm tắt.',

    // Paywall Gate
    unlockFullStory: 'Mở khóa toàn bộ',
    paywallTeaserInstruction: '📍 Đến gần điểm (≤15m) để kích hoạt thuyết minh đầy đủ',
    paywallPreviewDefault: 'Bản xem trước tóm tắt lịch sử...',
    noDescriptionAvailable: 'Chưa có mô tả.',

    // Checkout Modal
    serviceTitle: 'Dịch vụ Thuyết minh Âm thanh Đa ngôn ngữ',
    serviceSubtitle: 'Gói trải nghiệm 24 giờ không giới hạn',
    serviceFee24h: 'Phí dịch vụ 24h:',
    perDevice: '/ thiết bị',
    tabVietQR: 'VietQR Napas247',
    tabCard: 'Thẻ quốc tế',
    cardGatewayTitle: 'Cổng thanh toán thẻ quốc tế',
    cardGatewayDesc: 'Hỗ trợ tài khoản PayPal và thẻ quốc tế Visa, Mastercard qua cổng bảo mật PayPal Sandbox.',
    continueWithPayPal: 'Tiếp tục thanh toán qua PayPal Sandbox ({amount} đ)',
    simulatePayPalPayment: 'Thanh toán qua PayPal Sandbox ({amount} đ)',
    waitingPaymentConfirm: 'Đang chờ hệ thống xác nhận chuyển khoản tự động...',
    checkingPaymentStatus: 'Đang kiểm tra trạng thái thanh toán...',
    accountNumber: 'Số tài khoản',
    bank: 'Ngân hàng',
    accountHolder: 'Chủ tài khoản',
    transferContent: 'Nội dung CK',
    copy: 'Sao chép',
    copied: 'Đã chép',
    alreadyPurchasedPrompt: 'Đã mua vé trước đó? Nhập mã phiên để khôi phục',
    closeCheckout: 'Đóng cửa sổ thanh toán',
    vietqrAlt: 'VietQR thanh toán dịch vụ thuyết minh',
    simulateSuccessBtn: 'Giả lập thanh toán',

    // Checkout Success Screen
    activationSuccessTitle: 'Kích hoạt thành công!',
    activationSuccessSubtitle: 'Gói thuyết minh âm thanh 24 giờ của bạn đã sẵn sàng.',
    sessionCodeLabel: 'Mã phiên:',
    validUntilLabel: 'Thời hạn đến:',
    startListeningBtn: 'Bắt đầu nghe thuyết minh ngay',

    // Restore Session Modal
    restoreModalTitle: 'Khôi phục quyền truy cập',
    restoreModalSubtitle: 'Nhập mã phiên để tiếp tục sử dụng audio guide',
    sessionCodeInputLabel: 'Mã phiên (6-8 ký tự):',
    sessionCodePlaceholder: 'CCT-XXXXXX',
    restoreSessionBtn: 'Khôi phục phiên',
    checkingStatusBtn: 'Đang kiểm tra...',
    invalidSessionCodeError: 'Mã phiên không hợp lệ hoặc đã hết hạn. Vui lòng kiểm tra lại.',
    restoreSuccessTitle: 'Khôi phục thành công!',
    restoreSuccessSubtitle: 'Chào mừng bạn quay lại! Phiên đã được khôi phục trên thiết bị này.',
    closeBtn: 'Đóng',

    // Map & Navigation
    navigatingTo: 'Chỉ đường đến: {name}',
    gpsLocating: 'Đang định vị GPS...',

    // Mini Audio Player
    audioPlaying: 'Đang phát thuyết minh...',
    audioPaused: 'Đã tạm dừng',
    audioLoading: 'Đang tải âm thanh...',
    audioNotAvailable: 'Chưa có file âm thanh cho ngôn ngữ này.',
    replayAudio: 'Nghe lại',
    pauseAudio: 'Tạm dừng',
    playAudio: 'Phát âm thanh',

    // Error banners
    errorLanguages: 'Không thể tải danh sách ngôn ngữ.',
    errorPois: 'Không thể tải dữ liệu điểm tham quan. Kiểm tra kết nối và thử lại.',
    retry: 'Thử lại',
  },
  en: {
    // Header
    brandTitle: 'Cu Chi Tunnels',
    brandSubtitle: 'Smart audio guide',
    chooseLanguage: 'Choose language',
    noLanguages: 'No languages available',
    restorePass: 'Restore',
    restorePassTitle: 'Restore purchased session',
    unlockAudio: 'Unlock audio',
    clearSession: 'Reset session',
    sessionRemaining: 'remaining',

    // POI Preview Card & Directions
    directions: 'Directions',
    clearRoute: 'Clear Route',
    playNarration: 'Play Narration',
    replay: 'Replay',
    distanceUnavailable: 'Distance unavailable',
    distanceKmAway: '{dist} km away',
    distanceMAway: '{dist} m away',
    closeExhibitPreview: 'Close exhibit preview',
    noPreviewSummary: 'No preview summary available.',

    // Paywall Gate
    unlockFullStory: 'Unlock Full Story',
    paywallTeaserInstruction: '📍 Move within range (≤15m) to activate full narration',
    paywallPreviewDefault: 'Historical chronicle preview...',
    noDescriptionAvailable: 'No description available.',

    // Checkout Modal
    serviceTitle: 'Smart Multilingual Audio Guide Service',
    serviceSubtitle: 'Unlimited 24-hour exploration pass',
    serviceFee24h: '24h Service fee:',
    perDevice: '/ device',
    tabVietQR: 'VietQR Napas247',
    tabCard: 'International Card',
    cardGatewayTitle: 'International Card & PayPal Checkout',
    cardGatewayDesc: 'Secure international payment via PayPal Sandbox and Visa, Mastercard credit/debit cards.',
    continueWithPayPal: 'Continue with PayPal Sandbox ({amount} VND)',
    simulatePayPalPayment: 'Simulate PayPal Sandbox Payment ({amount} VND)',
    waitingPaymentConfirm: 'Waiting for automatic payment confirmation...',
    checkingPaymentStatus: 'Checking payment status...',
    accountNumber: 'Account Number',
    bank: 'Bank',
    accountHolder: 'Account Holder',
    transferContent: 'Transfer Reference',
    copy: 'Copy',
    copied: 'Copied',
    alreadyPurchasedPrompt: 'Already purchased a pass? Enter session code to restore',
    closeCheckout: 'Close checkout dialog',
    vietqrAlt: 'VietQR payment for smart audio guide',
    simulateSuccessBtn: 'Simulate Payment',

    // Checkout Success Screen
    activationSuccessTitle: 'Activation Successful!',
    activationSuccessSubtitle: 'Your 24-hour audio guide pass is ready to use.',
    sessionCodeLabel: 'Session Code:',
    validUntilLabel: 'Valid until:',
    startListeningBtn: 'Start Listening Now',

    // Restore Session Modal
    restoreModalTitle: 'Restore Access Pass',
    restoreModalSubtitle: 'Enter your session code to continue using the audio guide',
    sessionCodeInputLabel: 'Session code (6-8 chars):',
    sessionCodePlaceholder: 'CCT-XXXXXX',
    restoreSessionBtn: 'Restore Session',
    checkingStatusBtn: 'Checking...',
    invalidSessionCodeError: 'Invalid or expired session code. Please verify and try again.',
    restoreSuccessTitle: 'Session Restored!',
    restoreSuccessSubtitle: 'Welcome back! Your 24-hour pass has been restored on this device.',
    closeBtn: 'Close',

    // Map & Navigation
    navigatingTo: 'Navigating to: {name}',
    gpsLocating: 'Locating GPS position...',

    // Mini Audio Player
    audioPlaying: 'Playing narration...',
    audioPaused: 'Paused',
    audioLoading: 'Loading audio...',
    audioNotAvailable: 'Audio narration is not available for this language yet.',
    replayAudio: 'Replay',
    pauseAudio: 'Pause',
    playAudio: 'Play Narration',

    // Error banners
    errorLanguages: 'Unable to load available languages.',
    errorPois: 'Unable to load map locations. Check your connection and try again.',
    retry: 'Retry',
  },
  ja: {
    // Header
    brandTitle: 'クチの地下道',
    brandSubtitle: 'スマート音声ガイド',
    chooseLanguage: '言語を選択',
    noLanguages: '利用可能な言語がありません',
    restorePass: '復元',
    restorePassTitle: '購入したセッションを復元',
    unlockAudio: '音声をロック解除',
    clearSession: 'セッションをリセット',
    sessionRemaining: '残り',

    // POI Preview Card & Directions
    directions: 'ルート案内',
    clearRoute: 'ルート解除',
    playNarration: '音声を再生',
    replay: 'もう一度再生',
    distanceUnavailable: '距離不明',
    distanceKmAway: '{dist} km',
    distanceMAway: '{dist} m',
    closeExhibitPreview: 'プレビューを閉じる',
    noPreviewSummary: '要約はありません。',

    // Paywall Gate
    unlockFullStory: '全文をロック解除',
    paywallTeaserInstruction: '📍 音声ガイドを有効にするには15m以内に近づいてください',
    paywallPreviewDefault: '歴史概要プレビュー...',
    noDescriptionAvailable: '説明はありません。',

    // Checkout Modal
    serviceTitle: '多言語スマート音声ガイドサービス',
    serviceSubtitle: '24時間無制限体験パス',
    serviceFee24h: '24時間利用料金:',
    perDevice: '/ 端末',
    tabVietQR: 'VietQR Napas247',
    tabCard: '国際カード / PayPal',
    cardGatewayTitle: '国際カード＆PayPal決済',
    cardGatewayDesc: 'PayPal Sandbox、Visa、Mastercardによる安全な国際決済。',
    continueWithPayPal: 'PayPal Sandboxで支払う ({amount} VND)',
    simulatePayPalPayment: 'PayPal Sandboxシミュレーション ({amount} VND)',
    waitingPaymentConfirm: '自動支払い確認を待機中...',
    checkingPaymentStatus: '支払い状況を確認中...',
    accountNumber: '口座番号',
    bank: '銀行',
    accountHolder: '口座名義',
    transferContent: '振込内容',
    copy: 'コピー',
    copied: 'コピー完了',
    alreadyPurchasedPrompt: '購入済みですか？ セッションコードを入力して復元',
    closeCheckout: '決済画面を閉じる',
    vietqrAlt: '音声ガイド決済用VietQR',
    simulateSuccessBtn: '支払いをシミュレート',

    // Checkout Success Screen
    activationSuccessTitle: '有効化が完了しました！',
    activationSuccessSubtitle: '24時間音声ガイドパスのご利用準備が整いました。',
    sessionCodeLabel: 'セッションコード:',
    validUntilLabel: '有効期限:',
    startListeningBtn: '音声ガイドを聞き始める',

    // Restore Session Modal
    restoreModalTitle: 'アクセス権の復元',
    restoreModalSubtitle: '音声ガイドを引き続き利用するにはセッションコードを入力してください',
    sessionCodeInputLabel: 'セッションコード:',
    sessionCodePlaceholder: 'CCT-XXXXXX',
    restoreSessionBtn: 'セッションを復元',
    checkingStatusBtn: '確認中...',
    invalidSessionCodeError: 'セッションコードが無効または期限切れです。',
    restoreSuccessTitle: '復元が完了しました！',
    restoreSuccessSubtitle: 'おかえりなさい！ この端末でパスが復元されました。',
    closeBtn: '閉じる',

    // Map & Navigation
    navigatingTo: '目的地へのルート: {name}',
    gpsLocating: 'GPS位置情報を取得中...',

    // Mini Audio Player
    audioPlaying: '音声を再生中...',
    audioPaused: '一時停止',
    audioLoading: '音声を読み込み中...',
    audioNotAvailable: 'この言語の音声ファイルはまだありません。',
    replayAudio: 'もう一度再生',
    pauseAudio: '一時停止',
    playAudio: '音声を再生',

    // Error banners
    errorLanguages: '言語リストを読み込めませんでした。',
    errorPois: '地点データを読み込めませんでした。接続を確認して再試行してください。',
    retry: '再試行',
  },
  ko: {
    // Header
    brandTitle: '구찌 터널',
    brandSubtitle: '스마트 오디오 가이드',
    chooseLanguage: '언어 선택',
    noLanguages: '사용 가능한 언어 없음',
    restorePass: '복원',
    restorePassTitle: '구매한 세션 복원',
    unlockAudio: '오디오 잠금 해제',
    clearSession: '세션 초기화',
    sessionRemaining: '남음',

    // POI Preview Card & Directions
    directions: '길찾기',
    clearRoute: '경로 취소',
    playNarration: '해설 듣기',
    replay: '다시 듣기',
    distanceUnavailable: '거리 정보 없음',
    distanceKmAway: '{dist} km',
    distanceMAway: '{dist} m',
    closeExhibitPreview: '미리보기 닫기',
    noPreviewSummary: '요약 설명이 없습니다.',

    // Paywall Gate
    unlockFullStory: '전체 내용 잠금 해제',
    paywallTeaserInstruction: '📍 전체 해설을 활성화하려면 15m 이내로 이동하세요',
    paywallPreviewDefault: '역사 미리보기...',
    noDescriptionAvailable: '설명이 없습니다.',

    // Checkout Modal
    serviceTitle: '스마트 다국어 오디오 가이드 서비스',
    serviceSubtitle: '24시간 무제한 체험 패스',
    serviceFee24h: '24시간 이용료:',
    perDevice: '/ 기기',
    tabVietQR: 'VietQR Napas247',
    tabCard: '해외 카드 / PayPal',
    cardGatewayTitle: '해외 카드 및 PayPal 결제',
    cardGatewayDesc: 'PayPal Sandbox 및 Visa, Mastercard를 통한 안전한 결제 지원.',
    continueWithPayPal: 'PayPal Sandbox로 결제 ({amount} VND)',
    simulatePayPalPayment: 'PayPal Sandbox 결제 시뮬레이션 ({amount} VND)',
    waitingPaymentConfirm: '자동 결제 확인 대기 중...',
    checkingPaymentStatus: '결제 상태 확인 중...',
    accountNumber: '계좌 번호',
    bank: '은행',
    accountHolder: '예금주',
    transferContent: '입금 메모',
    copy: '복사',
    copied: '복사됨',
    alreadyPurchasedPrompt: '이미 구매하셨나요? 세션 코드를 입력하여 복원',
    closeCheckout: '결제 창 닫기',
    vietqrAlt: '오디오 가이드 결제 VietQR',
    simulateSuccessBtn: '결제 시뮬레이션',

    // Checkout Success Screen
    activationSuccessTitle: '활성화 성공!',
    activationSuccessSubtitle: '24시간 오디오 가이드 패스가 준비되었습니다.',
    sessionCodeLabel: '세션 코드:',
    validUntilLabel: '유효 기간:',
    startListeningBtn: '지금 오디오 가이드 듣기',

    // Restore Session Modal
    restoreModalTitle: '이용 권한 복원',
    restoreModalSubtitle: '오디오 가이드를 계속 사용하려면 세션 코드를 입력하세요',
    sessionCodeInputLabel: '세션 코드:',
    sessionCodePlaceholder: 'CCT-XXXXXX',
    restoreSessionBtn: '세션 복원',
    checkingStatusBtn: '확인 중...',
    invalidSessionCodeError: '유효하지 않거나 만료된 세션 코드입니다.',
    restoreSuccessTitle: '복원 완료!',
    restoreSuccessSubtitle: '다시 오신 것을 환영합니다! 이 기기에서 패스가 복원되었습니다.',
    closeBtn: '닫기',

    // Map & Navigation
    navigatingTo: '길찾기 대상: {name}',
    gpsLocating: 'GPS 위치 수신 중...',

    // Mini Audio Player
    audioPlaying: '해설 재생 중...',
    audioPaused: '일시정지됨',
    audioLoading: '오디오 불러오는 중...',
    audioNotAvailable: '이 언어의 오디오 파일이 아직 없습니다.',
    replayAudio: '다시 듣기',
    pauseAudio: '일시정지',
    playAudio: '오디오 재생',

    // Error banners
    errorLanguages: '언어 목록을 불러올 수 없습니다.',
    errorPois: '지점 정보를 불러올 수 없습니다. 연결 상태를 확인하고 다시 시도하세요.',
    retry: '다시 시도',
  },
  fr: {
    // Header
    brandTitle: 'Tunnels de Cu Chi',
    brandSubtitle: 'Audioguide intelligent',
    chooseLanguage: 'Choisir la langue',
    noLanguages: 'Aucune langue disponible',
    restorePass: 'Restaurer',
    restorePassTitle: 'Restaurer la session achetée',
    unlockAudio: 'Débloquer',
    clearSession: 'Réinitialiser la session',
    sessionRemaining: 'restant',

    // POI Preview Card & Directions
    directions: 'Itinéraire',
    clearRoute: 'Effacer l’itinéraire',
    playNarration: 'Écouter le récit',
    replay: 'Réécouter',
    distanceUnavailable: 'Distance indisponible',
    distanceKmAway: 'à {dist} km',
    distanceMAway: 'à {dist} m',
    closeExhibitPreview: 'Fermer l’aperçu',
    noPreviewSummary: 'Aucun résumé disponible.',

    // Paywall Gate
    unlockFullStory: 'Débloquer l’histoire',
    paywallTeaserInstruction: '📍 Approchez-vous à moins de 15m pour activer le récit complet',
    paywallPreviewDefault: 'Aperçu historique...',
    noDescriptionAvailable: 'Aucune description disponible.',

    // Checkout Modal
    serviceTitle: 'Service d’Audioguide Multilingue Intelligent',
    serviceSubtitle: 'Pass découverte illimité 24 heures',
    serviceFee24h: 'Frais de service 24h :',
    perDevice: '/ appareil',
    tabVietQR: 'VietQR Napas247',
    tabCard: 'Carte Internationale',
    cardGatewayTitle: 'Paiement Sécurisé par Carte & PayPal',
    cardGatewayDesc: 'Paiement international sécurisé via PayPal Sandbox et cartes Visa, Mastercard.',
    continueWithPayPal: 'Continuer avec PayPal Sandbox ({amount} VND)',
    simulatePayPalPayment: 'Simuler le paiement PayPal Sandbox ({amount} VND)',
    waitingPaymentConfirm: 'En attente de confirmation automatique...',
    checkingPaymentStatus: 'Vérification du statut du paiement...',
    accountNumber: 'Numéro de compte',
    bank: 'Banque',
    accountHolder: 'Titulaire du compte',
    transferContent: 'Référence du virement',
    copy: 'Copier',
    copied: 'Copié',
    alreadyPurchasedPrompt: 'Déjà acheté un pass ? Entrez votre code pour restaurer',
    closeCheckout: 'Fermer la fenêtre',
    vietqrAlt: 'Paiement VietQR pour l’audioguide',
    simulateSuccessBtn: 'Simuler le paiement',

    // Checkout Success Screen
    activationSuccessTitle: 'Activation Réussie !',
    activationSuccessSubtitle: 'Votre pass audioguide 24h est prêt.',
    sessionCodeLabel: 'Code de session :',
    validUntilLabel: 'Valable jusqu’au :',
    startListeningBtn: 'Commencer l’écoute',

    // Restore Session Modal
    restoreModalTitle: 'Restaurer l’Accès',
    restoreModalSubtitle: 'Entrez votre code de session pour continuer l’audioguide',
    sessionCodeInputLabel: 'Code de session (6-8 car.) :',
    sessionCodePlaceholder: 'CCT-XXXXXX',
    restoreSessionBtn: 'Restaurer la session',
    checkingStatusBtn: 'Vérification...',
    invalidSessionCodeError: 'Code de session invalide ou expiré.',
    restoreSuccessTitle: 'Session Restaurée !',
    restoreSuccessSubtitle: 'Bienvenue à nouveau ! Votre pass est restauré sur cet appareil.',
    closeBtn: 'Fermer',

    // Map & Navigation
    navigatingTo: 'Itinéraire vers : {name}',
    gpsLocating: 'Localisation GPS en cours...',

    // Mini Audio Player
    audioPlaying: 'Lecture en cours...',
    audioPaused: 'En pause',
    audioLoading: 'Chargement de l’audio...',
    audioNotAvailable: 'Aucun enregistrement audio pour cette langue.',
    replayAudio: 'Réécouter',
    pauseAudio: 'Pause',
    playAudio: 'Écouter l’audio',

    // Error banners
    errorLanguages: 'Impossible de charger les langues disponibles.',
    errorPois: 'Impossible de charger les points d’intérêt. Vérifiez votre connexion.',
    retry: 'Réessayer',
  },
  zh: {
    // Header
    brandTitle: '古芝地道',
    brandSubtitle: '智能语音导览',
    chooseLanguage: '选择语言',
    noLanguages: '无可用语言',
    restorePass: '恢复',
    restorePassTitle: '恢复已购会话',
    unlockAudio: '解锁语音',
    clearSession: '重置会话',
    sessionRemaining: '剩余',

    // POI Preview Card & Directions
    directions: '导航路线',
    clearRoute: '取消路线',
    playNarration: '播放解说',
    replay: '重新播放',
    distanceUnavailable: '距离未知',
    distanceKmAway: '距离 {dist} 公里',
    distanceMAway: '距离 {dist} 米',
    closeExhibitPreview: '关闭预览',
    noPreviewSummary: '暂无简介。',

    // Paywall Gate
    unlockFullStory: '解锁完整解说',
    paywallTeaserInstruction: '📍 请靠近景点 (≤15米) 以激活完整解说',
    paywallPreviewDefault: '历史简介预览...',
    noDescriptionAvailable: '暂无详细描述。',

    // Checkout Modal
    serviceTitle: '智能多语言语音导览服务',
    serviceSubtitle: '24小时无限体验通行证',
    serviceFee24h: '24小时服务费:',
    perDevice: '/ 台设备',
    tabVietQR: 'VietQR Napas247',
    tabCard: '国际卡 / PayPal',
    cardGatewayTitle: '国际银行卡及PayPal安全结算',
    cardGatewayDesc: '支持PayPal Sandbox及Visa、Mastercard等国际信用卡安全支付。',
    continueWithPayPal: '前往PayPal Sandbox支付 ({amount} 越盾)',
    simulatePayPalPayment: 'PayPal Sandbox模拟支付 ({amount} 越盾)',
    waitingPaymentConfirm: '正在等待系统自动确认汇款...',
    checkingPaymentStatus: '正在查询支付状态...',
    accountNumber: '银行账号',
    bank: '开户银行',
    accountHolder: '收款人',
    transferContent: '转账附言',
    copy: '复制',
    copied: '已复制',
    alreadyPurchasedPrompt: '已购买过通行证？输入会话代码以恢复',
    closeCheckout: '关闭结算窗口',
    vietqrAlt: '语音导览VietQR支付码',
    simulateSuccessBtn: '模拟支付',

    // Checkout Success Screen
    activationSuccessTitle: '激活成功！',
    activationSuccessSubtitle: '您的24小时语音导览通行证已就绪。',
    sessionCodeLabel: '通行证代码:',
    validUntilLabel: '有效期至:',
    startListeningBtn: '立即开始收听语音导览',

    // Restore Session Modal
    restoreModalTitle: '恢复访问通行证',
    restoreModalSubtitle: '输入您购买的会话代码，在当前设备上继续使用语音导览',
    sessionCodeInputLabel: '会话代码 (6-8位):',
    sessionCodePlaceholder: 'CCT-XXXXXX',
    restoreSessionBtn: '恢复会话',
    checkingStatusBtn: '验证中...',
    invalidSessionCodeError: '会话代码无效或已过期，请核对后重试。',
    restoreSuccessTitle: '恢复成功！',
    restoreSuccessSubtitle: '欢迎回来！您的24小时通行证已在当前设备激活。',
    closeBtn: '关闭',

    // Map & Navigation
    navigatingTo: '正在导航至: {name}',
    gpsLocating: '正在获取GPS定位...',

    // Mini Audio Player
    audioPlaying: '正在播放解说...',
    audioPaused: '已暂停',
    audioLoading: '音频加载中...',
    audioNotAvailable: '该语言暂无解说音频文件。',
    replayAudio: '重新播放',
    pauseAudio: '暂停',
    playAudio: '播放解说',

    // Error banners
    errorLanguages: '无法加载语言列表。',
    errorPois: '无法加载景点数据，请检查网络连接后重试。',
    retry: '重试',
  },
};

/**
 * Retrieve localized UI text for Visitor App.
 * Fallbacks: requested language -> 'vi' -> 'en' -> key
 *
 * @param {string} key - String resource identifier
 * @param {string} [lang='vi'] - Language code ('vi', 'en', 'ja', 'ko', 'fr', 'zh')
 * @param {Record<string, string|number>} [params] - Optional dynamic interpolations
 * @returns {string} Localized text
 */
export function getVisitorText(key, lang = 'vi', params = {}) {
  const normalized = (lang || 'vi').toLowerCase().split('-')[0];
  const dict = VISITOR_TRANSLATIONS[normalized] || VISITOR_TRANSLATIONS.vi || VISITOR_TRANSLATIONS.en;
  let text = dict[key] ?? VISITOR_TRANSLATIONS.vi[key] ?? VISITOR_TRANSLATIONS.en[key] ?? key;

  if (params && typeof params === 'object') {
    Object.keys(params).forEach((paramKey) => {
      text = text.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(params[paramKey]));
    });
  }

  return text;
}

