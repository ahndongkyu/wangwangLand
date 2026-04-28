import { SITE } from "@/shared/constants/site"

/**
 * 개인정보 처리방침 본문 컴포넌트.
 * /privacy 페이지와 약관 동의 모달에서 공유 사용.
 */
export const PRIVACY_VERSION = "2026-04-27"

interface Props {
  embedded?: boolean
}

export function PrivacyContent({ embedded = false }: Props) {
  const reg = SITE.registration
  const contactEmail = SITE.contact.email || "운영진 이메일 미등록"
  const repPhone = SITE.contact.phones.find((p) => p.label === "대표")?.number || "대표 연락처 미등록"

  return (
    <div
      className={
        embedded
          ? "px-1"
          : "mx-auto w-full max-w-3xl px-4 py-12 md:px-6 md:py-16"
      }
    >
      {!embedded && (
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-foreground md:text-4xl">
            왕왕랜드 개인정보 처리방침
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            시행일: 2026년 4월 27일
          </p>
        </header>
      )}
      {embedded && (
        <p className="mb-4 text-xs text-muted-foreground">
          시행일: 2026년 4월 27일
        </p>
      )}

      <div className="space-y-8 text-sm leading-relaxed text-foreground/90 md:text-[15px]">
        {/* 서문 */}
        <section className="rounded-lg border border-border bg-card p-5">
          <p>
            왕왕랜드(이하 &quot;단체&quot;)는 「개인정보 보호법」 제30조에 따라 정보주체의
            개인정보를 보호하고 이와 관련한 고충을 신속하고 원활하게 처리할 수 있도록 하기
            위하여 다음과 같이 개인정보 처리방침을 수립·공개합니다.
          </p>
          <p className="mt-2">
            단체는 영종도 유기견 보호를 목적으로 활동하는 임의단체이며, 입양·임시보호·봉사·후원
            신청을 받기 위해 필요한 최소한의 개인정보만을 수집·이용합니다.
          </p>
        </section>

        <Article title="제1조 (개인정보의 처리 목적)">
          <p>
            단체는 다음의 목적을 위하여 개인정보를 처리합니다. 처리하고 있는 개인정보는 다음의
            목적 이외의 용도로는 이용되지 않으며, 이용 목적이 변경되는 경우에는 「개인정보
            보호법」 제18조에 따라 별도의 동의를 받는 등 필요한 조치를 이행할 예정입니다.
          </p>
          <Ol>
            <li><b>회원 관리:</b> 회원제 서비스 이용에 따른 본인 확인, 개인 식별, 회원자격 유지·관리, 서비스 부정이용 방지, 각종 고지·통지</li>
            <li><b>입양·임시보호 신청 처리:</b> 입양·임보 신청 접수, 자격 심사, 상담, 가정환경 확인, 계약 체결, 사후 모니터링</li>
            <li><b>봉사 신청 처리:</b> 봉사 신청 접수, 일정 조율, 활동 안내, 안전 관리, 출입 기록 관리</li>
            <li><b>후원 처리:</b> 후원 등록·확인, 입금 내역 대조, 후원 내역 안내, 후원자 공개 표시(동의 시), 향후 기부금영수증 발급(자격 취득 시)</li>
            <li><b>공지 및 활동 소식 전달:</b> 단체 활동 소식, 행사·이벤트 안내, 공지사항 전달</li>
          </Ol>
        </Article>

        <Article title="제2조 (처리하는 개인정보의 항목 및 보유·이용 기간)">
          <p>
            단체는 다음의 개인정보 항목을 처리하고 있습니다. 보유·이용 기간은 처리 목적 달성
            시까지를 원칙으로 하며, 관계 법령에 따른 보존 의무가 있는 경우 해당 법령에서 정한
            기간 동안 보관합니다.
          </p>

          <Subsection title="① 회원가입 (사이트 회원가입)">
            <Table
              rows={[
                ["필수", "이름, 이메일, 연락처, 비밀번호"],
                ["선택", "프로필 사진, 닉네임"],
                ["보유·이용 기간", "회원 탈퇴 시까지 (단, 회칙 제6조에 따라 강제 탈퇴된 회원의 정보는 동일인의 재가입 방지를 위해 탈퇴 후 1년간 보관)"],
              ]}
            />
          </Subsection>

          <Subsection title="② 입양·임시보호 신청">
            <Table
              rows={[
                ["필수", "이름, 연락처, 주소, 입양·임보 결심 이유"],
                ["선택", "가족 구성원 수, 어린이 유무, 주거 형태(아파트/주택 등), 소유 형태(자가/전세 등), 현재 다른 반려동물 정보, 과거 사육 경험"],
                ["수집 근거", "정보주체의 동의 (입양·임보 상담의 특성상 가족·주거환경 정보가 필요하나, 그 제공 여부와 범위는 정보주체가 결정)"],
                ["보유·이용 기간", "입양·임보 상담 종료 또는 입양·임보 완료 후 1년 (입양 후 사후 모니터링 및 동물 회수 사유 발생 시 대응을 위함)"],
              ]}
            />
          </Subsection>

          <Subsection title="③ 봉사 신청">
            <Table
              rows={[
                ["필수", "이름 또는 단체명, 연락처, 인원수"],
                ["선택", "가능한 요일·시간대, 희망 활동, 자기소개/메모"],
                ["단체 신청의 경우", "인솔자 정보(이름·연락처) 및 동행 인원수"],
                ["보유·이용 기간", "봉사 활동 종료 후 1년 (활동 이력 관리 및 사고 발생 시 대응을 위함)"],
              ]}
            />
          </Subsection>

          <Subsection title="④ 후원 등록 (현금·물품)">
            <Table
              rows={[
                ["필수", "이름, 이메일, 연락처(현금 후원 시), 후원 금액(현금) 또는 물품 정보"],
                ["선택", "표시명, 한 줄 메시지, 익명 표시 여부"],
                ["수집 근거", "정보주체의 동의"],
                ["보유·이용 기간", "후원 등록일로부터 5년 (단체의 회계 결산공개 및 향후 기부금영수증 발급 가능성 대응. 단, 회칙 제13조·제14조에 따른 회계 결산 공개를 위함)"],
              ]}
            />
          </Subsection>

          <Subsection title="⑤ 자동 수집 정보">
            <p className="mb-2">사이트 이용 과정에서 다음의 정보가 자동으로 생성·수집될 수 있습니다.</p>
            <Table
              rows={[
                ["자동 수집 항목", "접속 IP, 접속 일시, 서비스 이용 기록, 쿠키"],
                ["보유 기간", "3개월"],
              ]}
            />
          </Subsection>
        </Article>

        <Article title="제3조 (개인정보의 처리 및 보유 기간 결정 기준)">
          <p>
            단체는 정보주체로부터 개인정보를 수집할 때 동의받은 기간 또는 법령에 따른 보유·이용
            기간 내에서 개인정보를 처리·보유합니다. 보유 기간 결정 기준은 다음과 같습니다.
          </p>
          <Ol>
            <li><b>계약 이행 관련 정보</b> (입양·임보·봉사 신청 정보): 계약 종료 후 분쟁 대응 및 사후 모니터링에 필요한 합리적 기간</li>
            <li><b>회계 관련 정보</b> (후원 정보): 단체 회칙 제14조의 회계 결산 공개 의무 및 향후 기부금영수증 발급 가능성을 고려한 보존 기간</li>
            <li><b>회원 식별 정보:</b> 회원 자격 유지 기간 및 부정 재가입 방지에 필요한 최소 기간</li>
          </Ol>
        </Article>

        <Article title="제4조 (개인정보의 제3자 제공)">
          <p>
            단체는 정보주체의 개인정보를 제1조의 처리 목적 범위 내에서만 처리하며, 정보주체의
            동의, 법률의 특별한 규정 등 「개인정보 보호법」 제17조 및 제18조에 해당하는 경우에만
            개인정보를 제3자에게 제공합니다.
          </p>
          <p>
            현재 단체는 정보주체의 개인정보를 제3자에게 제공하지 않습니다. 향후 제3자 제공이
            필요한 경우 정보주체에게 별도로 안내하고 동의를 받겠습니다.
          </p>
        </Article>

        <Article title="제5조 (개인정보 처리의 위탁)">
          <p>
            단체는 원활한 개인정보 업무처리를 위하여 다음과 같이 개인정보 처리업무를 위탁할 수
            있습니다.
          </p>
          <Table
            head={["수탁자", "위탁 업무 내용"]}
            rows={[
              ["Vercel Inc.", "사이트 호스팅 및 배포 인프라"],
              ["Supabase Inc.", "회원 데이터베이스·인증·파일 저장"],
              ["Kakao", "카카오 로그인(OAuth) 인증"],
            ]}
          />
          <p>
            위탁 업무 내용이나 수탁자가 변경될 경우 지체 없이 본 처리방침을 통하여 공개합니다.
            위탁 계약 시에는 「개인정보 보호법」 제26조에 따라 위탁업무 수행 목적 외 개인정보
            처리 금지, 기술적·관리적 보호조치, 재위탁 제한, 수탁자에 대한 관리·감독, 손해배상 등
            책임에 관한 사항을 계약서 등에 명시하고, 수탁자가 개인정보를 안전하게 처리하는지
            감독합니다.
          </p>
        </Article>

        <Article title="제6조 (개인정보의 파기)">
          <Ol>
            <li>단체는 개인정보 보유 기간의 경과, 처리 목적 달성 등 개인정보가 불필요하게 되었을 때에는 지체 없이 해당 개인정보를 파기합니다.</li>
            <li>정보주체로부터 동의받은 개인정보 보유 기간이 경과하거나 처리 목적이 달성되었음에도 다른 법령에 따라 개인정보를 계속 보존하여야 하는 경우에는 해당 개인정보를 별도의 데이터베이스로 옮기거나 보관 장소를 달리하여 보존합니다.</li>
            <li>
              파기 절차 및 방법
              <Ol type="alpha">
                <li>파기 절차: 단체는 파기 사유가 발생한 개인정보를 선정하고, 단체의 개인정보 보호책임자의 승인을 받아 파기합니다.</li>
                <li>파기 기한: 보유 기간 경과 또는 처리 목적 달성 후 5일 이내</li>
                <li>
                  파기 방법:
                  <ul className="ml-5 list-disc space-y-0.5">
                    <li>전자적 파일: 복원 불가능한 방법으로 영구 삭제</li>
                    <li>종이 문서: 분쇄 또는 소각</li>
                  </ul>
                </li>
              </Ol>
            </li>
          </Ol>
        </Article>

        <Article title="제7조 (정보주체와 법정대리인의 권리·의무 및 행사방법)">
          <Ol>
            <li>
              정보주체는 단체에 대해 언제든지 다음 각 호의 권리를 행사할 수 있습니다.
              <Ol type="alpha">
                <li>개인정보 열람 요구</li>
                <li>개인정보 정정·삭제 요구 (단, 다른 법령에서 그 개인정보가 수집 대상으로 명시되어 있는 경우에는 삭제를 요구할 수 없음)</li>
                <li>개인정보 처리정지 요구</li>
                <li>개인정보 처리에 관한 동의 철회</li>
              </Ol>
            </li>
            <li>
              권리 행사 방법: 위 권리는 다음의 방법으로 행사할 수 있으며, 단체는 이에 대해 지체 없이 (10일 이내) 조치하겠습니다.
              <ul className="ml-5 list-disc space-y-0.5">
                <li>이메일: <span className="text-foreground">{contactEmail}</span></li>
                <li>전화: <span className="text-foreground">{repPhone}</span></li>
                <li>서면: 단체 주소({SITE.contact.address})로 발송</li>
                <li>사이트 마이페이지의 회원정보 수정 메뉴</li>
              </ul>
            </li>
            <li>법정대리인 또는 위임받은 자의 권리 행사: 정보주체의 법정대리인이나 위임받은 자가 권리를 대리 행사할 경우, 「개인정보 보호법 시행규칙」 별지 제11호 서식에 따른 위임장을 제출하여야 합니다.</li>
            <li>단체는 정보주체의 권리 행사 요구에 대하여 정보주체 본인 또는 정당한 대리인인지를 확인합니다.</li>
            <li>개인정보 처리정지 요구에도 불구하고 「개인정보 보호법」 제37조 제2항에 따라 처리가 거부될 수 있으며, 이 경우 그 사유를 정보주체에게 알립니다.</li>
          </Ol>
        </Article>

        <Article title="제8조 (개인정보의 안전성 확보 조치)">
          <p>단체는 개인정보의 안전성 확보를 위하여 다음과 같은 조치를 취하고 있습니다.</p>
          <Ol>
            <li><b>관리적 조치:</b> 개인정보 취급자(운영진)의 최소화, 정기적 자체 점검, 내부관리계획 수립·시행</li>
            <li>
              <b>기술적 조치:</b>
              <Ol type="alpha">
                <li>개인정보 처리시스템 등의 접근 권한 관리</li>
                <li>접근 통제 시스템 설치</li>
                <li>비밀번호의 암호화</li>
                <li>보안 프로그램 설치 (백신 등)</li>
              </Ol>
            </li>
            <li><b>물리적 조치:</b> 개인정보가 저장된 자료에 대한 잠금 장치 설치, 출입 통제</li>
          </Ol>
          <p>
            단체는 임의단체로서 자원이 제한되는 점을 고려하여, 합리적으로 가능한 범위 내에서 위
            조치를 시행하며 지속적으로 개선해 나갑니다.
          </p>
        </Article>

        <Article title="제9조 (개인정보 자동 수집 장치의 설치·운영 및 거부에 관한 사항)">
          <Ol>
            <li>단체는 이용자에게 개별적인 맞춤 서비스를 제공하기 위해 이용 정보를 저장하고 수시로 불러오는 &apos;쿠키(cookie)&apos;를 사용할 수 있습니다.</li>
            <li>쿠키의 사용 목적: 사이트 방문 및 이용 형태, 인기 검색어, 보안 접속 여부 등을 파악하여 이용자에게 최적화된 정보 제공을 위해 사용</li>
            <li>쿠키 설치·운영 및 거부: 이용자는 웹브라우저 상단의 도구 → 인터넷 옵션 → 개인정보 메뉴의 옵션 설정을 통해 쿠키 저장을 거부할 수 있습니다.</li>
            <li>쿠키 저장을 거부할 경우 일부 서비스 이용에 어려움이 발생할 수 있습니다.</li>
          </Ol>
        </Article>

        <Article title="제10조 (자동화된 결정에 관한 사항)">
          <p>
            단체는 정보주체의 권리·의무에 중대한 영향을 미치는 자동화된 결정(완전히 자동화된
            시스템에 의한 결정)을 수행하지 않습니다. 입양·임보 신청에 대한 심사는 운영진의
            사람에 의한 검토와 상담을 통해 이루어집니다.
          </p>
        </Article>

        <Article title="제11조 (만 14세 미만 아동의 개인정보 처리)">
          <Ol>
            <li>단체는 원칙적으로 만 14세 미만 아동의 개인정보를 별도로 수집하지 않습니다.</li>
            <li>다만 학교 동아리 등 단체 봉사 신청 시 인원에 만 14세 미만 아동이 포함될 수 있으며, 이 경우 인솔자(법정대리인 또는 학교·기관 담당자)의 책임하에 이루어지는 것으로 봅니다.</li>
            <li>만 14세 미만 아동이 직접 회원가입·입양 신청 등을 하고자 하는 경우, 법정대리인의 동의 절차를 거쳐야 하며 그 동의 사실을 단체가 확인할 수 있는 방법(법정대리인 명의 휴대전화 인증, 서면 동의서 등)으로 동의를 받습니다.</li>
          </Ol>
        </Article>

        <Article title="제12조 (개인정보 보호책임자 및 고충처리 부서)">
          <p>
            단체는 개인정보 처리에 관한 업무를 총괄해서 책임지고, 개인정보 처리와 관련한
            정보주체의 불만 처리 및 피해 구제 등을 위하여 아래와 같이 개인정보 보호책임자를
            지정하고 있습니다.
          </p>
          <Table
            head={["구분", "내용"]}
            rows={[
              [
                "개인정보 보호책임자",
                <>
                  성명: {reg.representativeName || "○○○"}
                  <br />
                  직책: 대표
                  <br />
                  연락처: {repPhone}
                  <br />
                  이메일: {contactEmail}
                </>,
              ],
              [
                "고충처리 담당 부서",
                <>
                  부서: 왕왕랜드 운영진
                  <br />
                  연락처: {repPhone}
                  <br />
                  이메일: {contactEmail}
                </>,
              ],
            ]}
          />
          <p>
            정보주체는 단체의 서비스를 이용하면서 발생한 모든 개인정보 보호 관련 문의, 불만
            처리, 피해 구제 등에 관한 사항을 위 연락처로 문의하실 수 있습니다. 단체는 정보주체의
            문의에 대해 지체 없이 답변 및 처리해드릴 것입니다.
          </p>
        </Article>

        <Article title="제13조 (권익침해 구제 방법)">
          <p>
            정보주체는 개인정보 침해로 인한 구제를 받기 위하여 아래의 기관에 분쟁 해결이나
            상담 등을 신청할 수 있습니다. 아래의 기관은 단체와는 별개의 기관으로서, 단체의
            자체적인 개인정보 불만 처리, 피해 구제 결과에 만족하지 못하시거나 보다 자세한 도움이
            필요하시면 문의하여 주시기 바랍니다.
          </p>
          <Table
            head={["기관", "연락처", "홈페이지"]}
            rows={[
              [
                "개인정보 침해신고센터 (한국인터넷진흥원 운영)",
                "(국번없이) 118",
                <a key="1" href="https://privacy.kisa.or.kr" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">privacy.kisa.or.kr</a>,
              ],
              [
                "개인정보 분쟁조정위원회",
                "1833-6972",
                <a key="2" href="https://www.kopico.go.kr" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">www.kopico.go.kr</a>,
              ],
              [
                "대검찰청 사이버수사과",
                "(국번없이) 1301",
                <a key="3" href="https://spo.go.kr" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">spo.go.kr</a>,
              ],
              [
                "경찰청 사이버수사국",
                "(국번없이) 182",
                <a key="4" href="https://ecrm.cyber.go.kr" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">ecrm.cyber.go.kr</a>,
              ],
            ]}
          />
        </Article>

        <Article title="제14조 (개인정보 처리방침의 변경)">
          <Ol>
            <li>본 개인정보 처리방침은 시행일로부터 적용됩니다.</li>
            <li>법령 및 방침에 따른 변경 내용의 추가, 삭제 및 정정이 있는 경우에는 변경 사항의 시행 7일 전부터 사이트 공지사항을 통하여 고지합니다. 다만 정보주체의 권리에 중요한 변경이 있는 경우에는 30일 전부터 고지합니다.</li>
            <li>이전의 개인정보 처리방침은 사이트에서 확인하실 수 있습니다.</li>
          </Ol>
        </Article>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-foreground md:text-2xl">부칙</h2>
          <p>본 개인정보 처리방침은 2026년 4월 27일부터 적용됩니다.</p>
          <Table
            head={["버전", "시행일", "주요 변경사항"]}
            rows={[["v1.0", "2026-04-27", "최초 제정"]]}
          />
        </section>

        <section className="rounded-lg border border-border bg-card p-5 text-xs leading-relaxed text-muted-foreground">
          <p className="font-semibold text-foreground">왕왕랜드 (영종도 유기견 보호소)</p>
          <p className="mt-1">주소: {SITE.contact.address}</p>
          <p>대표 연락처: {repPhone}</p>
          <p>이메일: {contactEmail}</p>
          {reg.businessNumber && <p>사업자등록번호: {reg.businessNumber}</p>}
          <p>
            공식 카페: <a href={SITE.sns.naverCafe} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{SITE.sns.naverCafe}</a>
          </p>
        </section>
      </div>
    </div>
  )
}

function Article({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <article className="space-y-3">
      <h2 className="border-b border-border pb-2 text-lg font-bold text-foreground md:text-xl">
        {title}
      </h2>
      <div className="space-y-2 pl-1">{children}</div>
    </article>
  )
}

function Subsection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2 rounded-md border border-border/60 bg-card/50 p-4">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {children}
    </section>
  )
}

function Ol({ children, type }: { children: React.ReactNode; type?: "alpha" }) {
  const cls =
    type === "alpha"
      ? "ml-5 list-[lower-alpha] space-y-1"
      : "ml-5 list-decimal space-y-1.5"
  return <ol className={cls}>{children}</ol>
}

function Table({
  head,
  rows,
}: {
  head?: React.ReactNode[]
  rows: Array<[React.ReactNode, ...React.ReactNode[]]>
}) {
  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <table className="w-full text-sm">
        {head && (
          <thead className="bg-secondary/40 text-xs font-semibold text-muted-foreground">
            <tr>
              {head.map((h, i) => (
                <th key={i} className="px-3 py-2 text-left">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody className="divide-y divide-border">
          {rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td
                  key={j}
                  className={`px-3 py-2 align-top ${
                    j === 0 && row.length > 1
                      ? "w-32 shrink-0 bg-secondary/20 text-xs font-medium text-muted-foreground md:w-40"
                      : "text-foreground/90"
                  }`}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
