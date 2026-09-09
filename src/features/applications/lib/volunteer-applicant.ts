const EMPTY_GROUP_NAMES = new Set(["x", "없음"])
const LEGACY_GROUP_SEPARATOR = " / "

/** 빈값·X·없음은 단체명이 없는 신청으로 통일한다. */
export function normalizeVolunteerGroupName(
  value: string | null | undefined
): string | null {
  const trimmed = value?.trim() ?? ""
  if (!trimmed || EMPTY_GROUP_NAMES.has(trimmed.toLocaleLowerCase("ko-KR"))) {
    return null
  }
  return trimmed
}

/** 운영진 화면·알림에서 단체명이 있을 때만 함께 표시한다. */
export function formatVolunteerApplicantName(
  applicantName: string,
  groupName?: string | null
): string {
  const normalizedGroupName = normalizeVolunteerGroupName(groupName)
  return normalizedGroupName
    ? `${normalizedGroupName}${LEGACY_GROUP_SEPARATOR}${applicantName}`
    : applicantName
}

/** 마이그레이션 전 `단체명 / 인솔자명` 형식 데이터도 수정 폼에서 읽는다. */
export function getVolunteerApplicantParts(
  applicantName: string,
  groupName?: string | null
): { applicantName: string; groupName: string | null } {
  const normalizedGroupName = normalizeVolunteerGroupName(groupName)
  if (normalizedGroupName) {
    return { applicantName, groupName: normalizedGroupName }
  }

  const separatorIndex = applicantName.indexOf(LEGACY_GROUP_SEPARATOR)
  if (separatorIndex < 0) {
    return { applicantName, groupName: null }
  }

  return {
    groupName: normalizeVolunteerGroupName(
      applicantName.slice(0, separatorIndex)
    ),
    applicantName: applicantName
      .slice(separatorIndex + LEGACY_GROUP_SEPARATOR.length)
      .trim(),
  }
}
