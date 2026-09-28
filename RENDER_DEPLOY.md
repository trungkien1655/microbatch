# 🚀 Hướng Dẫn Deploy MicroBatch Lên Render (Hoạt Động 24/7)

Tài liệu này hướng dẫn chi tiết cách deploy toàn bộ hệ thống MicroBatch (PostgreSQL + Express/Socket.IO Backend + React/Vite Frontend) lên nền tảng đám mây [Render.com](https://render.com) hoàn toàn miễn phí.

---

## 📌 Chuẩn Bị: Đẩy Code Lên GitHub

1. Tạo một repository mới trên [GitHub](https://github.com/new) (ví dụ đặt tên là `microbatch`), chọn chế độ **Public** hoặc **Private**.
2. Tại máy của bạn, mở terminal trong thư mục `d:\hoc\LT\microbatch` và chạy:
   ```bash
   git remote add origin https://github.com/<tai-khoan-cua-ban>/microbatch.git
   git push -u origin main
   ```

---

## 🗄️ BƯỚC 1: Tạo Database PostgreSQL trên Render

1. Đăng nhập vào [Render Dashboard](https://dashboard.render.com).
2. Bấm nút **New +** ở góc trên bên phải $\rightarrow$ chọn **PostgreSQL**.
3. Điền thông tin cấu hình:
   * **Name**: `microbatch-db`
   * **Database**: `microbatch`
   * **User**: `microbatch_user`
   * **Region**: `Singapore (Southeast Asia)` *(khuyến nghị chọn Singapore để có độ trễ thấp nhất từ Việt Nam)*
   * **Instance Type**: `Free`
4. Bấm **Create Database**.
5. Chờ database tạo xong (Status chuyển sang `Available`):
   * Tìm mục **Connections** ở trang thông tin database.
   * Sao chép giá trị **Internal Database URL** (có dạng `postgres://microbatch_user:...@dpg-...-a/microbatch`) để dùng cho Backend ở Bước 2.

---

## ⚙️ BƯỚC 2: Tạo Web Service cho Backend (Server)

1. Trên Render Dashboard, bấm **New +** $\rightarrow$ chọn **Web Service**.
2. Chọn repository `microbatch` trên GitHub của bạn.
3. Điền thông tin cấu hình:
   * **Name**: `microbatch-server` *(đây sẽ là tên miền backend: `https://microbatch-server.onrender.com`)*
   * **Region**: `Singapore` *(cùng region với database)*
   * **Branch**: `main`
   * **Root Directory**: `server`
   * **Runtime**: `Node`
   * **Build Command**:
     ```bash
     npm install && npx prisma generate && npx prisma migrate deploy && npm run seed
     ```
     *(Lệnh này tự động cài package, build Prisma client, chạy migration PostgreSQL và nạp sẵn 6 Space khu Chùa Láng + tài khoản demo)*
   * **Start Command**:
     ```bash
     npm start
     ```
   * **Instance Type**: `Free`
4. Cuộn xuống mục **Environment Variables** và thêm các biến sau:
   | Key | Value | Ghi chú |
   | :--- | :--- | :--- |
   | `DATABASE_URL` | *(Dán Internal Database URL copy ở Bước 1)* | Kết nối PostgreSQL |
   | `JWT_SECRET` | `microbatch_super_secret_jwt_key_2026_xyz` | Khóa bí mật JWT |
   | `CLIENT_URL` | `https://microbatch-client.onrender.com` | Tên miền frontend (sẽ tạo ở Bước 3) |
5. Bấm **Create Web Service**. Chờ Render build và báo `Live`.

---

## 💻 BƯỚC 3: Tạo Static Site cho Frontend (Client)

1. Trên Render Dashboard, bấm **New +** $\rightarrow$ chọn **Static Site**.
2. Chọn cùng repository `microbatch`.
3. Điền thông tin cấu hình:
   * **Name**: `microbatch-client` *(hoặc tên tùy chọn, URL tạo ra sẽ có dạng: `https://microbatch-client.onrender.com`)*
   * **Branch**: `main`
   * **Root Directory**: `client`
   * **Build Command**:
     ```bash
     npm install && npm run build
     ```
   * **Publish Directory**:
     ```bash
     dist
     ```
4. Cuộn xuống mục **Environment Variables** và thêm:
   | Key | Value |
   | :--- | :--- |
   | `VITE_API_URL` | `https://microbatch-server.onrender.com` *(URL backend tạo ở Bước 2)* |
   | `VITE_SOCKET_URL` | `https://microbatch-server.onrender.com` |
5. **CẤU HÌNH CỰC KỲ QUAN TRỌNG (Cho React Router SPA):**
   * Vào mục **Redirects/Rewrites** trong menu bên trái của Static Site vừa tạo.
   * Bấm **Add Rule**:
     * **Type**: `Rewrite`
     * **Source**: `/*`
     * **Destination**: `/index.html`
     * *(Quy tắc này giúp khi user tải lại trang ở `/spaces/:id` hay `/sessions/:id` không bị lỗi 404 Not Found)*.
6. Bấm **Create Static Site**. Chờ build xong và báo `Live`.

---

## 🔄 BƯỚC 4: Đồng Bộ Lại Biến Môi Trường Giữa Client & Server

1. Sau khi Static Site ở Bước 3 tạo xong, bạn copy chính xác domain của frontend (ví dụ: `https://microbatch-client.onrender.com`).
2. Vào lại Web Service **microbatch-server** $\rightarrow$ mục **Environment** $\rightarrow$ kiểm tra giá trị `CLIENT_URL` đã trùng khớp với domain frontend chưa. Nếu chưa thì sửa lại và bấm **Save Changes** (Render sẽ tự động redeploy nhẹ để nhận origin mới).

---

## ✅ Kiểm Tra & Đăng Nhập

Mở link frontend trên trình duyệt (điện thoại hoặc máy tính bất kỳ):
👉 `https://microbatch-client.onrender.com`

Đăng nhập bằng các tài khoản demo sẵn có (mật khẩu: `123456`):
* `0901234567` (Minh)
* `0901234568` (Lan)
* `0901234569` (Đức)
* `0901234570` (Hương)

> **💡 Lưu ý về gói Free trên Render:**
> Trên gói Free, nếu sau 15 phút không có ai truy cập, server backend sẽ tạm "ngủ" (spin down). Khi có người truy cập lại, request đầu tiên sẽ mất khoảng 30 - 50 giây để server khởi động lại (cold start). Sau khi đã bật lên thì app chạy nhanh và mượt mà bình thường 24/7.
