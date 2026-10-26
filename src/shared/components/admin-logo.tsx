import Image from "next/image"
import styles from "./admin-logo.module.css"

export function AdminLogo() {
  return <span role="img" aria-label="왕왕랜드 관리자" className={styles.logo}>
    <Image src="/images/wangwang-logo-admin.png" alt="" aria-hidden width={2172} height={724} sizes="(min-width: 768px) 324px, 224px" className={styles.art} />
    <span aria-hidden className={`${styles.wordmark} hidden dark:block`} />
  </span>
}
