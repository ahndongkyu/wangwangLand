"use client"

export function KakaoChannelButton() {
  return (
    <a
      href="http://pf.kakao.com/_iTmxbX/chat"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="카카오 채널 문의하기"
      className="fixed bottom-20 left-4 z-30 flex items-center gap-1.5 rounded-full bg-[#FEE500] px-3.5 py-2.5 shadow-lg transition-transform hover:scale-105 active:scale-95 md:bottom-6 md:left-6"
    >
      {/* 카카오 말풍선 아이콘 */}
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M12 3C6.477 3 2 6.71 2 11.25c0 2.91 1.75 5.47 4.39 6.98l-.9 3.36a.4.4 0 0 0 .59.45l3.93-2.6A11.8 11.8 0 0 0 12 19.5c5.523 0 10-3.71 10-8.25S17.523 3 12 3Z"
          fill="#1A1A1A"
        />
      </svg>
      <span className="text-[13px] font-bold text-[#1A1A1A]">카카오 문의</span>
    </a>
  )
}
