export const LOGIN_RETURN_COOKIE = "login_return_to"

/** 로그인 복귀는 명시적으로 허용한 내부 화면으로만 이동한다. */
export function loginReturnPath(value: unknown): string {
  return value === "/my/applications" ? value : "/"
}
