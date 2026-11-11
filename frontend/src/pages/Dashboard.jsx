
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Thermometer,
  Droplet,
  Sun,
  Fan,
  Lightbulb,
  Droplets,
} from "lucide-react";
import "../styles/Dashboard.css";

const DASHBOARD_API = "http://localhost:8080/api/dashboard";
const DEVICES_API = "http://localhost:8080/api/devices";

const REFRESH_MS = 2000;
const CHART_LIMIT = 20;

// ========================
// CẤU HÌNH CẢM BIẾN
// ========================

const SENSOR_CONFIG = [
  {
    key: "temperature",
    label: "NHIỆT ĐỘ",
    unit: "°C",
    tone: "red",
    icon: "thermometer",
    sensorName: "Temperature",
  },
  {
    key: "humidity",
    label: "ĐỘ ẨM",
    unit: "%",
    tone: "purple",
    icon: "droplet",
    sensorName: "Humidity",
  },
  {
    key: "light",
    label: "ÁNH SÁNG",
    unit: "Lux",
    tone: "yellow",
    icon: "sun",
    sensorName: "Light",
  },
];

// ========================
// CẤU HÌNH THIẾT BỊ
// ========================

const DEVICE_CONFIG = {
  FAN: { icon: "fan", tone: "red" },
  LIGHT: { icon: "lightbulb", tone: "yellow" },
  "LED LIGHT": { icon: "lightbulb", tone: "yellow" },
  HUMIDIFIER: { icon: "droplets", tone: "purple" },
};

const DEFAULT_DEVICE_CONFIG = {
  icon: "fan",
  tone: "red",
};

const ICONS = {
  thermometer: Thermometer,
  droplet: Droplet,
  sun: Sun,
  fan: Fan,
  lightbulb: Lightbulb,
  droplets: Droplets,
};

// ========================
// CẤU HÌNH BIỂU ĐỒ
// ========================

const CHART_PANELS = [
  {
    id: "temp-humidity",
    title: "Nhiệt độ & Độ ẩm",
    yMax: 150,
    yStep: 30,
    series: [
      {
        key: "temperature",
        label: "Nhiệt độ (°C)",
        color: "#ff8a80",
      },
      {
        key: "humidity",
        label: "Độ ẩm (%)",
        color: "#9350ff",
      },
    ],
  },
  {
    id: "light",
    title: "Ánh sáng",
    yMax: 1050,
    yStep: 150,
    series: [
      {
        key: "light",
        label: "Ánh sáng",
        color: "#fbbf24",
      },
    ],
  },
];

// ========================
// LẤY THÔNG TIN NGƯỜI DÙNG
// ========================

function getStoredUser() {
  try {
    const raw =
      localStorage.getItem("sensorIoTUser") ||
      sessionStorage.getItem("sensorIoTUser");

    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function getCurrentUserId() {
  return getStoredUser()?.id ?? null;
}

// ========================
// LẤY JWT TOKEN
// ========================

function getStoredToken() {
  const keys = [
    "token",
    "accessToken",
    "jwtToken",
    "authToken",
  ];

  for (const key of keys) {
    const token =
      localStorage.getItem(key) ||
      sessionStorage.getItem(key);

    if (token) {
      return token;
    }
  }

  // Kiểm tra token có thể được lưu bên trong thông tin người dùng
  const user = getStoredUser();

  return (
    user?.token ||
    user?.accessToken ||
    user?.jwtToken ||
    null
  );
}

// ========================
// HEADER XÁC THỰC JWT
// ========================

function getAuthHeaders() {
  const token = getStoredToken();

  return token
    ? { Authorization: `Bearer ${token}` }
    : {};
}

// ========================
// ICON
// ========================

function TonedIcon({ name, tone, size = "lg" }) {
  const Icon = ICONS[name] || Thermometer;

  return (
    <span className={`dash-icon dash-icon--${size} tone-${tone}`}>
      <Icon
        size={size === "lg" ? 20 : 24}
        strokeWidth={2.2}
      />
    </span>
  );
}

// ========================
// ĐỊNH DẠNG THỜI GIAN
// ========================

function formatFullTime(value) {
  if (!value) return "--";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value)
      .replace("T", " ")
      .replace("Z", "")
      .slice(0, 19);
  }

  const pad = (number) =>
    String(number).padStart(2, "0");

  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
    `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  );
}

// ========================
// BIỂU ĐỒ
// ========================

function ChartPanel({
  panel,
  rows,
  activeIndex,
  onHover,
  onLeave,
}) {
  const width = 804;
  const height = 330;

  const left = 84;
  const right = 24;
  const top = 16;
  const bottom = 86;

  const plotW = width - left - right;
  const plotH = height - top - bottom;

  const { yMax, yStep, series } = panel;

  const x = (index) =>
    left +
    (rows.length <= 1
      ? plotW / 2
      : (index / (rows.length - 1)) * plotW);

  const y = (value) => {
    const number = Math.min(
      Math.max(Number(value) || 0, 0),
      yMax
    );

    return top + plotH - (number / yMax) * plotH;
  };

  const makePath = (key) =>
    rows
      .map(
        (row, index) =>
          `${index === 0 ? "M" : "L"} ${x(index)} ${y(row[key])}`
      )
      .join(" ");

  const step =
    rows.length <= 1
      ? plotW
      : plotW / (rows.length - 1);

  const ticks = Array.from(
    { length: Math.round(yMax / yStep) + 1 },
    (_, index) => index * yStep
  );

  return (
    <div style={{ marginBottom: 8 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 32px",
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        <strong style={{ fontSize: 14 }}>
          {panel.title}
        </strong>

        <ul className="dash-legend" style={{ margin: 0 }}>
          {series.map((item) => (
            <li key={item.key}>
              <i style={{ background: item.color }} />
              {item.label}
            </li>
          ))}
        </ul>
      </div>

      <svg
        width="100%"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`Biểu đồ ${panel.title}`}
      >
        {/* Trục dọc và đường lưới */}
        {ticks.map((value) => {
          const yy = y(value);

          return (
            <g key={value}>
              <line
                x1={left}
                x2={width - right}
                y1={yy}
                y2={yy}
                className="dash-grid-line"
              />

              <text
                x={left - 10}
                y={yy}
                textAnchor="end"
                dominantBaseline="middle"
                className="dash-ytick"
              >
                {value}
              </text>
            </g>
          );
        })}

        {/* Đường chỉ vị trí đang chọn */}
        {rows.length > 0 && (
          <line
            x1={x(activeIndex)}
            x2={x(activeIndex)}
            y1={top}
            y2={top + plotH}
            className="dash-guide"
          />
        )}

        {/* Đường dữ liệu */}
        {series.map((item) => (
          <path
            key={item.key}
            d={makePath(item.key)}
            fill="none"
            stroke={item.color}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}

        {/* Các điểm dữ liệu */}
        {rows.map((row, index) => (
          <g key={`${row.time}-${index}`}>
            {series.map((item) => (
              <circle
                key={item.key}
                cx={x(index)}
                cy={y(row[item.key])}
                r={index === activeIndex ? 5 : 3}
                fill={item.color}
                stroke="#fff"
                strokeWidth="1.5"
              />
            ))}

            {/* Nhãn thời gian */}
            <text
              x={x(index)}
              y={top + plotH + 16}
              textAnchor="end"
              transform={`rotate(-40 ${x(index)} ${top + plotH + 16})`}
              style={{
                fontSize: 10,
                fontWeight: index === activeIndex ? 700 : 500,
                fill:
                  index === activeIndex
                    ? "#6366f1"
                    : "#334155",
              }}
            >
              {formatFullTime(row.time)}
            </text>

            {/* Vùng bắt chuột */}
            <rect
              x={x(index) - step / 2}
              y={top}
              width={step}
              height={plotH}
              fill="transparent"
              style={{ cursor: "pointer" }}
              onMouseEnter={() => onHover(index)}
              onMouseLeave={onLeave}
              onClick={() => onHover(index)}
            />
          </g>
        ))}
      </svg>
    </div>
  );
}

// ========================
// KHU VỰC BIỂU ĐỒ
// ========================

function EnvironmentChart({ rows }) {
  const [hoverIndex, setHoverIndex] = useState(null);

  if (!rows.length) {
    return (
      <div className="dash-chart-wrap">
        Chưa có dữ liệu biểu đồ.
      </div>
    );
  }

  const activeIndex = Math.min(
    hoverIndex ?? rows.length - 1,
    rows.length - 1
  );

  return (
    <div
      className="dash-chart-wrap"
      style={{ overflowX: "auto" }}
    >
      {CHART_PANELS.map((panel) => (
        <ChartPanel
          key={panel.id}
          panel={panel}
          rows={rows}
          activeIndex={activeIndex}
          onHover={setHoverIndex}
          onLeave={() => setHoverIndex(null)}
        />
      ))}
    </div>
  );
}

// ========================
// DASHBOARD
// ========================

export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [chartRows, setChartRows] = useState([]);
  const [devices, setDevices] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [controlBusy, setControlBusy] = useState(null);
  const [deviceError, setDeviceError] = useState("");
  const [notice, setNotice] = useState(null);

  const currentUser = useMemo(
    () => getStoredUser(),
    []
  );

  // Tự ẩn thông báo sau 3 giây
  useEffect(() => {
    if (!notice || notice.type === "pending") {
      return undefined;
    }

    const timer = window.setTimeout(
      () => setNotice(null),
      3000
    );

    return () => window.clearTimeout(timer);
  }, [notice]);

  // ========================
  // TẢI DASHBOARD
  // ========================

  const loadDashboard = useCallback(async () => {
    try {
      const headers = getAuthHeaders();

      const [summaryResponse, chartResponse] =
        await Promise.all([
          fetch(`${DASHBOARD_API}/summary`, {
            headers,
          }),

          fetch(
            `${DASHBOARD_API}/chart?limit=${CHART_LIMIT}`,
            {
              headers,
            }
          ),
        ]);

      if (
        summaryResponse.status === 401 ||
        summaryResponse.status === 403 ||
        chartResponse.status === 401 ||
        chartResponse.status === 403
      ) {
        throw new Error(
          "Không có quyền truy cập dữ liệu. Vui lòng kiểm tra đăng nhập và JWT."
        );
      }

      if (!summaryResponse.ok || !chartResponse.ok) {
        throw new Error(
          `Lỗi tải Dashboard: Summary ${summaryResponse.status}, Chart ${chartResponse.status}`
        );
      }

      const summaryData = await summaryResponse.json();
      const chartData = await chartResponse.json();

      setSummary(summaryData);
      setChartRows(
        Array.isArray(chartData) ? chartData : []
      );

      setError("");
    } catch (e) {
      setError(
        e.message || "Không kết nối được Backend."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  // ========================
  // TẢI DANH SÁCH THIẾT BỊ
  // ========================

  const loadDevices = useCallback(async () => {
    try {
      const response = await fetch(DEVICES_API, {
        headers: getAuthHeaders(),
      });

      if (response.status === 401 || response.status === 403) {
        throw new Error(
          "Không có quyền truy cập danh sách thiết bị. Kiểm tra JWT."
        );
      }

      if (!response.ok) {
        throw new Error(
          `GET /api/devices lỗi ${response.status}`
        );
      }

      const data = await response.json();

      setDevices(
        Array.isArray(data)
          ? data
          : data.content || []
      );

      setDeviceError("");
    } catch (e) {
      setDeviceError(
        e.message || "Không thể tải danh sách thiết bị."
      );
    }
  }, []);

  // ========================
  // TỰ ĐỘNG CẬP NHẬT
  // ========================

  useEffect(() => {
    loadDashboard();
    loadDevices();

    const timer = window.setInterval(() => {
      loadDashboard();
    }, REFRESH_MS);

    return () => window.clearInterval(timer);
  }, [loadDashboard, loadDevices]);

  // ========================
  // DỮ LIỆU CẢM BIẾN
  // ========================

  const stats = useMemo(
    () =>
      SENSOR_CONFIG.map((config) => {
        const value = summary?.[config.key];

        return {
          ...config,
          value: value?.value ?? null,
          unit: value?.unit || config.unit,
          sensorName:
            value?.sensorName || config.sensorName,
        };
      }),
    [summary]
  );

  // ========================
  // ĐIỀU KHIỂN THIẾT BỊ
  // ========================

  const toggleDevice = async (device) => {
    const userId = getCurrentUserId();

    if (userId == null) {
      setDeviceError(
        "Chưa đăng nhập, không xác định được người dùng."
      );
      return;
    }

    const nextStatus =
      device.status === "ON" ? "OFF" : "ON";

    const actionText =
      nextStatus === "ON" ? "BẬT" : "TẮT";

    setControlBusy(device.id);
    setDeviceError("");

    setNotice({
      type: "pending",
      text: `Đang gửi lệnh ${actionText} thiết bị ${device.name}...`,
    });

    try {
      const response = await fetch(
        `${DEVICES_API}/${device.id}/control`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders(),
          },

          body: JSON.stringify({
            userId,
            action: nextStatus,
          }),
        }
      );

      const result = await response
        .json()
        .catch(() => null);

      if (response.status === 401 || response.status === 403) {
        throw new Error(
          "Không có quyền điều khiển thiết bị. Vui lòng kiểm tra JWT."
        );
      }

      if (
        !response.ok ||
        result?.status !== "SUCCESS"
      ) {
        throw new Error(
          result?.message ||
          result?.error ||
          "Không thể gửi lệnh điều khiển thiết bị."
        );
      }

      setDevices((current) =>
        current.map((item) =>
          item.id === device.id
            ? { ...item, status: nextStatus }
            : item
        )
      );

      setNotice({
        type: "success",
        text: `Đã ${actionText} thiết bị ${device.name}`,
      });
    } catch (e) {
      setDeviceError(
        e.message || "Lỗi điều khiển thiết bị."
      );

      setNotice({
        type: "error",
        text: `Không thể ${actionText} thiết bị ${device.name}: ${e.message}`,
      });
    } finally {
      setControlBusy(null);
    }
  };

  // ========================
  // MÀU THÔNG BÁO
  // ========================

  const noticeColors = {
    pending: "#4f46e5",
    success: "#16a34a",
    error: "#dc2626",
  };

  // ========================
  // GIAO DIỆN
  // ========================

  return (
    <div className="dash-page">
      {/* Thông báo bật/tắt thiết bị */}
      {notice && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: "fixed",
            top: 24,
            right: 24,
            zIndex: 1000,
            maxWidth: 360,
            padding: "12px 18px",
            borderRadius: 12,
            color: "#fff",
            fontSize: 14,
            fontWeight: 600,
            background: noticeColors[notice.type],
            boxShadow:
              "0 8px 24px rgba(15, 23, 42, 0.25)",
          }}
        >
          {notice.text}
        </div>
      )}

      <div className="dash-layout">
        {/* CỘT BÊN TRÁI */}
        <div className="dash-col">
          {/* Banner */}
          <section className="dash-banner">
            <h1>Dashboard IoT 👋</h1>

            <p>
              Giám sát dữ liệu cảm biến được ghi nhận từ hệ thống.
            </p>

            {error && (
              <p role="alert">{error}</p>
            )}

            {loading && (
              <p>Đang tải dữ liệu...</p>
            )}
          </section>

          {/* Các thẻ cảm biến */}
          <section className="dash-stats">
            {stats.map((item) => (
              <article
                key={item.key}
                className="dash-card dash-stat"
              >
                <div className="dash-stat-head">
                  <TonedIcon
                    name={item.icon}
                    tone={item.tone}
                  />

                  <span className="dash-stat-label">
                    {item.label}
                  </span>
                </div>

                <div className="dash-stat-value">
                  {item.value == null
                    ? "--"
                    : Number(item.value).toFixed(
                        item.key === "light" ? 0 : 1
                      )}

                  <small>{item.unit}</small>
                </div>
              </article>
            ))}
          </section>

          {/* Biểu đồ */}
          <section className="dash-card dash-chart">
            <div className="dash-chart-head">
              <div>
                <h2>Biểu đồ giám sát môi trường</h2>

                <p>
                  Dữ liệu lịch sử từ Backend, cập nhật mỗi 2 giây
                </p>
              </div>
            </div>

            <EnvironmentChart rows={chartRows} />
          </section>
        </div>

        {/* CỘT BÊN PHẢI */}
        <div className="dash-col dash-col--right">
          {/* Thông tin người dùng */}
          <section className="dash-card dash-profile">
            <div className="dash-avatar">
              <span>👤</span>
              <i className="dash-avatar-dot" />
            </div>

            <div className="dash-profile-info">
              <strong>
                {currentUser?.name || "Người dùng"}
              </strong>

              <span>
                {currentUser?.msv
                  ? `MSV: ${currentUser.msv}`
                  : "Cập nhật tự động mỗi 2 giây"}
              </span>
            </div>
          </section>

          {/* Điều khiển thiết bị */}
          <section className="dash-card dash-devices">
            <h3>Điều khiển thiết bị</h3>

            <p className="dash-devices-sub">
              Trạng thái lấy từ Backend
            </p>

            {deviceError && (
              <p
                role="alert"
                style={{ color: "red" }}
              >
                {deviceError}
              </p>
            )}

            {devices.length === 0 ? (
              <p>
                Chưa có dữ liệu thiết bị hoặc API /api/devices chưa được triển khai.
              </p>
            ) : (
              <ul className="dash-device-list">
                {devices.map((device) => {
                  const config =
                    DEVICE_CONFIG[
                      device.name?.trim().toUpperCase()
                    ] || DEFAULT_DEVICE_CONFIG;

                  return (
                    <li
                      key={device.id}
                      className="dash-device"
                    >
                      <TonedIcon
                        name={config.icon}
                        tone={config.tone}
                        size="xl"
                      />

                      <div className="dash-device-text">
                        <strong>{device.name}</strong>

                        <span>
                          {device.description || device.status}
                        </span>
                      </div>

                      <button
                        type="button"
                        role="switch"
                        aria-checked={device.status === "ON"}
                        aria-label={`Điều khiển ${device.name}`}
                        disabled={controlBusy === device.id}
                        className={`dash-switch ${
                          device.status === "ON"
                            ? "is-on"
                            : ""
                        }`}
                        onClick={() => toggleDevice(device)}
                      >
                        <i />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
