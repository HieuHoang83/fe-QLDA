import { toast } from "sonner";

import {
  JobAccepted,
  JobStatus,
  getJobStatus,
  parseJobResult,
} from "./orders";

const POLL_INTERVAL_MS = 2000;
const MAX_POLLS = 60;

export interface WatchJobOptions {
  /** Nội dung toast khi vừa gửi yêu cầu, trước khi Haravan trả lời. */
  pendingMessage?: string;
  /** Toast khi Haravan đã xử lý xong. */
  successMessage?: string;
  /** Chạy lại khi công việc kết thúc (đã thành công hoặc thất bại). */
  onSettled?: (job: JobStatus) => void;
  /** Bỏ qua toast mặc định, dùng khi component tự hiển thị. */
  silent?: boolean;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Theo dõi một công việc đã đẩy lên Haravan.
 *
 * Mỗi thao tác trên FE chỉ nhận `jobId`; job đó có thể còn `pending` vì hàng đợi
 * đang giới hạn số request song song gửi lên Haravan. Hàm này poll trạng thái
 * cho tới khi công việc kết thúc rồi báo kết quả cho người dùng.
 */
export async function watchJob(
  token: string,
  orgId: number | string,
  accepted: JobAccepted,
  options: WatchJobOptions = {}
): Promise<JobStatus | null> {
  if (!accepted?.jobId) return null;

  if (!options.silent) {
    toast.loading(options.pendingMessage ?? "Đang gửi yêu cầu lên Haravan…", {
      id: accepted.jobId,
    });
  }

  for (let attempt = 0; attempt < MAX_POLLS; attempt += 1) {
    await sleep(POLL_INTERVAL_MS);

    let job: JobStatus;
    try {
      job = await getJobStatus(token, orgId, accepted.jobId);
    } catch {
      // Mạng chập chờn thì thử lần sau, đừng báo lỗi ngay.
      continue;
    }

    if (job.status !== "completed" && job.status !== "failed") continue;

    const result = parseJobResult(job);
    if (!options.silent) {
      toast.dismiss(accepted.jobId);
      if (job.status === "completed") {
        toast.success(options.successMessage ?? result.message ?? "Haravan đã xử lý xong.", {
          id: accepted.jobId,
        });
      } else {
        toast.error(job.error ?? "Haravan không xử lý được yêu cầu.", {
          id: accepted.jobId,
        });
      }
    }

    options.onSettled?.(job);
    return job;
  }

  if (!options.silent) {
    toast.dismiss(accepted.jobId);
    toast.warning("Haravan phản hồi quá lâu. Bạn có thể tải lại trang để kiểm tra kết quả.", {
      id: accepted.jobId,
    });
  }
  return null;
}
