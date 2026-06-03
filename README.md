# GNSS Vision — Backend

REST API + WebSocket server cho hệ thống GNSS Vision. Xử lý authentication, quản lý thiết bị, lưu trữ tracking data, upload snapshot và phát real-time data qua Socket.IO.

## Tech Stack

- **Node.js** + Express 5
- **Sequelize ORM** + PostgreSQL
- **Socket.IO** — real-time WebSocket
- **MQTT** — nhận data từ thiết bị IoT
- **Supabase Storage** — lưu ảnh snapshot
- **JWT** — authentication
- **Multer** — file upload
- **Nodemailer** — gửi email (forgot password OTP)

## Cấu trúc thư mục

```
src/
├── configs/          # Database, Supabase client
├── controllers/      # Route handlers
│   ├── authController.js
│   ├── deviceController.js
│   ├── snapshotController.js
│   └── trackingController.js
├── middlewares/      # Auth guard, validation
├── models/           # Sequelize models (User, Device, Tracking, TrackingSnapshot)
├── queries/          # Raw SQL queries
├── routes/           # Express route definitions
├── services/         # Business logic
│   ├── authService.js
│   ├── deviceService.js
│   ├── snapshotService.js
│   └── trackingService.js
├── utils/            # Helpers
└── index.js          # Entry point (Express + Socket.IO + MQTT)
```

## API Endpoints

### Auth
| Method | Path | Mô tả |
|--------|------|--------|
| POST | `/api/auth/register` | Đăng ký |
| POST | `/api/auth/login` | Đăng nhập → JWT token |
| GET | `/api/auth/me` | Lấy profile (requires auth) |
| PUT | `/api/auth/change-password` | Đổi mật khẩu |
| POST | `/api/auth/forgot-password` | Gửi OTP qua email |
| POST | `/api/auth/verify-reset-otp` | Xác thực OTP |
| PUT | `/api/auth/reset-password` | Reset mật khẩu |

### Devices
| Method | Path | Mô tả |
|--------|------|--------|
| GET | `/api/devices` | Danh sách thiết bị |
| POST | `/api/devices` | Thêm thiết bị |
| PUT | `/api/devices/:id` | Cập nhật thiết bị |
| DELETE | `/api/devices/:id` | Xóa thiết bị |

### Tracking
| Method | Path | Mô tả |
|--------|------|--------|
| GET | `/api/tracking/history/:deviceId` | Lịch sử tracking (params: from, to) |
| GET | `/api/tracking/latest/:deviceId` | Điểm tracking mới nhất |

### Snapshots
| Method | Path | Mô tả |
|--------|------|--------|
| POST | `/api/snapshots/init` | Khởi tạo snapshot metadata |
| POST | `/api/snapshots/:id/upload` | Upload ảnh (multipart) |
| GET | `/api/snapshots/devices/:deviceId` | Danh sách snapshot theo device |
| POST | `/api/snapshots/attach-to-tracking` | Gắn snapshot vào tracking point |

## Real-time Flow

```
Device (Flutter App)
  → MQTT publish: gnss/{deviceCode}
    → Backend MQTT subscriber nhận message
      → Lưu vào DB (Tracking table)
      → Emit Socket.IO event: live:{deviceCode}
        → Frontend nhận & hiển thị real-time
```

## Cài đặt & Chạy

```bash
# Cài dependencies
npm install

# Tạo file .env
cp .env.example .env

# Chạy development (nodemon)
npm run dev

# Chạy production
npm start
```

## Biến môi trường (.env)

| Biến | Mô tả |
|------|--------|
| `PORT` | Port server (default: 5000) |
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret key cho JWT |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-side only) |
| `MQTT_BROKER_URL` | MQTT broker URL |
| `MQTT_TOPIC` | MQTT topic pattern (vd: `gnss/+`) |
| `SMTP_HOST` | SMTP server cho email |
| `SMTP_PORT` | SMTP port |
| `SMTP_USER` | SMTP username |
| `SMTP_PASS` | SMTP password |

## Database

PostgreSQL với extensions:
- `pgcrypto` — UUID generation
- `postgis` — Geography/geometry types

Tables: `Users`, `Devices`, `Trackings`, `TrackingSnapshots`
