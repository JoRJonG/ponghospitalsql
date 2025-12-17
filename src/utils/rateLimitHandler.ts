/**
 * Utility สำหรับจัดการ API Rate Limit Errors
 * ใช้ร่วมกับ fetch หรือ axios เพื่อ redirect ไปหน้า Rate Limit Error อัตโนมัติ
 */

/**
 * ตรวจสอบว่า response เป็น Rate Limit Error หรือไม่
 * @param status - HTTP status code
 * @returns true ถ้าเป็น rate limit error (429)
 */
export const isRateLimitError = (status: number): boolean => {
    return status === 429;
};

/**
 * Redirect ไปหน้า Rate Limit Error
 */
export const redirectToRateLimitPage = (): void => {
    window.location.href = '/rate-limit';
};

/**
 * Handle API error และ redirect ถ้าเป็น rate limit
 * @param error - Error object จาก API call
 */
export const handleApiError = (error: { response?: { status: number }; status?: number }): void => {
    // ตรวจสอบว่าเป็น rate limit error หรือไม่
    if (error.response?.status === 429 || error.status === 429) {
        redirectToRateLimitPage();
    }

    // ถ้าไม่ใช่ rate limit error ให้ throw error ต่อไป
    throw error;
};

/**
 * Wrapper สำหรับ fetch ที่จัดการ rate limit อัตโนมัติ
 * @param url - URL ที่ต้องการเรียก
 * @param options - Fetch options
 * @returns Promise<Response>
 */
export const fetchWithRateLimitHandler = async (
    url: string,
    options?: RequestInit
): Promise<Response> => {
    const response = await fetch(url, options);

    // ตรวจสอบ rate limit
    if (isRateLimitError(response.status)) {
        redirectToRateLimitPage();
        throw new Error('Too Many Requests');
    }

    return response;
};

/**
 * ตัวอย่างการใช้งานกับ axios interceptor
 * เพิ่มโค้ดนี้ใน axios configuration file
 */
export const setupAxiosRateLimitInterceptor = (axiosInstance: {
    interceptors: {
        response: {
            use: (onFulfilled: (response: unknown) => unknown, onRejected: (error: unknown) => Promise<never>) => void;
        };
    };
}) => {
    axiosInstance.interceptors.response.use(
        (response: unknown) => response,
        (error: unknown) => {
            // Type guard สำหรับตรวจสอบ error structure
            if (
                error &&
                typeof error === 'object' &&
                'response' in error &&
                error.response &&
                typeof error.response === 'object' &&
                'status' in error.response &&
                error.response.status === 429
            ) {
                redirectToRateLimitPage();
            }
            return Promise.reject(error);
        }
    );
};

/**
 * ตัวอย่างการใช้งานกับ SWR
 * @param error - Error จาก SWR
 */
export const handleSWRError = (error: { status?: number }) => {
    if (error?.status === 429) {
        redirectToRateLimitPage();
    }
};
