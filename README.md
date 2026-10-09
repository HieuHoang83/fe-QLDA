# Haravan Admin — Frontend (Next.js 14)

Giao diện quản trị đơn hàng, khách hàng, sản phẩm và kho cho hệ thống Haravan Sync.
Backend tương ứng: [`../Task1`](../Task1) (NestJS + MongoDB).

---

## 1. Công nghệ

| Thành phần | Công nghệ |
|---|---|
| Framework | Next.js 14 (App Router) + React 18 |
| Ngôn ngữ | TypeScript |
| Style | Tailwind CSS + PrimeReact |
| Server state | TanStack React Query |
| Auth | NextAuth (credentials, JWT) |
| Đa ngôn ngữ | next-intl, prefix `[locale]` |
| Thông báo | sonner |

## 2. Chạy local

```bash
npm install
cp .env.example .env.local     # hoặc tạo .env.local từ mẫu bên dưới
npm run dev                    # http://localhost:3001
```

FE cần backend chạy ở `http://localhost:3000`.

| Lệnh | Tác dụng |
|---|---|
| `npm run dev` | Chạy dev server (port 3001) |
| `npm run build` | Build production — chạy type-check và ESLint |
| `npm start` | Chạy bản build |
| `npm run lint` | ESLint |

### Biến môi trường

| Biến | Ý nghĩa |
|---|---|
| `NEXTAUTH_URL` | URL của FE, ví dụ `http://localhost:3001` |
| `NEXTAUTH_SECRET` | Khóa ký session, sinh bằng `npx auth secret` |
| `NEXT_PUBLIC_QLDAPM_API_URL` | Địa chỉ backend, ví dụ `http://localhost:3000` |
| `NEXT_PUBLIC_HARAVAN_ORG_ID` | Shop mặc định khi vào app |
| `NEXT_PUBLIC_HARAVAN_SHOP_NAME` | Tên hiển thị của shop |
| `NEXT_PUBLIC_HARAVAN_SHOPS` | Danh sách shop dạng JSON để chuyển shop |

## 3. Cấu trúc thư mục

```
src/
  app/
    [locale]/                layout theo ngôn ngữ + toàn bộ trang
      page.tsx               danh sách đơn hàng
      customers/             khách hàng
      products/              sản phẩm + chi tiết sản phẩm
      orders/[id]/           chi tiết đơn hàng
      inventory/             kho: phiếu mua, phiếu nhập, kiểm kho, chuyển kho, điều chỉnh
      settings/              cấu hình shop
    api/auth/[...nextauth]   route NextAuth
  components/                component dùng chung theo nghiệp vụ
    Orders/  Products/  Customers/  Inventory/  haravan/  ui/  auth/
  services/api/              lớp gọi API theo nghiệp vụ (orders, products, inventory...)
  lib/                       tiện ích dùng chung
    api-client.ts            axios client chung (baseURL, Bearer token, refresh 401)
    haravan-format.ts        format tiền tệ, ngày, ảnh sản phẩm
    token-refresh.ts         tự làm mới access token khi 401
  context/                   context dùng chung (ShopContext...)
  library/, types/           provider toàn cục và kiểu dữ liệu
  middleware.ts              bảo vệ route + định tuyến locale
```

Quy ước chia component trong `components/<Domain>/`:

- `<Domain>Page.tsx` — trang chính: gom dữ liệu, chứa bảng/danh sách.
- `<Domain><Dialog>.tsx` — hộp thoại tạo / sửa / chi tiết.
- `<domain>.form.ts` hoặc `<domain>.utils.ts` — chuyển đổi dữ liệu, không phụ thuộc React.

## 4. Quy ước

- **Mọi lời gọi API nằm trong `src/services/api`**, không gọi `axios` trực tiếp trong component.
- Component nhận dữ liệu qua props hoặc hook; không tự `useEffect` + fetch rải rác.
- Mỗi nghiệp vụ có một thư mục trong `src/components` và một file API tương ứng.
- Tiền tệ và ngày luôn format qua `src/lib/haravan-format.ts` để hiển thị nhất quán.
- `middleware.ts` chặn truy cập khi chưa đăng nhập và chuyển hướng về locale hợp lệ.

## 5. Liên kết backend

FE chỉ nói chuyện với backend, không gọi Haravan trực tiếp:

```
Component → services/api → lib/api-client → http://localhost:3000/api → NestJS → Haravan API
```

Danh sách endpoint và luồng webhook được mô tả trong [`../Task1/README.md`](../Task1/README.md).
