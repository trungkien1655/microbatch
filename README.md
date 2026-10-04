# 🍜 MicroBatch — Nền Tảng Gom Đơn Thời Gian Thực

> **MicroBatch** là ứng dụng web full-stack hỗ trợ gom đơn đặt đồ ăn, thức uống theo thời gian thực dành cho người dùng trong cùng một không gian vật lý (tầng thư viện, tòa nhà ký túc xá, khu trọ, giảng đường, tòa văn phòng).

---

## 📌 Bối Cảnh & Vấn Đề Giải Quyết

* **Phí ship cao & Phụ phí đơn nhỏ:** Muốn đặt món giá trị nhỏ (25k-35k) nhưng bị đội giá do phí giao hàng và Small Order Fee.
* **Bỏ lỡ mã giảm giá lớn:** Không đủ điều kiện dùng các voucher giảm sâu của app giao đồ ăn (giảm 40k/100k, 80k/200k) nếu đặt một mình.
* **Ngại spam nhóm chat:** Ngại nhắn tin hỏi từng người trong nhóm Zalo/Facebook xem có ai đặt chung không.
* **Ngại ứng tiền & đòi nợ:** Người đứng ra gom đơn thường phải ứng tiền trước rồi chật vật tính tiền lẻ, chia ship và nhắc nợ từng người.
* **Điểm giao cố định:** Shipper không lên tận phòng/tầng, cần điểm giao tập trung (sảnh, quầy bảo vệ) để mọi người cùng xuống lấy đồ.

---

## ✨ Tính Năng Nổi Bật

### 1. Không Gian Gom Đơn (Spaces)
- **Địa điểm có sẵn (Preset Spaces):** Tích hợp sẵn 6 địa điểm học đường & KTX khu vực Chùa Láng, Hà Nội:
  - *Đại học Ngoại Thương (FTU)* — Sảnh nhà A, cổng chính Chùa Láng
  - *Học viện Ngoại giao (DAV)* — Sảnh tòa nhà chính, cổng Chùa Láng
  - *Đại học Giao thông Vận tải (UTC)* — Cổng chính đường Cầu Giấy
  - *Học viện Hành chính Quốc gia (NAPA)* — Cổng chính Nguyễn Chí Thanh
  - *Đại học Luật Hà Nội (HLU)* — Sảnh tòa nhà A
  - *KTX Mễ Trì* — Sảnh tầng 1
- **Tham gia tức thì:** Bấm chọn địa điểm là tự động join, không cần tạo trùng lặp.
- **Tùy biến:** Vẫn hỗ trợ tạo Space mới nếu không thuộc các địa điểm có sẵn.

### 2. Phiên Gom Đơn Thời Gian Thực (Live Sessions)
- **Đếm ngược thời gian (Countdown):** Phiên tự động đóng khi hết thời gian gom (10, 15, 20, 30 phút).
- **Thanh tiến độ (Progress Bar):** Hiển thị trực quan giá trị đơn hiện tại so với mục tiêu tối thiểu (MOQ) để kích hoạt mã giảm giá hoặc miễn phí ship.
- **Thêm/xóa món realtime:** Mọi thay đổi về món ăn của các thành viên được cập nhật ngay lập tức qua WebSocket (Socket.IO).

### 3. Mô Hình Đóng Góp Quỹ Trước (Contribution-First)
- **Không ai phải ứng tiền:** Loại bỏ hoàn toàn mô hình "nợ nần". Người tạo phiên không phải ứng tiền trước cho người khác.
- **Chốt đơn & Chia tiền (Bill Splitting):**
  - Hỗ trợ chia phí ship theo tỷ lệ giá trị món hoặc chia đều.
  - Phân bổ mã giảm giá chính xác theo tỷ lệ phần ăn.
  - Tự động làm tròn lên mốc 500đ gần nhất.
- **Trạng thái `AWAITING_PAYMENT`:**
  - Sau khi chốt đơn, phiên chuyển sang đếm ngược hạn chót nộp quỹ (10 phút).
  - Từng thành viên xác nhận *"Tôi đã góp phần của mình"*.
- **Tự động chuyển `ORDERED`:** Khi 100% người tham gia đã góp đủ tiền, phiên cho phép người tạo đặt hàng trên app thật.
- **Cơ chế Auto-Kick:** Nếu hết hạn nộp quỹ mà có người chưa đóng góp, hệ thống tự động loại bỏ người đó, tính lại bill cho những người còn lại và tiếp tục đơn hàng.

### 4. Cập Nhật Trạng Thái Giao Hàng
- Stepper trực quan: `Chờ giao` $\rightarrow$ `Đang giao` $\rightarrow$ `Đã đến!`.
- Gửi thông báo tức thì khi đồ ăn đã về sảnh để mọi người xuống nhận.

### 5. Trang Cá Nhân & Đóng Góp
- Theo dõi toàn bộ lịch sử các phiên đã tham gia (Đang diễn ra / Đã hoàn thành).
- Quản lý tổng số tiền đã đóng góp và các khoản cần thanh toán.
- Chỉnh sửa tên hiển thị cá nhân.

---

## 🛠️ Công Nghệ Sử Dụng (Tech Stack)

| Thành phần | Công nghệ |
| :--- | :--- |
| **Frontend** | React 18, Vite 6, Tailwind CSS, Lucide Icons, Zustand, React Router 6 |
| **Backend** | Node.js, Express, Socket.IO 4, JWT, bcryptjs |
| **Database & ORM** | PostgreSQL (Production) / SQLite (Local), Prisma ORM 6 |
| **Deploy** | Render (Web Service + Static Site + Managed PostgreSQL) |

---

## 🚀 Hướng Dẫn Cài Đặt & Chạy Local

### Yêu Cầu Hệ Thống
- [Node.js](https://nodejs.org/) phiên bản 18 trở lên
- npm phiên bản 9 trở lên

### 1. Clone Source Code
```bash
git clone https://github.com/trungkien1655/microbatch.git
cd microbatch
```

### 2. Cấu Hình & Chạy Backend Server
Mở terminal 1:
```bash
cd server
npm install

# Tạo file .env từ template mẫu
cp .env.example .env
```

> **Gợi ý chạy local với SQLite (nhanh nhất):**
> Nếu chạy local không cần PostgreSQL, trong `server/prisma/schema.prisma` bạn có thể đổi `provider = "sqlite"` và trong `.env` đặt `DATABASE_URL="file:./dev.db"`.
> Nếu dùng PostgreSQL local/Docker, điền chuỗi kết nối vào `DATABASE_URL` trong `.env`.

Khởi tạo database và nạp dữ liệu mẫu:
```bash
npx prisma generate
npx prisma db push
npm run seed
```

Khởi động backend server:
```bash
npm run dev
# Server sẽ chạy tại: http://localhost:3001
```

### 3. Cấu Hình & Chạy Frontend Client
Mở terminal 2:
```bash
cd client
npm install

# Tạo file .env từ template mẫu
cp .env.example .env
```

*(Mặc định client kết nối tới proxy hoặc `http://localhost:3001`).*

Khởi động client:
```bash
npm run dev
# Giao diện web sẽ mở tại: http://localhost:5173
```

---

## 🔑 Tài Khoản Demo Sẵn Có (Mật khẩu: `123456`)

Sau khi chạy `npm run seed`, hệ thống đã có sẵn 4 tài khoản thử nghiệm:

| Tên người dùng | Số điện thoại | Email | Space mặc định |
| :--- | :--- | :--- | :--- |
| **Minh** | `0901234567` | `minh@test.com` | ĐH Ngoại Thương (Admin) |
| **Lan** | `0901234568` | `lan@test.com` | HV Ngoại giao (Admin), FTU |
| **Đức** | `0901234569` | `duc@test.com` | ĐH GTVT (Admin), FTU |
| **Hương** | `0901234570` | `huong@test.com` | HV Hành chính (Admin), FTU |

---

## ☁️ Hướng Dẫn Deploy Lên Render (24/7)

Hệ thống đã được thiết kế sẵn sàng để deploy lên đám mây Render hoàn toàn miễn phí.

👉 **Xem hướng dẫn chi tiết từng bước tại:** [**RENDER_DEPLOY.md**](./RENDER_DEPLOY.md)

---

## 📂 Cấu Trúc Thư Mục Dự Án

```
microbatch/
├── client/                     # Mã nguồn Frontend (React + Vite + Tailwind)
│   ├── public/                 # Static assets, favicon, icons
│   ├── src/
│   │   ├── components/         # Layout (AppShell), UI components
│   │   ├── pages/              # Màn hình: Home, Auth, Spaces, Sessions, Profile...
│   │   ├── services/           # api.js (Fetch client), socket.js (Socket.IO client)
│   │   ├── stores/             # Zustand authStore
│   │   └── utils/              # format.js (Tiền tệ VND, format thời gian)
│   ├── package.json
│   └── vite.config.js          # Cấu hình Vite & proxy dev
│
├── server/                     # Mã nguồn Backend (Express + Socket.IO + Prisma)
│   ├── prisma/
│   │   ├── schema.prisma       # Mô hình CSDL (User, Space, Session, Contribution...)
│   │   └── migrations/         # Migration script PostgreSQL
│   ├── src/
│   │   ├── middleware/         # authMiddleware (JWT)
│   │   ├── routes/             # REST API: auth, spaces, sessions, debts, notifications
│   │   ├── socket/             # Socket.IO handlers
│   │   └── index.js            # Server entrypoint & background timers
│   ├── seed.js                 # Seed data tự động cho 6 Space Chùa Láng & User demo
│   └── package.json
│
├── .gitignore
├── .env.example
├── RENDER_DEPLOY.md            # Tài liệu hướng dẫn deploy Render chi tiết
└── README.md                   # Tài liệu tổng quan dự án
```
