This is a [Next.js](https://nextjs.org/) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## II.4 FE - Kiến trúc FE + công nghệ FE

### 1. Tổng quan kiến trúc FE

Frontend của hệ thống được xây dựng theo hướng **SPA/SSR hybrid** trên nền **Next.js 14 App Router**. Kiến trúc FE tách thành các lớp rõ ràng để dễ bảo trì, mở rộng và kiểm soát luồng dữ liệu từ giao diện đến backend.

Luồng xử lý chính:

`UI/Component` -> `Page/Layout` -> `Service/API` -> `Axios Client` -> `Backend API`

Trong đó:

- `src/app`: quản lý định tuyến, layout, route group và tổ chức màn hình theo App Router.
- `src/components`: chứa các thành phần giao diện có thể tái sử dụng như đăng nhập, menu, header, theme, toast.
- `src/services/api`: đóng vai trò tầng gọi API theo nghiệp vụ, ví dụ `auth`, `document`.
- `src/lib/api-client.ts`: lớp hạ tầng dùng chung cho request, cấu hình `baseURL`, gắn `Authorization Bearer token`, xử lý lỗi `401`.
- `src/lib/providers` và `src/library`: quản lý các provider toàn cục như `React Query`, `NextAuth`, theme và progress bar.
- `src/types`: định nghĩa mở rộng kiểu dữ liệu, đặc biệt cho `next-auth`.

### 2. Tổ chức kiến trúc theo lớp

#### 2.1. Lớp điều hướng và bố cục

Hệ thống dùng **App Router** của Next.js với cấu trúc route theo thư mục:

- `src/app/[locale]`: layout gốc theo ngôn ngữ.
- `src/app/[locale]/(Guest)`: nhóm trang công khai như đăng nhập, đăng ký.
- `src/app/[locale]/(User)`: nhóm trang cần xác thực như menu, chi tiết tài liệu.
- `src/middleware.ts`: kết hợp `next-intl` và `next-auth` để xử lý locale và chặn truy cập vào các route private.

Thiết kế này giúp tách biệt rõ:

- khu vực công khai và khu vực yêu cầu đăng nhập;
- phần layout dùng chung theo từng nhóm chức năng;
- cơ chế đa ngôn ngữ ngay từ tầng route.

#### 2.2. Lớp giao diện và tương tác người dùng

Lớp giao diện được xây dựng bằng **React component** kết hợp **PrimeReact** và **Tailwind CSS**:

- PrimeReact cung cấp các UI component sẵn có như `Button`, `Toast` và một số tiện ích giao diện.
- Tailwind CSS được dùng để kiểm soát layout, spacing, responsive và custom theme nhanh ở mức class utility.
- Các component được chia theo miền chức năng như `auth`, `Menu`, `header`, `Theme`, `SwitchLangue`.

Kiến trúc component hiện tại phù hợp với mô hình:

- `page/layout` chịu trách nhiệm ghép màn hình;
- `component` chịu trách nhiệm hiển thị và xử lý tương tác;
- `service` chịu trách nhiệm giao tiếp dữ liệu.

#### 2.3. Lớp quản lý trạng thái và ngữ cảnh dùng chung

Frontend đang sử dụng các cơ chế state sau:

- **React local state** (`useState`) cho trạng thái cục bộ của form và component.
- **Context Provider** cho theme thông qua `ThemeProvider`.
- **NextAuth SessionProvider** để duy trì trạng thái xác thực người dùng.
- **TanStack React Query** để chuẩn hóa việc quản lý dữ liệu bất đồng bộ và cache dữ liệu server-side trên client.

Mặc dù hiện tại nghiệp vụ chưa quá lớn, việc đưa `ReactQueryProvider` vào layout gốc giúp hệ thống sẵn sàng mở rộng cho các màn hình có nhiều API, cần cache, refetch hoặc đồng bộ dữ liệu nền.

#### 2.4. Lớp tích hợp API và xác thực

Phần giao tiếp backend được tổ chức theo 2 mức:

- `src/services/api/*.ts`: định nghĩa API theo từng domain nghiệp vụ.
- `src/lib/api-client.ts`: cấu hình client dùng chung với interceptor.

Các điểm chính của kiến trúc tích hợp:

- dùng `axios` để chuẩn hóa request/response;
- tự động lấy session từ `next-auth` để gắn access token vào header `Authorization`;
- cache session ngắn hạn để giảm số lần gọi `/api/auth/session`;
- tự động xử lý `401 Unauthorized` bằng cách xóa session và chuyển hướng về trang đăng nhập;
- tách API public và API private để phù hợp với tài nguyên có/không yêu cầu xác thực.

Đối với đăng nhập, hệ thống dùng `CredentialsProvider` của `next-auth`, gọi backend `/api/auth/login`, nhận JWT và lưu token vào session để tái sử dụng ở toàn bộ request tiếp theo.

#### 2.5. Lớp đa ngôn ngữ và trải nghiệm dùng chung

Ứng dụng tích hợp `next-intl` để hỗ trợ đa ngôn ngữ theo route, hiện có:

- `vi`
- `en`

Phần layout gốc bọc bởi `NextIntlClientProvider`, cho phép component truy xuất text theo namespace. Đây là nền tảng phù hợp cho hệ thống quản lý có khả năng mở rộng cho nhiều nhóm người dùng và môi trường triển khai khác nhau.

Ngoài ra, hệ thống còn bổ sung:

- `next-nprogress-bar` để phản hồi trạng thái chuyển trang;
- `sonner` để hiển thị toast notification;
- theme switching để cải thiện trải nghiệm người dùng.

### 3. Công nghệ FE sử dụng

| Công nghệ | Vai trò trong hệ thống |
| --- | --- |
| `Next.js 14` | Framework FE chính, hỗ trợ App Router, SSR/CSR hybrid, tối ưu build và routing |
| `React 18` | Xây dựng component, quản lý UI theo mô hình khai báo |
| `TypeScript` | Tăng an toàn kiểu dữ liệu, giảm lỗi trong quá trình phát triển |
| `Tailwind CSS` | Xây dựng giao diện nhanh, responsive và dễ tùy biến |
| `PrimeReact` | Cung cấp bộ UI component sẵn có cho form và tương tác |
| `Axios` | Thực hiện HTTP request tới backend, hỗ trợ interceptor |
| `NextAuth` | Quản lý xác thực, session và tích hợp login theo provider |
| `TanStack React Query` | Quản lý dữ liệu bất đồng bộ, cache và đồng bộ trạng thái server |
| `next-intl` | Hỗ trợ đa ngôn ngữ theo locale |
| `sonner` | Thông báo trạng thái thao tác cho người dùng |
| `next-nprogress-bar` | Hiển thị tiến trình khi điều hướng trang |

### 4. Đánh giá kiến trúc FE hiện tại

Ưu điểm:

- kiến trúc tách lớp tương đối rõ giữa UI, routing, provider và service;
- phù hợp với bài toán hệ thống quản lý có xác thực và phân vùng màn hình;
- dễ mở rộng thêm module nghiệp vụ mới theo cấu trúc thư mục hiện có;
- đã có sẵn nền tảng cho i18n, session, cache dữ liệu và theme.

Hạn chế cần cải thiện:

- logic gọi API hiện còn phân tán giữa `services/api` và một số component, cần chuẩn hóa thêm;
- chưa có lớp quản lý state nghiệp vụ tập trung cho các luồng phức tạp;
- README ban đầu chưa phản ánh kiến trúc hệ thống, gây khó khăn khi onboarding;
- một số cấu hình và thông báo đang hard-code, nên tách về constants/config/i18n message.

### 5. Kết luận

Kiến trúc FE hiện tại của dự án phù hợp với định hướng xây dựng một hệ thống quản lý tài liệu có xác thực, đa ngôn ngữ và khả năng mở rộng theo module. Việc lựa chọn `Next.js + React + TypeScript + NextAuth + Axios + Tailwind CSS + PrimeReact` tạo ra một nền tảng tương đối hiện đại, đủ linh hoạt để tiếp tục phát triển các tính năng nghiệp vụ trong các giai đoạn tiếp theo.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```
