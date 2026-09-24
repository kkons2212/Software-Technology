/**
 * Sơ đồ bố trí bảo tàng & Mạng lưới định tuyến thông minh (Smart Museum Floor Plan & Waypoints)
 * Dùng chung giữa Visitor Interactive Map và Admin Interactive Map Picker.
 */

export const SVG_WIDTH = 600;
export const SVG_HEIGHT = 420;

export const ROOMS_BY_FLOOR = {
  1: [
    {
      id: 'room1',
      x: 30,
      y: 30,
      w: 240,
      h: 140,
      label: 'Khu Cổ Vật Tiền Sử',
      center: { x: 150, y: 100 },
      door: { x: 150, y: 170 },
      doorWay: { x1: 120, x2: 180, y: 170 },
    },
    {
      id: 'room2',
      x: 330,
      y: 30,
      w: 240,
      h: 140,
      label: 'Khu Văn Hóa Đông Sơn',
      center: { x: 450, y: 100 },
      door: { x: 450, y: 170 },
      doorWay: { x1: 420, x2: 480, y: 170 },
    },
    {
      id: 'hall',
      x: 30,
      y: 230,
      w: 540,
      h: 155,
      label: 'Đại Sảnh Chính & Cổng Vào',
      center: { x: 300, y: 300 },
      door: { x: 300, y: 230 },
      doorWay: { x1: 270, x2: 330, y: 230 },
    },
  ],
  2: [
    {
      id: 'art1',
      x: 30,
      y: 30,
      w: 260,
      h: 155,
      label: 'Khu Nghệ Thuật Điêu Khắc',
      center: { x: 160, y: 105 },
      door: { x: 160, y: 185 },
      doorWay: { x1: 130, x2: 190, y: 185 },
    },
    {
      id: 'art2',
      x: 310,
      y: 30,
      w: 260,
      h: 155,
      label: 'Khu Tranh Thủy Mặc & Trống',
      center: { x: 440, y: 105 },
      door: { x: 440, y: 185 },
      doorWay: { x1: 410, x2: 470, y: 185 },
    },
    {
      id: 'hall2',
      x: 30,
      y: 220,
      w: 540,
      h: 165,
      label: 'Khu Trưng Bày Chuyên Đề',
      center: { x: 300, y: 300 },
      door: { x: 300, y: 220 },
      doorWay: { x1: 270, x2: 330, y: 220 },
    },
  ],
};

export const STAIRS_CONFIG = {
  id: 'stairs',
  x: 260,
  y: 165,
  w: 80,
  h: 55,
  center: { x: 300, y: 192 },
  label: 'CẦU THANG 1 ⇄ 2',
};

export const ENTRANCE_CONFIG = {
  id: 'entrance',
  x: 255,
  y: 378,
  w: 90,
  h: 8,
  center: { x: 300, y: 365 },
  label: 'CỔNG VÀO CHÍNH',
};

/**
 * Xác định phân vùng (zone) của một toạ độ (x, y) trên sơ đồ tầng
 */
export function getPointZone(point, floor = 1) {
  if (!point) return 'hall';
  const { x, y } = point;

  // Kiểm tra Cầu thang
  const s = STAIRS_CONFIG;
  if (x >= s.x - 10 && x <= s.x + s.w + 10 && y >= s.y - 10 && y <= s.y + s.h + 10) {
    return 'stairs';
  }

  if (floor === 1) {
    if (x <= 270 && y <= 180) return 'room1';
    if (x >= 330 && y <= 180) return 'room2';
    if (y >= 225) return 'hall';
    return 'corridor';
  } else {
    if (x <= 290 && y <= 195) return 'art1';
    if (x >= 310 && y <= 195) return 'art2';
    if (y >= 215) return 'hall2';
    return 'corridor';
  }
}

/**
 * Thuật toán tìm đường đi theo ô cửa và hành lang (Indoor Waypoint Navigation Path)
 * Tránh hoàn toàn việc cắt ngang qua tường đặc.
 */
export function findNavigationPath(startPoint, endPoint, floor = 1) {
  if (!startPoint || !endPoint) return [];

  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  const start = {
    x: clamp(startPoint.x_coord || startPoint.x || 150, 45, SVG_WIDTH - 45),
    y: clamp(startPoint.y_coord || startPoint.y || 100, 45, SVG_HEIGHT - 45),
  };
  const end = {
    x: clamp(endPoint.x_coord || endPoint.x || 300, 45, SVG_WIDTH - 45),
    y: clamp(endPoint.y_coord || endPoint.y || 200, 45, SVG_HEIGHT - 45),
  };

  const startZone = getPointZone(start, floor);
  const endZone = getPointZone(end, floor);

  // Nếu cùng ở trong 1 phòng hoặc cùng ở đại sảnh: đường đi thẳng không có tường chắn
  if (startZone === endZone && startZone !== 'corridor') {
    return [start, end];
  }

  // Toạ độ các điểm nút (Waypoints)
  const corridorY = floor === 1 ? 195 : 205;
  const stairsNode = { x: 300, y: corridorY };

  // Nút cửa phòng và nút hành lang ngoài cửa
  let doorA, corrA, doorB, corrB;

  // Xác định điểm thoát ra hành lang của điểm bắt đầu
  if (startZone === 'room1' || startZone === 'art1') {
    const doorX = floor === 1 ? 150 : 160;
    const doorY = floor === 1 ? 170 : 185;
    doorA = { x: doorX, y: doorY };
    corrA = { x: doorX, y: corridorY };
  } else if (startZone === 'room2' || startZone === 'art2') {
    const doorX = floor === 1 ? 450 : 440;
    const doorY = floor === 1 ? 170 : 185;
    doorA = { x: doorX, y: doorY };
    corrA = { x: doorX, y: corridorY };
  } else if (startZone === 'hall' || startZone === 'hall2') {
    const hallDoorY = floor === 1 ? 230 : 220;
    // Chọn cửa sảnh gần x của start nhất
    let doorX = 300;
    if (start.x < 220) doorX = floor === 1 ? 150 : 160;
    else if (start.x > 380) doorX = floor === 1 ? 450 : 440;
    doorA = { x: doorX, y: hallDoorY };
    corrA = { x: doorX, y: corridorY };
  } else if (startZone === 'stairs') {
    doorA = stairsNode;
    corrA = stairsNode;
  } else {
    // Corridor
    doorA = { x: start.x, y: corridorY };
    corrA = { x: start.x, y: corridorY };
  }

  // Xác định điểm vào từ hành lang của điểm đích
  if (endZone === 'room1' || endZone === 'art1') {
    const doorX = floor === 1 ? 150 : 160;
    const doorY = floor === 1 ? 170 : 185;
    doorB = { x: doorX, y: doorY };
    corrB = { x: doorX, y: corridorY };
  } else if (endZone === 'room2' || endZone === 'art2') {
    const doorX = floor === 1 ? 450 : 440;
    const doorY = floor === 1 ? 170 : 185;
    doorB = { x: doorX, y: doorY };
    corrB = { x: doorX, y: corridorY };
  } else if (endZone === 'hall' || endZone === 'hall2') {
    const hallDoorY = floor === 1 ? 230 : 220;
    let doorX = 300;
    if (end.x < 220) doorX = floor === 1 ? 150 : 160;
    else if (end.x > 380) doorX = floor === 1 ? 450 : 440;
    doorB = { x: doorX, y: hallDoorY };
    corrB = { x: doorX, y: corridorY };
  } else if (endZone === 'stairs') {
    doorB = stairsNode;
    corrB = stairsNode;
  } else {
    doorB = { x: end.x, y: corridorY };
    corrB = { x: end.x, y: corridorY };
  }

  // Ghép đường đi: Start -> doorA -> corrA -> [stairsNode nếu cần] -> corrB -> doorB -> End
  const rawWaypoints = [start];

  if (startZone !== 'stairs' && startZone !== 'corridor') {
    rawWaypoints.push(doorA);
  }
  rawWaypoints.push(corrA);

  // Nếu di chuyển từ cánh trái sang cánh phải (hoặc ngược lại), đi qua trung tâm hành lang (cạnh cầu thang)
  if ((corrA.x < 250 && corrB.x > 350) || (corrA.x > 350 && corrB.x < 250)) {
    rawWaypoints.push(stairsNode);
  }

  rawWaypoints.push(corrB);
  if (endZone !== 'stairs' && endZone !== 'corridor') {
    rawWaypoints.push(doorB);
  }
  rawWaypoints.push(end);

  // Lọc bỏ các điểm trùng lặp liền kề
  const cleaned = [];
  for (let i = 0; i < rawWaypoints.length; i++) {
    const pt = rawWaypoints[i];
    if (cleaned.length === 0) {
      cleaned.push(pt);
    } else {
      const prev = cleaned[cleaned.length - 1];
      const dist = Math.hypot(pt.x - prev.x, pt.y - prev.y);
      if (dist > 3) {
        cleaned.push(pt);
      }
    }
  }

  return cleaned;
}

/**
 * Chuyển đổi danh sách toạ độ thành SVG Path String với bo góc mềm mại
 */
export function pointsToSvgPath(points, cornerRadius = 12) {
  if (!points || points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  if (points.length === 2) {
    return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;
  }

  let path = `M ${points[0].x} ${points[0].y}`;

  for (let i = 1; i < points.length - 1; i++) {
    const p0 = points[i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];

    const v1 = { x: p0.x - p1.x, y: p0.y - p1.y };
    const v2 = { x: p2.x - p1.x, y: p2.y - p1.y };

    const len1 = Math.hypot(v1.x, v1.y);
    const len2 = Math.hypot(v2.x, v2.y);

    if (len1 === 0 || len2 === 0) {
      path += ` L ${p1.x} ${p1.y}`;
      continue;
    }

    const r = Math.min(cornerRadius, len1 / 2, len2 / 2);

    const startCorner = {
      x: p1.x + (v1.x / len1) * r,
      y: p1.y + (v1.y / len1) * r,
    };
    const endCorner = {
      x: p1.x + (v2.x / len2) * r,
      y: p1.y + (v2.y / len2) * r,
    };

    path += ` L ${startCorner.x} ${startCorner.y} Q ${p1.x} ${p1.y} ${endCorner.x} ${endCorner.y}`;
  }

  const last = points[points.length - 1];
  path += ` L ${last.x} ${last.y}`;
  return path;
}
