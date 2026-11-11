
import React, { useEffect, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import "../styles/Profile.css";

const API_URL = "http://localhost:8080/api/profile";

const PROFILE_LINKS = {
  github: {
    label: "Github:",
    url: "https://github.com/dieulinh-max/IoT",
  },
  figma: {
    label: "Figma:",
    url: "https://www.figma.com/design/zvKedxDQeC3PdXSOLQeZzj/IoT?node-id=0-1&t=8AtuwZqwUsAivaeW-1",
  },
  postman: {
    label: "Postman:",
    url: "https://documenter.getpostman.com/view/54857062/2sBYHURebS",
  },
  pdf: {
    label: "PDF mô tả dự án:",
    url: "https://docs.google.com/document/d/1TXR0Wd-vAHg5NkOI1CESGBNqrZC5ocJA/edit",
  },
};

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

// Tìm JWT từ các vị trí lưu trữ có thể có
function getStoredToken() {
  const keys = [
    "sensorIoTToken",
    "token",
    "accessToken",
    "jwtToken",
    "authToken",
  ];

  for (const storage of [localStorage, sessionStorage]) {
    for (const key of keys) {
      const value = storage.getItem(key);

      if (value && value !== "undefined" && value !== "null") {
        return value;
      }
    }
  }

  // Kiểm tra token nằm trong thông tin người dùng
  const user = getStoredUser();

  if (user) {
    return (
      user.token ||
      user.accessToken ||
      user.jwtToken ||
      user.authToken ||
      null
    );
  }

  return null;
}

function Profile() {
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        setError("");

        const currentUser = getStoredUser();
        const token = getStoredToken();

        if (!currentUser) {
          throw new Error("Không tìm thấy thông tin tài khoản.");
        }

        const studentId = currentUser.msv || currentUser.studentId;

        if (!studentId) {
          throw new Error("Không tìm thấy mã sinh viên.");
        }

        const headers = {
          "Content-Type": "application/json",
        };

        // Chỉ gửi Authorization khi tìm thấy token
        if (token) {
          headers.Authorization = token.startsWith("Bearer ")
            ? token
            : `Bearer ${token}`;
        }

        const response = await fetch(
          `${API_URL}?studentId=${encodeURIComponent(studentId)}`,
          {
            method: "GET",
            headers,
          }
        );

        if (response.status === 401) {
          throw new Error("Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.");
        }

        if (response.status === 403) {
          throw new Error(
            "Backend từ chối truy cập thông tin cá nhân (403)."
          );
        }

        if (!response.ok) {
          throw new Error(`Không thể tải thông tin. HTTP ${response.status}`);
        }

        const data = await response.json();
        setProfileData(data);
      } catch (err) {
        setError(err.message || "Không thể tải thông tin cá nhân.");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  if (loading) {
    return <div className="profile-page">Đang tải thông tin...</div>;
  }

  if (error) {
    return (
      <div className="profile-page">
        <p>{error}</p>
        <button onClick={() => window.location.reload()}>
          Thử lại
        </button>
      </div>
    );
  }

  if (!profileData) {
    return (
      <div className="profile-page">
        Không có dữ liệu người dùng.
      </div>
    );
  }

  const links = [
    PROFILE_LINKS.github,
    PROFILE_LINKS.figma,
    PROFILE_LINKS.postman,
    PROFILE_LINKS.pdf,
  ];

  return (
    <div className="profile-page">
      <div className="profile-wrapper">
        <div className="profile-card">
          <div className="profile-header">
            <div className="profile-avatar-wrapper">
              <span className="profile-avatar-icon">👤</span>
            </div>

            <h1 className="profile-name">
              {profileData.name || "Người dùng"}
            </h1>

            <div className="profile-msv-badge">
              MSV: {profileData.studentId || profileData.msv || "--"}
            </div>
          </div>

          <div className="profile-divider" />

          <div className="profile-info-list">
            <div className="profile-info-row">
              <span className="profile-label">Ngày sinh:</span>
              <span className="profile-value-bold">
                {profileData.dob || profileData.date || "Chưa cập nhật"}
              </span>
            </div>

            {links.map((link) => (
              <div className="profile-info-row" key={link.label}>
                <span className="profile-label">{link.label}</span>

                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="profile-link-btn"
                >
                  <span>{link.label}</span>
                  <ArrowUpRight size={15} />
                </a>
              </div>
            ))}

            <div className="profile-faculty-box">
              <span className="profile-faculty-dot" />
              <span>
                Học viện Công nghệ Bưu chính Viễn thông - Khoa Công nghệ Thông tin
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Profile;
