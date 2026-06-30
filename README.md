# GNSS Vision — Backend

REST API + WebSocket server cho hệ thống GNSS Vision. Xử lý authentication, quản lý thiết bị, lưu trữ tracking data, quản lý vùng địa lý cảnh báo (Geofencing), upload snapshot và phát real-time data qua Socket.IO.

## Tech Stack

- **Node.js** + Express 5
- **Sequelize ORM** + PostgreSQL
- **Socket.IO** — real-time WebSocket
- **MQTT** — nhận dữ liệu từ thiết bị IoT (tọa độ, số vệ tinh, trạng thái FIX...)
- **Supabase Storage** — lưu ảnh snapshot từ thiết bị
- **JWT** — authentication
- **Multer** — file upload
- **Nodemailer** — gửi email (forgot password OTP)

## Cấu trúc thư mục

```text
src/
├── configs/          # Database, Supabase client, MQTT broker config
├── controllers/      # Route handlers
│   ├── alertHistoryController.js
│   ├── alertZoneController.js
│   ├── authController.js
│   ├── deviceConfigController.js
│   ├── deviceController.js
│   ├── snapshotController.js
│   └── trackingController.js
├── middlewares/      # Auth guard, role-based validation
├── models/           # Sequelize models (User, Device, Tracking, AlertZone, AlertEvent...)
├── queries/          # Raw SQL / optimized tracking queries
├── routes/           # Express route definitions
├── services/         # Business logic (Xử lý vi phạm vùng cảnh báo, telemetry...)
└── index.js          # Entry point (Express + Socket.IO + MQTT subscriber)
```

## API Endpoints

### Auth
| Method | Path | Mô tả |
|--------|------|--------|
| POST | `/api/auth/register` | Đăng ký tài khoản |
| POST | `/api/auth/login` | Đăng nhập → Trả về JWT token |
| GET | `/api/auth/me` | Lấy thông tin profile hiện tại (yêu cầu token) |
| PUT | `/api/auth/change-password` | Đổi mật khẩu |
| POST | `/api/auth/forgot-password` | Gửi mã OTP khôi phục mật khẩu qua email |
| POST | `/api/auth/verify-reset-otp` | Xác thực mã OTP |
| PUT | `/api/auth/reset-password` | Đặt lại mật khẩu mới |

### Devices & Configs
| Method | Path | Mô tả |
|--------|------|--------|
| GET | `/api/devices` | Danh sách thiết bị |
| POST | `/api/devices` | Thêm mới thiết bị (Admin) |
| PUT | `/api/devices/:id` | Cập nhật thông tin thiết bị |
| DELETE | `/api/devices/:id` | Xóa thiết bị khỏi hệ thống |
| GET | `/api/device-config/:deviceId` | Lấy cấu hình định kỳ/tần suất gửi data của thiết bị |
| PUT | `/api/device-config/:deviceId` | Cập nhật cấu hình phần cứng thiết bị |

### Tracking
| Method | Path | Mô tả |
|--------|------|--------|
| GET | `/api/tracking/history/:deviceId` | Lịch sử tracking hành trình (params: `from`, `to`) |
| GET | `/api/tracking/latest/:deviceId` | Điểm tọa độ và trạng thái vệ tinh mới nhất |

### Alert Zones (Vùng cảnh báo - Geofencing)
| Method | Path | Mô tả |
|--------|------|--------|
| GET | `/api/alert-zones` | Lấy danh sách toàn bộ các vùng cảnh báo |
| POST | `/api/alert-zones` | Tạo vùng cảnh báo mới bằng Polygon tự vẽ (Admin) |
| PUT | `/api/alert-zones/:id` | Cập nhật tên, bán kính hoặc tọa độ hình học của vùng |
| DELETE | `/api/alert-zones/:id` | Xóa vùng cảnh báo |

### Alert History (Lịch sử vi phạm)
| Method | Path | Mô tả |
|--------|------|--------|
| GET | `/api/alert-history` | Xem danh sách các sự kiện vi phạm ra/vào vùng an toàn |
| GET | `/api/alert-history/device/:deviceId` | Lịch sử vi phạm vùng cụ thể theo từng thiết bị |
| PUT | `/api/alert-history/:id/resolve` | Đánh dấu sự kiện cảnh báo đã được xử lý |

### Snapshots
| Method | Path | Mô tả |
|--------|------|--------|
| POST | `/api/snapshots/init` | Khởi tạo snapshot metadata |
| POST | `/api/snapshots/:id/upload` | Upload dữ liệu ảnh (multipart) lên Supabase Storage |
| GET | `/api/snapshots/devices/:deviceId` | Danh sách snapshot theo từng thiết bị |
| POST | `/api/snapshots/attach-to-tracking` | Gắn snapshot trực tiếp vào một điểm tracking point cố định |

## Cài đặt & Chạy

```bash
# Cài đặt các thư viện cần thiết
npm install

# Sao chép và cấu hình biến môi trường
cp .env.example .env

# Chạy môi trường development (hỗ trợ nodemon tự động reload)
npm run dev

# Khởi chạy production
npm start
```

## Biến môi trường (.env)

| Biến | Mô tả |
|------|--------|
| `PORT` | Cổng chạy của Server (Mặc định: 5000) |
| `DATABASE_URL` | Chuỗi kết nối PostgreSQL (vd: `postgres://user:pass@host:51432/db`) |
| `JWT_SECRET` | Khóa bí mật dùng để ký và mã hóa JWT Token |
| `SUPABASE_URL` | URL dự án Supabase phục vụ lưu trữ ảnh |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (Bảo mật phía Server-side) |
| `MQTT_BROKER_URL` | Địa chỉ MQTT Broker kết nối với thiết bị IoT |
| `MQTT_TOPIC` | Topic pattern đăng ký nhận dữ liệu (Mặc định: `gnss/+`) |
| `SMTP_HOST` | Địa chỉ máy chủ SMTP gửi mail xác thực |
| `SMTP_PORT` | Cổng kết nối dịch vụ SMTP mail |
| `SMTP_USER` | Tài khoản email hệ thống |
| `SMTP_PASS` | Mật khẩu ứng dụng của email hệ thống |

## Database Diagram & Extensions

Hệ thống sử dụng **PostgreSQL** kết hợp các tiện ích mở rộng nâng cao:
- `pgcrypto` — Sinh chuỗi bảo mật ngẫu nhiên và mã hóa UUID.
- `postgis` — Hỗ trợ xử lý tính toán không gian hình học, tọa độ địa lý trực tiếp bằng truy vấn SQL (Phục vụ lõi xử lý Geofencing).

Các bảng chính bao gồm:
1. `Users`: Quản lý tài khoản người dùng và phân quyền (`admin`/`user`).
2. `Devices`: Quản lý danh sách thiết bị GNSS Tracker.
3. `DeviceConfigs`: Cấu hình tần suất truyền tín hiệu của phần cứng.
4. `Trackings`: Lưu vết chi tiết lịch sử tọa độ, hướng di chuyển, số vệ tinh sử dụng (Fix).
5. `AlertZones`: Lưu trữ thông tin hình học (`Polygon`, `warningRadius`) của các vùng cảnh báo.
6. `AlertEvents`: Nhật ký lưu trữ các mốc thời gian vi phạm vùng địa lý của thiết bị.
7. `TrackingSnapshots`: Quản lý đường dẫn hình ảnh được ghi lại từ thực địa.
